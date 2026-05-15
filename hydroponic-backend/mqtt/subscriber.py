import logging
import json
import time
from datetime import datetime, timezone
from typing import Optional

from paho.mqtt.client import CallbackAPIVersion, Client

from core.config import get_settings
from services.crypto import ProtectedPayloadError, get_crypto_service
from services.device_config import get_device_config_service
from services.firestore import get_firestore_service
from services.influx import get_influx_service

logger = logging.getLogger(__name__)
MIN_ACCEPTABLE_TELEMETRY_TIME = datetime(2024, 1, 1, tzinfo=timezone.utc)
TOPIC_NAMESPACES = {"telemetry", "provisioning", "status"}


class MQTTSubscriber:
    def __init__(self):
        settings = get_settings()
        self._topic_prefix = settings.mqtt_topic_prefix.strip("/")
        self._topic_prefix_parts = self._topic_prefix.split("/")
        self._config_cache_ttl_seconds = settings.mqtt_config_cache_ttl_seconds
        self._config_publish_cache: dict[str, dict[str, float | str]] = {}
        self._allow_legacy_sequence_replay = (
            settings.mqtt_allow_legacy_sequence_replay
        )
        self._client = Client(
            callback_api_version=CallbackAPIVersion.VERSION2,
            client_id=f"hydroponic-backend-{self._topic_prefix.replace('/', '-')}",
        )
        self._client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._connected = False

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            logger.info("Connected to MQTT broker")
            self._connected = True
            telemetry_topic = f"{self._topic_prefix}/telemetry/#"
            provisioning_topic = f"{self._topic_prefix}/provisioning/#"
            status_topic = f"{self._topic_prefix}/status/#"
            client.subscribe(telemetry_topic)
            client.subscribe(provisioning_topic)
            client.subscribe(status_topic)
            logger.info(
                "Subscribed to MQTT topics: %s, %s, %s",
                telemetry_topic,
                provisioning_topic,
                status_topic,
            )
        else:
            logger.error(f"MQTT connection failed with code {reason_code}")

    def _handle_provisioning(self, device_id: str, payload: dict) -> None:
        claim_code = payload.get("claim_code")
        if not claim_code:
            logger.warning("Provisioning payload missing claim_code for %s", device_id)
            return

        firestore = get_firestore_service()
        firestore.upsert_device_registration(device_id, payload)
        firestore.create_or_refresh_claim(device_id, claim_code)
        logger.info("Provisioned device %s with claim code %s", device_id, claim_code)

    def _handle_status(self, device_id: str, payload: dict) -> None:
        firestore = get_firestore_service()
        firestore.update_device_status(device_id, payload)
        logger.info("Updated status for device %s: %s", device_id, payload)

    def _parse_timestamp(self, raw_timestamp) -> datetime:
        def normalize(candidate: datetime) -> datetime:
            if candidate.tzinfo is None:
                candidate = candidate.replace(tzinfo=timezone.utc)
            if candidate < MIN_ACCEPTABLE_TELEMETRY_TIME:
                logger.warning(
                    "Received stale/invalid telemetry timestamp %s, using server time instead",
                    candidate.isoformat(),
                )
                return datetime.now(timezone.utc)
            return candidate

        if raw_timestamp is None:
            return datetime.now(timezone.utc)

        if isinstance(raw_timestamp, (int, float)):
            return normalize(datetime.fromtimestamp(raw_timestamp, timezone.utc))

        if isinstance(raw_timestamp, str):
            normalized = raw_timestamp.strip()
            if normalized.isdigit():
                return normalize(datetime.fromtimestamp(int(normalized), timezone.utc))
            return normalize(datetime.fromisoformat(normalized.replace("Z", "+00:00")))

        return datetime.now(timezone.utc)

    def _handle_telemetry(self, device_id: str, payload: dict) -> None:
        timestamp = self._parse_timestamp(payload.get("timestamp"))

        telemetry_data = {
            "ec": payload.get("ec"),
            "air_temp": payload.get("air_temp"),
            "humidity": payload.get("humidity"),
            "water_level": payload.get("water_level"),
            "water_temp": payload.get("water_temp"),
            "light": payload.get("light"),
        }
        sensor_health = {
            "sensor_ok": payload.get("sensor_ok", True),
            "sensor_error_count": payload.get("sensor_error_count", 0),
            "failed_sensors": payload.get("failed_sensors", []),
            "aht_ok": payload.get("aht_ok", True),
            "ds18b20_ok": payload.get("ds18b20_ok", True),
            "tds_ok": payload.get("tds_ok", True),
            "water_level_ok": payload.get("water_level_ok", True),
            "light_ok": payload.get("light_ok", True),
        }
        alarm_state = {
            "alarm_active": bool(payload.get("alarm_active", False)),
            "alarm_reasons": payload.get("alarm_reasons", []),
        }
        if not isinstance(alarm_state["alarm_reasons"], list):
            alarm_state["alarm_reasons"] = []

        logger.info("Accepted telemetry for device %s: %s", device_id, telemetry_data)
        if not sensor_health["sensor_ok"]:
            logger.warning(
                "Telemetry for device %s contains sensor failures: %s",
                device_id,
                sensor_health["failed_sensors"],
            )
        if alarm_state["alarm_active"]:
            logger.warning(
                "Telemetry for device %s reports active alarm: %s",
                device_id,
                alarm_state["alarm_reasons"],
            )

        influx = get_influx_service()
        influx.write_telemetry(device_id, telemetry_data, timestamp)

        firestore = get_firestore_service()
        firestore.update_device_status(
            device_id,
            {
                "last_telemetry_at": timestamp.isoformat(),
                "telemetry_schema": "v3",
                "online": True,
                **sensor_health,
                **alarm_state,
            },
        )

        logger.info("Stored telemetry for device %s", device_id)

    def _publish_config_if_needed(self, client, device_id: str) -> None:
        now = time.monotonic()
        cached = self._config_publish_cache.get(device_id)
        if cached and now - float(cached["published_at"]) < self._config_cache_ttl_seconds:
            return

        payload = get_device_config_service().build_config_payload(device_id)
        signature = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        if cached and cached.get("signature") == signature:
            cached["published_at"] = now
            return

        protected_payload = get_crypto_service().encrypt_message(
            namespace="config",
            device_id=device_id,
            payload=payload,
        )
        topic = f"{self._topic_prefix}/config/{device_id}"
        result = client.publish(topic, protected_payload, qos=1, retain=True)
        publish_rc = getattr(result, "rc", 0)
        if not isinstance(publish_rc, int):
            publish_rc = 0
        if publish_rc == 0:
            self._config_publish_cache[device_id] = {
                "published_at": now,
                "signature": signature,
            }
            logger.info("Published retained config for device %s to %s", device_id, topic)
        else:
            logger.warning("Failed to publish retained config for device %s", device_id)

    def _decode_and_verify(
        self,
        namespace: str,
        device_id: str,
        raw_payload: str,
        *,
        retained: bool = False,
    ) -> dict | None:
        crypto = get_crypto_service()
        firestore = get_firestore_service()

        try:
            protected = crypto.decrypt_message(
                namespace=namespace,
                device_id=device_id,
                raw_payload=raw_payload,
            )
        except ProtectedPayloadError as exc:
            logger.warning(
                "Rejected %s payload for %s: %s", namespace, device_id, exc
            )
            return None

        if namespace != "provisioning" and not firestore.device_exists(device_id):
            logger.warning(
                "Rejected %s payload for unknown device %s", namespace, device_id
            )
            return None

        if not firestore.accept_message_sequence(
            device_id, namespace, protected.sequence
        ):
            if retained:
                logger.info(
                    "Ignoring retained replayed %s payload for %s with sequence %s",
                    namespace,
                    device_id,
                    protected.sequence,
                )
                return None
            if self._allow_legacy_sequence_replay and namespace in {
                "telemetry",
                "status",
            }:
                logger.warning(
                    "Accepted legacy replayed %s payload for %s with sequence %s because MQTT_ALLOW_LEGACY_SEQUENCE_REPLAY is enabled",
                    namespace,
                    device_id,
                    protected.sequence,
                )
                return protected.payload
            logger.warning(
                "Rejected replayed %s payload for %s with sequence %s",
                namespace,
                device_id,
                protected.sequence,
            )
            return None

        return protected.payload

    def _on_message(self, client, userdata, msg):
        try:
            retained = bool(getattr(msg, "retain", False))
            logger.info("Received MQTT message topic=%s retained=%s", msg.topic, retained)

            topic_parts = msg.topic.split("/")
            if len(topic_parts) < len(self._topic_prefix_parts) + 2:
                logger.warning("Unexpected topic format: %s", msg.topic)
                return

            topic_prefix = topic_parts[: len(self._topic_prefix_parts)]
            if topic_prefix != self._topic_prefix_parts:
                logger.warning("Unexpected topic prefix: %s", msg.topic)
                return

            namespace_index = len(self._topic_prefix_parts)
            namespace = topic_parts[namespace_index]
            device_id = topic_parts[namespace_index + 1]
            if namespace not in TOPIC_NAMESPACES:
                logger.warning("Unexpected topic namespace: %s", msg.topic)
                return
            if retained:
                logger.info(
                    "Ignoring retained %s message for %s",
                    namespace,
                    device_id,
                )
                return

            raw_payload = msg.payload.decode()
            payload = self._decode_and_verify(
                namespace,
                device_id,
                raw_payload,
                retained=retained,
            )
            if payload is None:
                return

            if namespace == "telemetry":
                self._handle_telemetry(device_id, payload)
            elif namespace == "provisioning":
                self._handle_provisioning(device_id, payload)
            elif namespace == "status":
                self._handle_status(device_id, payload)
            self._publish_config_if_needed(client, device_id)

        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def start(self):
        settings = get_settings()
        logger.info(f"Connecting to MQTT broker at {settings.mqtt_ip}")
        self._client.connect(settings.mqtt_ip, settings.mqtt_port, 60)
        self._client.loop_start()

    def stop(self):
        if self._connected:
            self._client.loop_stop()
            self._client.disconnect()
            self._connected = False


mqtt_subscriber: Optional[MQTTSubscriber] = None


def get_mqtt_subscriber() -> MQTTSubscriber:
    global mqtt_subscriber
    if mqtt_subscriber is None:
        mqtt_subscriber = MQTTSubscriber()
    return mqtt_subscriber
