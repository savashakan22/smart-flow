from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import logging

from influxdb_client_3 import InfluxDBClient3, Point

from core.config import get_settings

logger = logging.getLogger(__name__)


class InfluxService:
    _instance: Optional["InfluxService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self) -> None:
        settings = get_settings()
        self._client = InfluxDBClient3(
            host="eu-central-1-1.aws.cloud2.influxdata.com",
            database=settings.influx_bucket,
            token=settings.influxdb_token,
        )

    @property
    def client(self):
        if not hasattr(self, "_client"):
            self.initialize()
        return self._client

    def write_telemetry(
        self, device_id: str, data: Dict[str, Any], timestamp: Optional[datetime] = None
    ) -> None:
        if not hasattr(self, "_client"):
            self.initialize()
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        point = Point("sensor_readings").tag("device_id", device_id)
        for field, value in data.items():
            if field != "timestamp":
                point.field(field, float(value))
        point.time(timestamp)

        try:
            self.client.write(point)
            logger.info(f"Write to InfluxDB successful for device {device_id}")
        except Exception as e:
            logger.error(f"InfluxDB write failed: {e}")
            raise

    def get_latest_reading(self, device_id: str) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM sensor_readings WHERE device_id = '{device_id}' ORDER BY time DESC LIMIT 1"
        try:
            table = self.client.query(query)
        except Exception as e:
            logger.error(f"Query failed: {e}")
            return None

        if not table or table.num_rows == 0:
            return None

        df = table.to_pandas()
        if df.empty:
            return None

        result = {"device_id": device_id, "timestamp": str(df.iloc[0]["time"])}
        for field in [
            "ec",
            "air_temp",
            "humidity",
            "water_level",
            "water_temp",
            "light",
        ]:
            if field in df.columns:
                result[field] = df.iloc[0][field]
        return result

    def get_history(
        self, device_id: str, start: datetime, end: datetime
    ) -> List[Dict[str, Any]]:
        query = f"SELECT * FROM sensor_readings WHERE device_id = '{device_id}' AND time >= '{start.isoformat()}' AND time <= '{end.isoformat()}' ORDER BY time ASC"
        try:
            table = self.client.query(query)
        except Exception as e:
            logger.error(f"Query failed: {e}")
            return []

        if not table or table.num_rows == 0:
            return []

        df = table.to_pandas()
        if "time" not in df.columns:
            return []

        results = []
        for _, row in df.iterrows():
            record = {"timestamp": str(row["time"])}
            for field in [
                "ec",
                "air_temp",
                "humidity",
                "water_level",
                "water_temp",
                "light",
            ]:
                if field in df.columns:
                    record[field] = row[field]
            results.append(record)
        return results


def get_influx_service() -> InfluxService:
    return InfluxService()
