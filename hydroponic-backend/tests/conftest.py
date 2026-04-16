import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone


@pytest.fixture
def mock_firebase():
    with (
        patch("firebase_admin.initialize_app") as mock_init,
        patch("firebase_admin.credentials.Certificate") as mock_cred,
    ):
        mock_cred.return_value = MagicMock()
        mock_init.return_value = None
        yield mock_init, mock_cred


@pytest.fixture
def mock_firestore_db():
    return MagicMock()


@pytest.fixture
def mock_influx_client():
    client = MagicMock()
    write_api = MagicMock()
    query_api = MagicMock()
    client.write_api.return_value = write_api
    client.query_api.return_value = query_api
    return client, write_api, query_api


@pytest.fixture
def sample_telemetry():
    return {
        "ec": 1.5,
        "air_temp": 22.0,
        "humidity": 65.0,
        "water_level": 80.0,
        "water_temp": 20.0,
        "light": 500.0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@pytest.fixture
def sample_user_claims():
    return [
        {"claim_code": "TEST123", "device_id": "esp32_001", "status": "pending"},
        {"claim_code": "TEST456", "device_id": "esp32_002", "status": "consumed"},
    ]
