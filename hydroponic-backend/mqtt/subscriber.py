import json
import logging
from datetime import datetime, timezone
from typing import Optional

from paho.mqtt.client import CallbackAPIVersion, Client

from core.config import get_settings
from services.influx import get_influx_service

logger = logging.getLogger(__name__)


class MQTTSubscriber:
    def __init__(self):
        settings = get_settings()
        self._client = Client(
            callback_api_version=CallbackAPIVersion.VERSION2,
            client_id="hydroponic-backend",
        )
        self._client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._connected = False

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            logger.info("Connected to MQTT broker")
            self._connected = True
            client.subscribe("telemetry/#")
        else:
            logger.error(f"MQTT connection failed with code {rc}")

    def _on_message(self, client, userdata, msg):
        try:
            topic_parts = msg.topic.split("/")
            if len(topic_parts) < 2 or topic_parts[0] != "telemetry":
                logger.warning(f"Unexpected topic format: {msg.topic}")
                return

            device_id = topic_parts[1]
            payload = json.loads(msg.payload.decode())

            timestamp = datetime.now(timezone.utc)
            if "timestamp" in payload:
                timestamp = datetime.fromisoformat(
                    payload["timestamp"].replace("Z", "+00:00")
                )

            telemetry_data = {
                "ec": payload.get("ec"),
                "air_temp": payload.get("air_temp"),
                "humidity": payload.get("humidity"),
                "water_level": payload.get("water_level"),
                "water_temp": payload.get("water_temp"),
                "light": payload.get("light"),
            }

            influx = get_influx_service()
            influx.write_telemetry(device_id, telemetry_data, timestamp)
            logger.info(f"Stored telemetry for device {device_id}")

        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def start(self):
        settings = get_settings()
        logger.info(f"Connecting to MQTT broker at {settings.mqtt_ip}")
        self._client.connect(settings.mqtt_ip, 1883, 60)
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
