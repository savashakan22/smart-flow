import pytest
from unittest.mock import MagicMock, patch


class TestMQTTSubscriber:
    @pytest.fixture
    def mock_settings(self):
        settings = MagicMock()
        settings.mqtt_ip = "192.168.1.100"
        settings.mqtt_port = 1883
        settings.mqtt_username = "mqtt_user"
        settings.mqtt_password = "mqtt_pass"
        settings.mqtt_crypto_master_key_hex = (
            "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
        )
        settings.mqtt_topic_prefix = "group3"
        settings.mqtt_allow_legacy_sequence_replay = False
        return settings

    @pytest.fixture
    def mock_influx(self):
        return MagicMock()

    def test_on_connect_success(self, mock_settings):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()

            callback = mock_client.on_connect
            callback(mock_client, None, None, 0, None)

            assert subscriber._connected is True
            mock_client.subscribe.assert_any_call("group3/telemetry/#")
            mock_client.subscribe.assert_any_call("group3/provisioning/#")
            mock_client.subscribe.assert_any_call("group3/status/#")

    def test_on_connect_failure(self, mock_settings):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()

            callback = mock_client.on_connect
            callback(mock_client, None, None, 1, None)

            assert subscriber._connected is False

    def test_on_message_valid_payload(self, mock_settings, mock_influx):
        mock_firestore = MagicMock()
        mock_firestore.device_exists.return_value = True
        mock_firestore.accept_message_sequence.return_value = True
        mock_crypto = MagicMock()
        mock_crypto.decrypt_message.return_value = MagicMock(
            sequence=123,
            payload={
                "ec": 1.5,
                "air_temp": 22.0,
                "humidity": 65.0,
                "water_level": 80.0,
                "water_temp": 20.0,
                "light": 500.0,
                "timestamp": "2026-04-18T10:00:00Z",
                "sensor_ok": False,
                "sensor_error_count": 1,
                "failed_sensors": ["ds18b20"],
                "aht_ok": True,
                "ds18b20_ok": False,
                "tds_ok": True,
                "water_level_ok": True,
                "light_ok": True,
            },
        )

        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
            patch("mqtt.subscriber.get_influx_service", return_value=mock_influx),
            patch("mqtt.subscriber.get_firestore_service", return_value=mock_firestore),
            patch("mqtt.subscriber.get_alert_service") as mock_alert_service,
            patch("mqtt.subscriber.get_crypto_service", return_value=mock_crypto),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client
            mock_alert_service.return_value.evaluate_readings.return_value = []

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()
            msg = MagicMock()
            msg.topic = "group3/telemetry/esp32_001"
            msg.retain = False
            msg.payload.decode.return_value = '{"protected": true}'

            callback = mock_client.on_message
            callback(mock_client, None, msg)

            mock_influx.write_telemetry.assert_called_once()
            call_args = mock_influx.write_telemetry.call_args
            assert call_args[0][0] == "esp32_001"
            assert call_args[0][1]["ec"] == 1.5
            status_payload = mock_firestore.update_device_status.call_args[0][1]
            assert status_payload["telemetry_schema"] == "v3"
            assert status_payload["sensor_ok"] is False
            assert status_payload["failed_sensors"] == ["ds18b20"]

    def test_on_message_invalid_topic(self, mock_settings, mock_influx):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
            patch("mqtt.subscriber.get_influx_service", return_value=mock_influx),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()

            msg = MagicMock()
            msg.topic = "invalid/topic"
            msg.retain = False
            msg.payload.decode.return_value = '{"protected": true}'

            callback = mock_client.on_message
            callback(mock_client, None, msg)

            mock_influx.write_telemetry.assert_not_called()

    def test_dev_topic_prefix_isolated_from_prod_topics(self, mock_settings, mock_influx):
        mock_settings.mqtt_topic_prefix = "group3/dev"
        mock_firestore = MagicMock()
        mock_firestore.device_exists.return_value = True
        mock_firestore.accept_message_sequence.return_value = True
        mock_crypto = MagicMock()
        mock_crypto.decrypt_message.return_value = MagicMock(
            sequence=124,
            payload={
                "ec": 1.5,
                "air_temp": 22.0,
                "humidity": 65.0,
                "water_level": 80.0,
                "water_temp": 20.0,
                "light": 500.0,
                "timestamp": "2026-04-18T10:00:00Z",
            },
        )

        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
            patch("mqtt.subscriber.get_influx_service", return_value=mock_influx),
            patch("mqtt.subscriber.get_firestore_service", return_value=mock_firestore),
            patch("mqtt.subscriber.get_alert_service") as mock_alert_service,
            patch("mqtt.subscriber.get_crypto_service", return_value=mock_crypto),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client
            mock_alert_service.return_value.evaluate_readings.return_value = []

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()
            callback = mock_client.on_message

            prod_msg = MagicMock()
            prod_msg.topic = "group3/telemetry/esp32_001"
            prod_msg.retain = False
            prod_msg.payload.decode.return_value = '{"protected": true}'
            callback(mock_client, None, prod_msg)
            mock_influx.write_telemetry.assert_not_called()

            dev_msg = MagicMock()
            dev_msg.topic = "group3/dev/telemetry/esp32_001"
            dev_msg.retain = False
            dev_msg.payload.decode.return_value = '{"protected": true}'
            callback(mock_client, None, dev_msg)
            mock_influx.write_telemetry.assert_called_once()

    def test_on_message_provisioning_payload(self, mock_settings):
        mock_firestore = MagicMock()
        mock_firestore.accept_message_sequence.return_value = True
        mock_crypto = MagicMock()
        mock_crypto.decrypt_message.return_value = MagicMock(
            sequence=1,
            payload={
                "claim_code": "SF-123456",
            },
        )
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
            patch("mqtt.subscriber.get_firestore_service", return_value=mock_firestore),
            patch("mqtt.subscriber.get_crypto_service", return_value=mock_crypto),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()
            msg = MagicMock()
            msg.topic = "group3/provisioning/esp32_001"
            msg.retain = False
            msg.payload.decode.return_value = '{"protected": true}'

            callback = mock_client.on_message
            callback(mock_client, None, msg)

            mock_firestore.upsert_device_registration.assert_called_once()
            mock_firestore.create_or_refresh_claim.assert_called_once_with(
                "esp32_001", "SF-123456"
            )

    def test_replayed_message_is_rejected(self, mock_settings, mock_influx):
        mock_firestore = MagicMock()
        mock_firestore.device_exists.return_value = True
        mock_firestore.accept_message_sequence.return_value = False
        mock_crypto = MagicMock()
        mock_crypto.decrypt_message.return_value = MagicMock(
            sequence=10,
            payload={"ec": 1.5},
        )

        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
            patch("mqtt.subscriber.get_influx_service", return_value=mock_influx),
            patch("mqtt.subscriber.get_firestore_service", return_value=mock_firestore),
            patch("mqtt.subscriber.get_crypto_service", return_value=mock_crypto),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()
            msg = MagicMock()
            msg.topic = "group3/telemetry/esp32_001"
            msg.retain = False
            msg.payload.decode.return_value = '{"protected": true}'

            callback = mock_client.on_message
            callback(mock_client, None, msg)

            mock_influx.write_telemetry.assert_not_called()

    def test_retained_message_is_ignored_before_firestore_access(
        self, mock_settings, mock_influx
    ):
        mock_firestore = MagicMock()
        mock_crypto = MagicMock()

        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
            patch("mqtt.subscriber.get_influx_service", return_value=mock_influx),
            patch("mqtt.subscriber.get_firestore_service", return_value=mock_firestore),
            patch("mqtt.subscriber.get_crypto_service", return_value=mock_crypto),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()
            msg = MagicMock()
            msg.topic = "group3/status/esp32_001"
            msg.retain = True
            msg.payload.decode.return_value = '{"protected": true}'

            callback = mock_client.on_message
            callback(mock_client, None, msg)

            mock_influx.write_telemetry.assert_not_called()
            mock_crypto.decrypt_message.assert_not_called()
            mock_firestore.accept_message_sequence.assert_not_called()

    def test_legacy_sequence_replay_mode_accepts_live_telemetry(
        self, mock_settings, mock_influx
    ):
        mock_settings.mqtt_allow_legacy_sequence_replay = True
        mock_firestore = MagicMock()
        mock_firestore.device_exists.return_value = True
        mock_firestore.accept_message_sequence.return_value = False
        mock_crypto = MagicMock()
        mock_crypto.decrypt_message.return_value = MagicMock(
            sequence=10,
            payload={
                "ec": 1.5,
                "air_temp": 22.0,
                "humidity": 65.0,
                "water_level": 80.0,
                "water_temp": 20.0,
                "light": 500.0,
                "timestamp": "2026-04-18T10:00:00Z",
            },
        )

        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
            patch("mqtt.subscriber.get_influx_service", return_value=mock_influx),
            patch("mqtt.subscriber.get_firestore_service", return_value=mock_firestore),
            patch("mqtt.subscriber.get_alert_service") as mock_alert_service,
            patch("mqtt.subscriber.get_crypto_service", return_value=mock_crypto),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client
            mock_alert_service.return_value.evaluate_readings.return_value = []

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()
            msg = MagicMock()
            msg.topic = "group3/telemetry/esp32_001"
            msg.retain = False
            msg.payload.decode.return_value = '{"protected": true}'

            callback = mock_client.on_message
            callback(mock_client, None, msg)

            mock_influx.write_telemetry.assert_called_once()

    def test_start_and_stop(self, mock_settings):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.Client") as mock_client_class,
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()
            subscriber._connected = True

            subscriber.start()
            mock_client.connect.assert_called_once_with("192.168.1.100", 1883, 60)
            mock_client.loop_start.assert_called_once()

            subscriber.stop()
            mock_client.loop_stop.assert_called_once()
            mock_client.disconnect.assert_called_once()
