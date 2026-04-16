import pytest
from unittest.mock import MagicMock, patch
import sys


class TestMainApp:
    def test_app_creation(self):
        with patch.dict(
            sys.modules,
            {
                "api.dependencies": MagicMock(),
                "services.firestore": MagicMock(),
                "mqtt.subscriber": MagicMock(),
            },
        ):
            from api import dependencies as dep_module
            from services import firestore as fs_module
            from mqtt import subscriber as mqtt_module

            dep_module._init_firebase = MagicMock()
            fs_module.get_firestore_service = MagicMock(return_value=MagicMock())
            mqtt_module.get_mqtt_subscriber = MagicMock(return_value=MagicMock())

            from main import app

            assert app.title == "Smart Hydroponic API"

    def test_ping_endpoint(self):
        with patch.dict(
            sys.modules,
            {
                "api.dependencies": MagicMock(),
                "services.firestore": MagicMock(),
                "mqtt.subscriber": MagicMock(),
            },
        ):
            from main import app
            from fastapi.testclient import TestClient

            client = TestClient(app)
            response = client.get("/ping")

            assert response.status_code == 200
            assert response.json() == {"status": "ok"}
