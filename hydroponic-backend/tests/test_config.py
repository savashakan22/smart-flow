import pytest
from unittest.mock import patch, mock_open
import os


class TestConfig:
    def test_load_env_variables(self):
        with patch.dict(
            os.environ,
            {
                "INFLUXDB_TOKEN": "test_token",
                "INFLUX_ORG": "TestOrg",
                "INFLUX_BUCKET": "test_bucket",
                "INFLUX_URL": "https://test.influxdata.com",
                "MQTT_IP": "192.168.1.100",
                "MQTT_USERNAME": "mqtt_user",
                "MQTT_PASSWORD": "mqtt_pass",
                "FIREBASE_CREDENTIALS_PATH": "firebase-credentials.json",
            },
        ):
            with patch("pathlib.Path.exists", return_value=True):
                with patch("builtins.open", mock_open(read_data="")):
                    from core.config import Settings

                    settings = Settings()
                    assert settings.influxdb_token == "test_token"
                    assert settings.influx_org == "TestOrg"
                    assert settings.influx_bucket == "test_bucket"
                    assert settings.mqtt_ip == "192.168.1.100"
                    assert settings.mqtt_username == "mqtt_user"

    def test_default_values(self):
        with patch.dict(
            os.environ,
            {
                "INFLUXDB_TOKEN": "test_token",
                "INFLUX_ORG": "TestOrg",
                "INFLUX_BUCKET": "test_bucket",
                "INFLUX_URL": "https://test.influxdata.com",
                "MQTT_IP": "192.168.1.100",
                "MQTT_USERNAME": "mqtt_user",
                "MQTT_PASSWORD": "mqtt_pass",
                "FIREBASE_CREDENTIALS_PATH": "firebase-credentials.json",
            },
        ):
            with patch("pathlib.Path.exists", return_value=True):
                with patch("builtins.open", mock_open(read_data="")):
                    from core.config import Settings

                    settings = Settings()
                    assert settings.influx_org == "TestOrg"
                    assert settings.influx_bucket == "test_bucket"

    def test_missing_required_var_raises(self):
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(Exception):
                from core.config import Settings

                Settings()
