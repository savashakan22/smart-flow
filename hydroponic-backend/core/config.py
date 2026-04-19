from functools import lru_cache
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    influxdb_token: str = Field(alias="INFLUXDB_TOKEN")
    influx_org: str = Field(default="Dev", alias="INFLUX_ORG")
    influx_bucket: str = Field(default="time-series", alias="INFLUX_BUCKET")
    influx_url: str = Field(alias="INFLUX_URL")

    mqtt_ip: str = Field(alias="MQTT_IP")
    mqtt_port: int = Field(default=1883, alias="MQTT_PORT")
    mqtt_username: str = Field(alias="MQTT_USERNAME")
    mqtt_password: str = Field(alias="MQTT_PASSWORD")
    mqtt_crypto_master_key_hex: str = Field(alias="MQTT_CRYPTO_MASTER_KEY_HEX")

    firebase_credentials_path: str = Field(
        default="firebase-credentials.json", alias="FIREBASE_CREDENTIALS_PATH"
    )
    firebase_credentials_json: Optional[str] = Field(
        default=None, alias="FIREBASE_CREDENTIALS_JSON"
    )
    firebase_credentials_base64: Optional[str] = Field(
        default=None, alias="FIREBASE_CREDENTIALS_BASE64"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
