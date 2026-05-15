import pytest
from unittest.mock import patch, mock_open
import os


class TestConfig:
    def test_load_env_variables(self):
        env_vars = {
            "INFLUXDB_TOKEN": "test_token",
            "INFLUX_ORG": "TestOrg",
            "INFLUX_BUCKET": "test_bucket",
            "INFLUX_URL": "https://test.influxdata.com",
            "MQTT_IP": "192.168.1.100",
            "MQTT_USERNAME": "mqtt_user",
            "MQTT_PASSWORD": "mqtt_pass",
            "MQTT_CRYPTO_MASTER_KEY_HEX": (
                "00112233445566778899aabbccddeeff"
                "00112233445566778899aabbccddeeff"
            ),
            "FIREBASE_CREDENTIALS_PATH": "firebase-credentials.json",
        }
        with patch.dict(os.environ, env_vars, clear=True):
            with patch("pathlib.Path.exists", return_value=True):
                with patch("builtins.open", mock_open(read_data="")):
                    from core.config import Settings

                    settings = Settings()
                    assert settings.influxdb_token == "test_token"
                    assert settings.influx_org == "TestOrg"
                    assert settings.influx_bucket == "test_bucket"
                    assert settings.mqtt_ip == "192.168.1.100"
                    assert settings.mqtt_username == "mqtt_user"
                    assert settings.mqtt_allow_legacy_sequence_replay is False
                    assert settings.mqtt_config_cache_ttl_seconds == 600

    def test_default_values(self):
        env_vars = {
            "INFLUXDB_TOKEN": "test_token",
            "INFLUX_ORG": "TestOrg",
            "INFLUX_BUCKET": "test_bucket",
            "INFLUX_URL": "https://test.influxdata.com",
            "MQTT_IP": "192.168.1.100",
            "MQTT_USERNAME": "mqtt_user",
            "MQTT_PASSWORD": "mqtt_pass",
            "MQTT_CRYPTO_MASTER_KEY_HEX": (
                "00112233445566778899aabbccddeeff"
                "00112233445566778899aabbccddeeff"
            ),
            "FIREBASE_CREDENTIALS_PATH": "firebase-credentials.json",
        }
        with patch.dict(os.environ, env_vars, clear=True):
            with patch("pathlib.Path.exists", return_value=True):
                with patch("builtins.open", mock_open(read_data="")):
                    from core.config import Settings

                    settings = Settings()
                    assert settings.influx_org == "TestOrg"
                    assert settings.influx_bucket == "test_bucket"
                    assert settings.mqtt_topic_prefix == "group3"
