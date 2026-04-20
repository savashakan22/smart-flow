import hashlib
import hmac
import json
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from core.config import get_settings


class ProtectedPayloadError(ValueError):
    pass


@dataclass
class ProtectedMessage:
    sequence: int
    payload: dict


class CryptoService:
    def __init__(self) -> None:
        settings = get_settings()
        self._master_key = self._parse_master_key(settings.mqtt_crypto_master_key_hex)

    def decrypt_message(
        self,
        *,
        namespace: str,
        device_id: str,
        raw_payload: str,
    ) -> ProtectedMessage:
        try:
            envelope = json.loads(raw_payload)
        except json.JSONDecodeError as exc:
            raise ProtectedPayloadError("Payload is not valid JSON") from exc

        sequence = envelope.get("seq")
        ciphertext_hex = envelope.get("ciphertext")
        tag_hex = envelope.get("tag")

        if not isinstance(sequence, int) or sequence < 0:
            raise ProtectedPayloadError("Invalid sequence number")
        if not all(isinstance(part, str) for part in (ciphertext_hex, tag_hex)):
            raise ProtectedPayloadError("Invalid encrypted payload fields")

        try:
            ciphertext = bytes.fromhex(ciphertext_hex)
            tag = bytes.fromhex(tag_hex)
        except ValueError as exc:
            raise ProtectedPayloadError("Encrypted payload is not valid hex") from exc

        if len(tag) != 16:
            raise ProtectedPayloadError("Authentication tag must be 16 bytes")

        topic_key = self._derive_topic_key(device_id)
        aad = self._build_aad(namespace, device_id, sequence)
        nonce = self._build_nonce(namespace, sequence)

        try:
            plaintext = AESGCM(topic_key).decrypt(nonce, ciphertext + tag, aad)
        except Exception as exc:
            raise ProtectedPayloadError("Unable to authenticate or decrypt payload") from exc

        try:
            payload = json.loads(plaintext.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ProtectedPayloadError("Decrypted payload is not valid JSON") from exc

        return ProtectedMessage(sequence=sequence, payload=payload)

    def _derive_topic_key(self, device_id: str) -> bytes:
        return hmac.new(
            self._master_key,
            device_id.encode("utf-8"),
            hashlib.sha256,
        ).digest()

    def _build_nonce(self, namespace: str, sequence: int) -> bytes:
        namespace_code = self._namespace_code(namespace)
        return namespace_code.to_bytes(4, "big") + sequence.to_bytes(8, "big")

    def _namespace_code(self, namespace: str) -> int:
        namespace_codes = {
            "telemetry": 1,
            "provisioning": 2,
            "status": 3,
        }
        if namespace not in namespace_codes:
            raise ProtectedPayloadError("Unsupported namespace for nonce derivation")
        return namespace_codes[namespace]

    def _build_aad(self, namespace: str, device_id: str, sequence: int) -> bytes:
        return f"{namespace}:{device_id}:{sequence}".encode("utf-8")

    def _parse_master_key(self, raw_hex: str) -> bytes:
        try:
            key = bytes.fromhex(raw_hex)
        except ValueError as exc:
            raise ProtectedPayloadError("MQTT crypto master key must be valid hex") from exc

        if len(key) != 32:
            raise ProtectedPayloadError("MQTT crypto master key must be 32 bytes")
        return key


crypto_service: CryptoService | None = None


def get_crypto_service() -> CryptoService:
    global crypto_service
    if crypto_service is None:
        crypto_service = CryptoService()
    return crypto_service
