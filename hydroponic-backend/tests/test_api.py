import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


class TestPingAPI:
    def test_ping_no_auth(self):
        with (
            patch("services.firestore.get_firestore_service") as mock_fs,
            patch("mqtt.subscriber.get_mqtt_subscriber") as mock_mqtt,
        ):
            mock_fs.return_value = MagicMock()
            mock_mqtt.return_value = MagicMock()

            from main import app

            client = TestClient(app)
            response = client.get("/ping")
            assert response.status_code == 200
            assert response.json() == {"status": "ok"}


class TestDeviceEndpoints:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_firestore = MagicMock()

        with patch("main.get_firestore_service", return_value=self.mock_firestore):
            from main import app

            self.client = TestClient(app)

            self.client.headers["Authorization"] = "Bearer valid_token"

            from api.dependencies import get_current_user

            async def mock_auth():
                return "test_user_123"

            app.dependency_overrides[get_current_user] = mock_auth

            yield

            app.dependency_overrides.pop(get_current_user, None)

    def test_list_devices(self):
        self.mock_firestore.get_user_devices.return_value = ["esp32_001", "esp32_002"]

        response = self.client.get("/devices")

        assert response.status_code == 200
        assert response.json()["devices"] == ["esp32_001", "esp32_002"]

    def test_claim_device_success(self):
        self.mock_firestore.consume_claim.return_value = "esp32_001"

        response = self.client.post("/devices/claim", json={"claim_code": "TEST123"})

        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["device_id"] == "esp32_001"

    def test_claim_device_invalid_code(self):
        self.mock_firestore.consume_claim.return_value = None

        response = self.client.post("/devices/claim", json={"claim_code": "INVALID"})

        assert response.status_code == 200
        assert response.json()["success"] is False

    def test_unclaim_device_success_and_reopen_claim(self):
        self.mock_firestore.verify_device_ownership.return_value = True
        self.mock_firestore.get_device_users.return_value = []
        self.mock_firestore.reopen_claim.return_value = True

        response = self.client.post("/devices/esp32_001/unclaim")

        assert response.status_code == 200
        assert response.json() == {
            "success": True,
            "device_id": "esp32_001",
            "claim_reopened": True,
        }
        self.mock_firestore.remove_device_from_user.assert_called_once_with(
            "test_user_123", "esp32_001"
        )
        self.mock_firestore.reopen_claim.assert_called_once_with("esp32_001")

    def test_unclaim_device_forbidden_when_not_owned(self):
        self.mock_firestore.verify_device_ownership.return_value = False

        response = self.client.post("/devices/esp32_001/unclaim")

        assert response.status_code == 403
        self.mock_firestore.remove_device_from_user.assert_not_called()


class TestSensorEndpoints:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_firestore = MagicMock()
        self.mock_influx = MagicMock()

        with (
            patch("api.sensors.get_firestore_service", return_value=self.mock_firestore),
            patch("api.sensors.get_influx_service", return_value=self.mock_influx),
        ):
            from main import app

            from api.dependencies import get_current_user

            async def mock_auth():
                return "test_user_123"

            app.dependency_overrides[get_current_user] = mock_auth

            self.client = TestClient(app)

            yield

            app.dependency_overrides.pop(get_current_user, None)

    def test_get_latest_reading_success(self):
        self.mock_firestore.verify_device_ownership.return_value = True
        self.mock_influx.get_latest_reading.return_value = {
            "device_id": "esp32_001",
            "ec": 1.5,
            "air_temp": 22.0,
        }

        response = self.client.get("/sensors/esp32_001")

        assert response.status_code == 200
        assert response.json()["device_id"] == "esp32_001"

    def test_get_latest_reading_unauthorized(self):
        self.mock_firestore.verify_device_ownership.return_value = False

        response = self.client.get("/sensors/esp32_001")

        assert response.status_code == 403

    def test_get_latest_reading_no_data(self):
        self.mock_firestore.verify_device_ownership.return_value = True
        self.mock_influx.get_latest_reading.return_value = None

        response = self.client.get("/sensors/esp32_001")

        assert response.status_code == 404

    def test_get_history_success(self):
        from datetime import datetime, timezone

        self.mock_firestore.verify_device_ownership.return_value = True
        self.mock_influx.get_history.return_value = [
            {"timestamp": datetime.now(timezone.utc).isoformat(), "ec": 1.5},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "ec": 1.6},
        ]

        response = self.client.get("/sensors/esp32_001/history")

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_get_history_exceeds_90_days(self):
        self.mock_firestore.verify_device_ownership.return_value = True

        response = self.client.get(
            "/sensors/esp32_001/history?start=2024-01-01T00:00:00Z&end=2024-05-01T00:00:00Z"
        )

        assert response.status_code == 400
