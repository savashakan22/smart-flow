import json

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from services.crypto import CryptoService


class TestCryptoService:
    def test_decrypt_message_returns_original_payload(self):
        service = object.__new__(CryptoService)
        service._master_key = bytes.fromhex(
            "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
        )

        payload = {
            "ec": 1.7,
            "air_temp": 22.4,
        }
        namespace = "telemetry"
        device_id = "esp32_001"
        sequence = 42
        aad = service._build_aad(namespace, device_id, sequence)
        key = service._derive_topic_key(device_id)
        nonce = service._build_nonce(namespace, sequence)
        ciphertext = AESGCM(key).encrypt(
            nonce,
            json.dumps(payload).encode("utf-8"),
            aad,
        )

        protected = service.decrypt_message(
            namespace=namespace,
            device_id=device_id,
            raw_payload=json.dumps(
                {
                    "seq": sequence,
                    "ciphertext": ciphertext[:-16].hex(),
                    "tag": ciphertext[-16:].hex(),
                }
            ),
        )

        assert protected.sequence == sequence
        assert protected.payload == payload
