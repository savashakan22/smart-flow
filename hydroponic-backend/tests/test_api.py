import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone


class TestSensorAPI:
    @pytest.fixture(autouse=True)
    def setup(self):
        with (
            patch("api.dependencies._init_firebase"),
            patch("api.dependencies.verify_id_token") as mock_verify,
            patch("services.firestore.get_firestore_service") as mock_firestore,
            patch("services.influx.get_influx_service") as mock_influx,
        ):
            mock_verify.return_value = {"uid": "test_user_123"}
            self.mock_firestore = MagicMock()
            self.mock_influx = MagicMock()
            mock_firestore.return_value = self.mock_firestore
            mock_influx.return_value = self.mock_influx

            from main import app

            self.client = TestClient(app)

    def test_get_latest_reading_success(self):
        self.mock_firestore.verify_device_ownership.return_value = True
        self.mock_influx.get_latest_reading.return_value = {
            "device_id": "esp32_001",
            "ec": 1.5,
            "air_temp": 22.0,
            "humidity": 65.0,
        }

        response = self.client.get(
            "/sensors/esp32_001", headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert response.json()["device_id"] == "esp32_001"

    def test_get_latest_reading_unauthorized(self):
        self.mock_firestore.verify_device_ownership.return_value = False

        response = self.client.get(
            "/sensors/esp32_001", headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 403

    def test_get_latest_reading_no_data(self):
        self.mock_firestore.verify_device_ownership.return_value = True
        self.mock_influx.get_latest_reading.return_value = None

        response = self.client.get(
            "/sensors/esp32_001", headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 404

    def test_get_history_success(self):
        self.mock_firestore.verify_device_ownership.return_value = True
        self.mock_influx.get_history.return_value = [
            {"timestamp": datetime.now(timezone.utc).isoformat(), "ec": 1.5},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "ec": 1.6},
        ]

        response = self.client.get(
            "/sensors/esp32_001/history",
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_get_history_exceeds_30_days(self):
        self.mock_firestore.verify_device_ownership.return_value = True

        response = self.client.get(
            "/sensors/esp32_001/history?start=2024-01-01T00:00:00Z&end=2024-03-01T00:00:00Z",
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 400

    def test_get_history_no_auth(self):
        response = self.client.get("/sensors/esp32_001/history")
        assert response.status_code == 403


class TestDeviceAPI:
    @pytest.fixture(autouse=True)
    def setup(self):
        with (
            patch("api.dependencies._init_firebase"),
            patch("api.dependencies.verify_id_token") as mock_verify,
            patch("services.firestore.get_firestore_service") as mock_firestore,
        ):
            mock_verify.return_value = {"uid": "test_user_123"}
            self.mock_firestore = MagicMock()
            mock_firestore.return_value = self.mock_firestore

            from main import app

            self.client = TestClient(app)

    def test_list_devices(self):
        self.mock_firestore.get_user_devices.return_value = ["esp32_001", "esp32_002"]

        response = self.client.get(
            "/devices", headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert response.json()["devices"] == ["esp32_001", "esp32_002"]

    def test_claim_device_success(self):
        self.mock_firestore.consume_claim.return_value = "esp32_001"

        response = self.client.post(
            "/devices/claim",
            json={"claim_code": "TEST123"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["device_id"] == "esp32_001"
        self.mock_firestore.add_device_to_user.assert_called_once()

    def test_claim_device_invalid_code(self):
        self.mock_firestore.consume_claim.return_value = None

        response = self.client.post(
            "/devices/claim",
            json={"claim_code": "INVALID"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        assert response.json()["success"] is False


class TestPingAPI:
    def test_ping_no_auth(self):
        with (
            patch("api.dependencies._init_firebase"),
            patch("services.firestore.get_firestore_service"),
            patch("mqtt.subscriber.get_mqtt_subscriber"),
        ):
            from main import app

            client = TestClient(app)

            response = client.get("/ping")
            assert response.status_code == 200
            assert response.json() == {"status": "ok"}
