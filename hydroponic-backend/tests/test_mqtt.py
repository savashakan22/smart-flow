import pytest
import json
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone


class TestMQTTSubscriber:
    @pytest.fixture
    def mock_settings(self):
        settings = MagicMock()
        settings.mqtt_ip = "192.168.1.100"
        settings.mqtt_username = "mqtt_user"
        settings.mqtt_password = "mqtt_pass"
        return settings

    @pytest.fixture
    def mock_influx(self):
        return MagicMock()

    def test_on_connect_success(self, mock_settings):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.mqtt.Client") as mock_client_class,
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()

            callback = mock_client.on_connect
            callback(mock_client, None, None, 0)

            assert subscriber._connected is True
            mock_client.subscribe.assert_called_once_with("telemetry/#")

    def test_on_connect_failure(self, mock_settings):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.mqtt.Client") as mock_client_class,
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()

            callback = mock_client.on_connect
            callback(mock_client, None, None, 1)

            assert subscriber._connected is False

    def test_on_message_valid_payload(self, mock_settings, mock_influx):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.mqtt.Client") as mock_client_class,
            patch("mqtt.subscriber.get_influx_service", return_value=mock_influx),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()

            payload = {
                "ec": 1.5,
                "air_temp": 22.0,
                "humidity": 65.0,
                "water_level": 80.0,
                "water_temp": 20.0,
                "light": 500.0,
            }
            msg = MagicMock()
            msg.topic = "telemetry/esp32_001"
            msg.payload.decode.return_value = json.dumps(payload)

            callback = mock_client.on_message
            callback(mock_client, None, msg)

            mock_influx.write_telemetry.assert_called_once()
            call_args = mock_influx.write_telemetry.call_args
            assert call_args[0][0] == "esp32_001"

    def test_on_message_invalid_topic(self, mock_settings, mock_influx):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.mqtt.Client") as mock_client_class,
            patch("mqtt.subscriber.get_influx_service", return_value=mock_influx),
        ):
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            from mqtt.subscriber import MQTTSubscriber

            subscriber = MQTTSubscriber()

            msg = MagicMock()
            msg.topic = "invalid/topic"
            msg.payload.decode.return_value = "{}"

            callback = mock_client.on_message
            callback(mock_client, None, msg)

            mock_influx.write_telemetry.assert_not_called()

    def test_start_and_stop(self, mock_settings):
        with (
            patch("mqtt.subscriber.get_settings", return_value=mock_settings),
            patch("mqtt.subscriber.mqtt.Client") as mock_client_class,
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
