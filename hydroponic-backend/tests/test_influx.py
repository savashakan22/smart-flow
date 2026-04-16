import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone


class TestInfluxService:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_client = MagicMock()
        self.mock_write_api = MagicMock()
        self.mock_query_api = MagicMock()
        self.mock_client.write_api.return_value = self.mock_write_api
        self.mock_client.query_api.return_value = self.mock_query_api

        with patch("services.influx.InfluxDBClient", return_value=self.mock_client):
            with patch("services.influx.get_settings") as mock_settings:
                mock_settings.return_value = MagicMock(
                    influx_url="https://test.influxdata.com",
                    influxdb_token="test_token",
                    influx_org="TestOrg",
                    influx_bucket="time-series",
                )
                from services.influx import InfluxService

                InfluxService._instance = None
                self.service = InfluxService()
                self.service.initialize()

    def test_write_telemetry(self):
        data = {
            "ec": 1.5,
            "air_temp": 22.0,
            "humidity": 65.0,
            "water_level": 80.0,
            "water_temp": 20.0,
            "light": 500.0,
        }
        timestamp = datetime.now(timezone.utc)

        self.service.write_telemetry("esp32_001", data, timestamp)

        self.mock_write_api.write.assert_called_once()

    def test_get_latest_reading_returns_data(self):
        mock_record = MagicMock()
        mock_record.get_time.return_value = datetime.now(timezone.utc)
        mock_record.values = {
            "device_id": "esp32_001",
            "ec": 1.5,
            "air_temp": 22.0,
            "humidity": 65.0,
            "water_level": 80.0,
            "water_temp": 20.0,
            "light": 500.0,
        }

        mock_table = MagicMock()
        mock_table.records = [mock_record]
        self.mock_query_api.query.return_value = [mock_table]

        result = self.service.get_latest_reading("esp32_001")

        assert result is not None
        assert result["device_id"] == "esp32_001"
        assert result["ec"] == 1.5

    def test_get_latest_reading_returns_none(self):
        self.mock_query_api.query.return_value = []

        result = self.service.get_latest_reading("esp32_001")
        assert result is None

    def test_get_history_returns_data(self):
        mock_record1 = MagicMock()
        mock_record1.get_time.return_value = datetime.now(timezone.utc)
        mock_record1.values = {"ec": 1.5, "air_temp": 22.0}

        mock_record2 = MagicMock()
        mock_record2.get_time.return_value = datetime.now(timezone.utc)
        mock_record2.values = {"ec": 1.6, "air_temp": 23.0}

        mock_table = MagicMock()
        mock_table.records = [mock_record1, mock_record2]
        self.mock_query_api.query.return_value = [mock_table]

        start = datetime.now(timezone.utc)
        end = datetime.now(timezone.utc)
        result = self.service.get_history("esp32_001", start, end)

        assert len(result) == 2

    def test_get_history_returns_empty_list(self):
        self.mock_query_api.query.return_value = []

        start = datetime.now(timezone.utc)
        end = datetime.now(timezone.utc)
        result = self.service.get_history("esp32_001", start, end)

        assert result == []
