import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from datetime import datetime, timezone


class TestFirestoreService:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_cred = MagicMock()
        self.mock_db = MagicMock()

        with (
            patch("firebase_admin.initialize_app"),
            patch(
                "firebase_admin.credentials.Certificate", return_value=self.mock_cred
            ),
            patch("firebase_admin.firestore.client", return_value=self.mock_db),
        ):
            from services.firestore import FirestoreService

            FirestoreService._instance = None
            FirestoreService._initialized = False
            self.service = FirestoreService()
            self.service.initialize()

    def test_get_user_devices_returns_devices(self):
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {"devices": ["esp32_001", "esp32_002"]}
        self.mock_db.collection.return_value.document.return_value.get.return_value = (
            mock_doc
        )

        devices = self.service.get_user_devices("user123")
        assert devices == ["esp32_001", "esp32_002"]

    def test_get_user_devices_returns_empty_list(self):
        mock_doc = MagicMock()
        mock_doc.exists = False
        self.mock_db.collection.return_value.document.return_value.get.return_value = (
            mock_doc
        )

        devices = self.service.get_user_devices("user123")
        assert devices == []

    def test_add_device_to_user(self):
        self.mock_db.collection.return_value.document.return_value.set = MagicMock()

        self.service.add_device_to_user("user123", "esp32_003")

        self.mock_db.collection.return_value.document.return_value.set.assert_called_once()

    def test_verify_device_ownership_valid(self):
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {"devices": ["esp32_001", "esp32_002"]}
        self.mock_db.collection.return_value.document.return_value.get.return_value = (
            mock_doc
        )

        result = self.service.verify_device_ownership("user123", "esp32_001")
        assert result is True

    def test_verify_device_ownership_invalid(self):
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {"devices": ["esp32_001", "esp32_002"]}
        self.mock_db.collection.return_value.document.return_value.get.return_value = (
            mock_doc
        )

        result = self.service.verify_device_ownership("user123", "esp32_999")
        assert result is False

    def test_consume_claim_success(self):
        mock_doc = MagicMock()
        mock_doc.id = "claim_doc_1"
        mock_doc.to_dict.return_value = {
            "claim_code": "TEST123",
            "device_id": "esp32_001",
            "status": "pending",
        }
        mock_doc.reference = MagicMock()

        mock_query = MagicMock()
        mock_query.stream.return_value = [mock_doc]

        self.mock_db.collection.return_value.where.return_value = mock_query

        device_id = self.service.consume_claim("TEST123")
        assert device_id == "esp32_001"
        mock_doc.reference.update.assert_called_once()

    def test_consume_claim_invalid_code(self):
        mock_query = MagicMock()
        mock_query.stream.return_value = []

        self.mock_db.collection.return_value.where.return_value = mock_query

        device_id = self.service.consume_claim("INVALID")
        assert device_id is None
