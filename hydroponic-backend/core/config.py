from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    influxdb_token: str = Field(alias="INFLUXDB_TOKEN")
    influx_org: str = Field(default="Dev", alias="INFLUX_ORG")
    influx_bucket: str = Field(default="time-series", alias="INFLUX_BUCKET")
    influx_url: str = Field(alias="INFLUX_URL")

    mqtt_ip: str = Field(alias="MQTT_IP")
    mqtt_username: str = Field(alias="MQTT_USERNAME")
    mqtt_password: str = Field(alias="MQTT_PASSWORD")

    firebase_credentials_path: str = Field(
        default="firebase-credentials.json", alias="FIREBASE_CREDENTIALS_PATH"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
