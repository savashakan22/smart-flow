from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

from core.config import get_settings


class InfluxService:
    _instance: Optional["InfluxService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self) -> None:
        settings = get_settings()
        self._client = InfluxDBClient(
            url=settings.influx_url,
            token=settings.influxdb_token,
            org=settings.influx_org,
        )
        self._write_api = self._client.write_api(write_options=SYNCHRONOUS)

    @property
    def client(self):
        if not hasattr(self, "_client"):
            self.initialize()
        return self._client

    def write_telemetry(
        self, device_id: str, data: Dict[str, Any], timestamp: Optional[datetime] = None
    ) -> None:
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        point = Point("sensor_readings").tag("device_id", device_id)
        for field, value in data.items():
            if field != "timestamp":
                point.field(field, float(value))
        point.time(timestamp)

        settings = get_settings()
        self._write_api.write(
            bucket=settings.influx_bucket, org=settings.influx_org, record=point
        )

    def get_latest_reading(self, device_id: str) -> Optional[Dict[str, Any]]:
        query = f'''
        from(bucket: "{get_settings().influx_bucket}")
            |> range(start: -1h)
            |> filter(fn: (r) => r["device_id"] == "{device_id}")
            |> last()
        '''
        tables = self.client.query_api().query(query)

        if not tables or not tables[0].records:
            return None

        record = tables[0].records[0]
        result = {"device_id": device_id, "timestamp": record.get_time().isoformat()}
        for field in [
            "ec",
            "air_temp",
            "humidity",
            "water_level",
            "water_temp",
            "light",
        ]:
            result[field] = record.values.get(field)
        return result

    def get_history(
        self, device_id: str, start: datetime, end: datetime
    ) -> List[Dict[str, Any]]:
        query = f'''
        from(bucket: "{get_settings().influx_bucket}")
            |> range(start: {start.isoformat()}, stop: {end.isoformat()})
            |> filter(fn: (r) => r["device_id"] == "{device_id}")
            |> sort(columns: ["_time"])
        '''
        tables = self.client.query_api().query(query)

        if not tables:
            return []

        results = []
        for record in tables[0].records:
            row = {"timestamp": record.get_time().isoformat()}
            for field in [
                "ec",
                "air_temp",
                "humidity",
                "water_level",
                "water_temp",
                "light",
            ]:
                if field in record.values:
                    row[field] = record.values[field]
            results.append(row)
        return results


def get_influx_service() -> InfluxService:
    return InfluxService()
