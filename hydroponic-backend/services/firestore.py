import firebase_admin
from firebase_admin import firestore
from datetime import datetime, timezone
from typing import Dict, List, Optional
from google.cloud.firestore_v1.base_query import FieldFilter

from core.firebase_credentials import load_firebase_credentials


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

        if not firebase_admin._apps:
            cred = load_firebase_credentials()
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

    def device_exists(self, device_id: str) -> bool:
        return self.db.collection("devices").document(device_id).get().exists

    def add_device_to_user(self, firebase_uid: str, device_id: str) -> None:
        user_ref = self.db.collection("users").document(firebase_uid)
        user_ref.set({"devices": firestore.ArrayUnion([device_id])}, merge=True)

    def remove_device_from_user(self, firebase_uid: str, device_id: str) -> None:
        user_ref = self.db.collection("users").document(firebase_uid)
        user_ref.set({"devices": firestore.ArrayRemove([device_id])}, merge=True)

    def verify_device_ownership(self, firebase_uid: str, device_id: str) -> bool:
        devices = self.get_user_devices(firebase_uid)
        return device_id in devices

    def get_device_users(self, device_id: str) -> List[str]:
        docs = (
            self.db.collection("users")
            .where("devices", "array_contains", device_id)
            .stream()
        )
        return [doc.id for doc in docs]

    def get_pending_claims(self) -> List[dict]:
        docs = (
            self.db.collection("device_claims")
            .where(filter=FieldFilter("status", "==", "pending"))
            .stream()
        )
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

    def upsert_device_registration(self, device_id: str, payload: Dict) -> None:
        self.db.collection("devices").document(device_id).set(
            {
                **payload,
                "device_id": device_id,
                "last_registered_at": datetime.now(timezone.utc).isoformat(),
            },
            merge=True,
        )

    def create_or_refresh_claim(self, device_id: str, claim_code: str) -> None:
        self.db.collection("device_claims").document(device_id).set(
            {
                "device_id": device_id,
                "claim_code": claim_code,
                "status": "pending",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            merge=True,
        )

    def reopen_claim(self, device_id: str) -> bool:
        device_doc = self.db.collection("devices").document(device_id).get()
        if not device_doc.exists:
            return False

        claim_code = (device_doc.to_dict() or {}).get("claim_code")
        if not claim_code:
            return False

        self.create_or_refresh_claim(device_id, claim_code)
        return True

    def update_device_status(self, device_id: str, payload: Dict) -> None:
        self.db.collection("devices").document(device_id).set(
            {
                **payload,
                "device_id": device_id,
                "last_seen_at": datetime.now(timezone.utc).isoformat(),
            },
            merge=True,
        )

    def accept_message_sequence(
        self, device_id: str, namespace: str, sequence: int
    ) -> bool:
        doc_ref = self.db.collection("device_security").document(device_id)
        timestamp = datetime.now(timezone.utc).isoformat()
        transaction = self.db.transaction()

        @firestore.transactional
        def _accept(txn):
            snapshot = doc_ref.get(transaction=txn)
            payload = snapshot.to_dict() or {}
            last_sequences = payload.get("last_sequences", {})
            current = int(last_sequences.get(namespace, -1))
            if sequence <= current:
                return False

            last_sequences[namespace] = int(sequence)
            txn.set(
                doc_ref,
                {
                    "device_id": device_id,
                    "last_sequences": last_sequences,
                    "updated_at": timestamp,
                },
                merge=True,
            )
            return True

        return _accept(transaction)

    def get_device_thresholds(self, device_id: str) -> Dict:
        doc = self.db.collection("device_thresholds").document(device_id).get()
        if doc.exists:
            return doc.to_dict() or {}
        return {}

    def create_alert(
        self,
        *,
        device_id: str,
        metric: str,
        value: float,
        threshold_min: Optional[float],
        threshold_max: Optional[float],
        severity: str,
        recommended_action: str,
        users: Optional[List[str]] = None,
    ) -> str:
        alert_ref = self.db.collection("alerts").document()
        alert_ref.set(
            {
                "device_id": device_id,
                "metric": metric,
                "value": value,
                "threshold_min": threshold_min,
                "threshold_max": threshold_max,
                "severity": severity,
                "recommended_action": recommended_action,
                "users": users or [],
                "acknowledged": False,
                "acknowledged_at": None,
                "acknowledged_by": None,
                "manual_action": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        return alert_ref.id

    def list_alerts_for_user(
        self,
        firebase_uid: str,
        *,
        device_id: Optional[str] = None,
        include_acknowledged: bool = False,
    ) -> List[Dict]:
        query = self.db.collection("alerts").where("users", "array_contains", firebase_uid)
        if device_id:
            query = query.where("device_id", "==", device_id)
        if not include_acknowledged:
            query = query.where("acknowledged", "==", False)

        docs = [{"id": doc.id, **doc.to_dict()} for doc in query.stream()]
        return sorted(docs, key=lambda item: item.get("created_at", ""), reverse=True)

    def acknowledge_alert(
        self,
        alert_id: str,
        firebase_uid: str,
        *,
        manual_action: Optional[str] = None,
    ) -> Optional[Dict]:
        ref = self.db.collection("alerts").document(alert_id)
        doc = ref.get()
        if not doc.exists:
            return None

        payload = doc.to_dict() or {}
        if firebase_uid not in payload.get("users", []):
            return None

        update_payload = {
            "acknowledged": True,
            "acknowledged_by": firebase_uid,
            "acknowledged_at": datetime.now(timezone.utc).isoformat(),
        }
        if manual_action:
            update_payload["manual_action"] = manual_action

        ref.update(update_payload)
        payload.update(update_payload)
        payload["id"] = alert_id
        return payload

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
