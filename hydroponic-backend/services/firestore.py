import firebase_admin
from firebase_admin import credentials, firestore
from typing import List, Optional

from core.config import get_settings


class FirestoreService:
    _instance: Optional["FirestoreService"] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self) -> None:
        if self._initialized:
            return

        settings = get_settings()
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
        self._db = firestore.client()
        self._initialized = True

    @property
    def db(self):
        if not self._initialized:
            self.initialize()
        return self._db

    def get_user_devices(self, firebase_uid: str) -> List[str]:
        doc = self.db.collection("users").document(firebase_uid).get()
        if doc.exists:
            return doc.to_dict().get("devices", [])
        return []

    def add_device_to_user(self, firebase_uid: str, device_id: str) -> None:
        user_ref = self.db.collection("users").document(firebase_uid)
        user_ref.set({"devices": firestore.ArrayUnion([device_id])}, merge=True)

    def verify_device_ownership(self, firebase_uid: str, device_id: str) -> bool:
        devices = self.get_user_devices(firebase_uid)
        return device_id in devices

    def get_pending_claims(self) -> List[dict]:
        docs = (
            self.db.collection("device_claims")
            .where("status", "==", "pending")
            .stream()
        )
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

    def consume_claim(self, claim_code: str) -> Optional[str]:
        docs = (
            self.db.collection("device_claims")
            .where("claim_code", "==", claim_code)
            .where("status", "==", "pending")
            .stream()
        )
        for doc in docs:
            doc.reference.update({"status": "consumed"})
            return doc.to_dict().get("device_id")
        return None


def get_firestore_service() -> FirestoreService:
    return FirestoreService()
