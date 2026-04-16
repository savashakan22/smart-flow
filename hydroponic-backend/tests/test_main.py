import pytest
from unittest.mock import MagicMock, patch


class TestMainApp:
    def test_app_creation(self):
        with (
            patch("api.dependencies._init_firebase"),
            patch("services.firestore.get_firestore_service") as mock_fs,
            patch("mqtt.subscriber.get_mqtt_subscriber") as mock_mqtt,
        ):
            mock_fs_instance = MagicMock()
            mock_fs.return_value = mock_fs_instance

            mock_mqtt_instance = MagicMock()
            mock_mqtt.return_value = mock_mqtt_instance

            from main import app

            assert app.title == "Smart Hydroponic API"

    def test_ping_endpoint(self):
        with (
            patch("api.dependencies._init_firebase"),
            patch("services.firestore.get_firestore_service"),
            patch("mqtt.subscriber.get_mqtt_subscriber"),
        ):
            from fastapi.testclient import TestClient
            from main import app

            client = TestClient(app)
            response = client.get("/ping")

            assert response.status_code == 200
            assert response.json() == {"status": "ok"}

    def test_lifespan_startup_shutdown(self):
        startup_called = False
        shutdown_called = False

        mock_firestore = MagicMock()
        mock_mqtt = MagicMock()

        with (
            patch(
                "services.firestore.get_firestore_service", return_value=mock_firestore
            ),
            patch("mqtt.subscriber.get_mqtt_subscriber", return_value=mock_mqtt),
        ):
            from fastapi.testclient import TestClient
            from main import app

            with TestClient(app):
                pass

            mock_firestore.initialize.assert_called_once()
            mock_mqtt.start.assert_called_once()
            mock_mqtt.stop.assert_called_once()
