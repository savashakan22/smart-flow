import paho.mqtt.client as mqtt
from paho.mqtt.client import CallbackAPIVersion
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import json
import time
import random
import argparse
import hashlib
import hmac
import os
from datetime import datetime, timezone
from typing import List, Optional

import firebase_admin
from firebase_admin import credentials, firestore


class VirtualDevice:
    def __init__(
        self,
        device_id: str,
        mqtt_ip: str,
        mqtt_port: int,
        mqtt_user: str,
        mqtt_pass: str,
        firebase_cred_path: Optional[str] = None,
    ):
        self.device_id = device_id
        self.mqtt_ip = mqtt_ip
        self.mqtt_port = mqtt_port
        self.mqtt_user = mqtt_user
        self.mqtt_pass = mqtt_pass
        self.firebase_cred_path = firebase_cred_path
        self._mqtt_client: Optional[mqtt.Client] = None
        self._firebase_initialized = False
        self._crypto_master_key_hex = os.getenv("MQTT_CRYPTO_MASTER_KEY_HEX", "")
        self._session_prefix = int(time.time())
        self._sequence_counters = {
            "provisioning": 0,
            "telemetry": 0,
        }
        self._provisioning_sent = False

    def _init_firebase(self):
        if self._firebase_initialized:
            return
        if self.firebase_cred_path:
            try:
                cred = credentials.Certificate(self.firebase_cred_path)
                firebase_admin.initialize_app(cred)
                self._firebase_initialized = True
            except Exception as e:
                print(f"Firebase init failed for {self.device_id}: {e}")

    def _connect_mqtt(self) -> mqtt.Client:
        client = mqtt.Client(
            callback_api_version=CallbackAPIVersion.VERSION2,
            client_id=f"sim_{self.device_id}",
        )
        client.username_pw_set(self.mqtt_user, self.mqtt_pass)
        client.connect(self.mqtt_ip, self.mqtt_port, 60)
        return client

    def _next_sequence(self, namespace: str) -> int:
        self._sequence_counters[namespace] += 1
        return (self._session_prefix << 16) | self._sequence_counters[namespace]

    def _derive_topic_key(self) -> bytes:
        master_key = bytes.fromhex(self._crypto_master_key_hex)
        return hmac.new(
            master_key,
            self.device_id.encode("utf-8"),
            hashlib.sha256,
        ).digest()

    def _build_nonce(self, namespace: str, sequence: int) -> bytes:
        namespace_codes = {
            "telemetry": 1,
            "provisioning": 2,
        }
        namespace_code = namespace_codes[namespace]
        return namespace_code.to_bytes(4, "big") + sequence.to_bytes(8, "big")

    def _protect_payload(self, namespace: str, payload: dict) -> str:
        sequence = self._next_sequence(namespace)
        nonce = self._build_nonce(namespace, sequence)
        plaintext = json.dumps(payload).encode("utf-8")
        aad = f"{namespace}:{self.device_id}:{sequence}".encode("utf-8")
        ciphertext = AESGCM(self._derive_topic_key()).encrypt(
            nonce,
            plaintext,
            aad,
        )
        return json.dumps(
            {
                "seq": sequence,
                "ciphertext": ciphertext[:-16].hex(),
                "tag": ciphertext[-16:].hex(),
            }
        )

    def generate_reading(self) -> dict:
        return {
            "ec": round(random.uniform(1.0, 2.5), 2),
            "air_temp": round(random.uniform(18.0, 28.0), 1),
            "humidity": round(random.uniform(50.0, 80.0), 1),
            "water_level": round(random.uniform(30.0, 95.0), 1),
            "water_temp": round(random.uniform(18.0, 25.0), 1),
            "light": round(random.uniform(0.0, 1000.0), 0),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def generate_provisioning_payload(self) -> dict:
        return {
            "device_id": self.device_id,
            "claim_code": f"SIM_CLAIM_{self.device_id}",
            "capabilities": [
                "ec",
                "air_temp",
                "humidity",
                "water_level",
                "water_temp",
                "light",
            ],
        }

    def publish(self):
        try:
            client = self._connect_mqtt()
            if not self._provisioning_sent:
                client.publish(
                    f"provisioning/{self.device_id}",
                    self._protect_payload(
                        "provisioning", self.generate_provisioning_payload()
                    ),
                )
                self._provisioning_sent = True
            payload = self.generate_reading()
            topic = f"telemetry/{self.device_id}"
            client.publish(topic, self._protect_payload("telemetry", payload))
            client.disconnect()
            print(f"[{self.device_id}] Published: {payload}")
            return True
        except Exception as e:
            print(f"[{self.device_id}] MQTT Error: {e}")
            return False

    def register_claim(self) -> Optional[str]:
        self._init_firebase()
        if not self._firebase_initialized:
            print(
                f"[{self.device_id}] Firebase not initialized, skipping claim registration"
            )
            return None

        claim_code = f"SIM_CLAIM_{self.device_id}"
        try:
            db = firestore.client()
            db.collection("device_claims").add(
                {
                    "claim_code": claim_code,
                    "device_id": self.device_id,
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            print(f"[{self.device_id}] Registered claim code: {claim_code}")
            return claim_code
        except Exception as e:
            print(f"[{self.device_id}] Firestore Error: {e}")
            return None


class SensorSimulator:
    def __init__(
        self,
        device_ids: List[str],
        interval_sec: int = 900,
        mqtt_ip: Optional[str] = None,
        mqtt_port: int = 1883,
        mqtt_user: Optional[str] = None,
        mqtt_pass: Optional[str] = None,
        firebase_cred_path: Optional[str] = None,
        register_claims: bool = False,
    ):
        self.devices = [
            VirtualDevice(
                device_id=dev_id,
                mqtt_ip=mqtt_ip,
                mqtt_port=mqtt_port,
                mqtt_user=mqtt_user,
                mqtt_pass=mqtt_pass,
                firebase_cred_path=firebase_cred_path,
            )
            for dev_id in device_ids
        ]
        self.interval_sec = interval_sec
        self.register_claims = register_claims

    def register_all_claims(self):
        print("\n=== Registering Claim Codes ===")
        for device in self.devices:
            device.register_claim()

    def run(self, duration_minutes: Optional[int] = None):
        print(f"\n=== Starting Simulator ===")
        print(f"Devices: {[d.device_id for d in self.devices]}")
        print(f"Interval: {self.interval_sec}s ({self.interval_sec // 60}min)")
        print(
            f"Duration: {'infinite' if duration_minutes is None else f'{duration_minutes} min'}"
        )

        if self.register_claims:
            self.register_all_claims()

        print("\n=== Publishing Telemetry ===")
        start_time = time.time()
        iteration = 0

        try:
            while True:
                iteration += 1
                elapsed = (time.time() - start_time) / 60
                print(f"\n--- Iteration {iteration} (elapsed: {elapsed:.1f} min) ---")

                for device in self.devices:
                    device.publish()

                if duration_minutes and elapsed >= duration_minutes:
                    print(f"\nDuration reached. Stopping.")
                    break

                time.sleep(self.interval_sec)
        except KeyboardInterrupt:
            print("\n\nInterrupted. Stopping simulator.")


def load_env_defaults():
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass

    return {
        "mqtt_ip": os.getenv("MQTT_IP"),
        "mqtt_user": os.getenv("MQTT_USERNAME"),
        "mqtt_pass": os.getenv("MQTT_PASSWORD"),
        "firebase_cred_path": os.getenv("FIREBASE_CREDENTIALS_PATH"),
    }


def main():
    parser = argparse.ArgumentParser(description="Hydroponic Sensor Simulator")
    parser.add_argument(
        "--devices",
        required=True,
        help="Comma-separated device IDs (e.g., sim_001,sim_002,sim_003)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=900,
        help="Seconds between readings (default: 900 = 15 min)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=None,
        help="Run for N minutes then stop (default: run indefinitely)",
    )
    parser.add_argument(
        "--mqtt-ip",
        default=None,
        help="MQTT broker IP (default: from .env)",
    )
    parser.add_argument(
        "--mqtt-port",
        type=int,
        default=1883,
        help="MQTT broker port (default: 1883)",
    )
    parser.add_argument(
        "--mqtt-user",
        default=None,
        help="MQTT username (default: from .env)",
    )
    parser.add_argument(
        "--mqtt-pass",
        default=None,
        help="MQTT password (default: from .env)",
    )
    parser.add_argument(
        "--firebase-creds",
        default=None,
        help="Path to Firebase credentials JSON (default: from .env)",
    )
    parser.add_argument(
        "--register-claims",
        action="store_true",
        help="Register claim codes in Firestore before starting",
    )

    args = parser.parse_args()

    env = load_env_defaults()

    device_ids = [d.strip() for d in args.devices.split(",")]

    simulator = SensorSimulator(
        device_ids=device_ids,
        interval_sec=args.interval,
        mqtt_ip=args.mqtt_ip or env.get("mqtt_ip"),
        mqtt_port=args.mqtt_port,
        mqtt_user=args.mqtt_user or env.get("mqtt_user"),
        mqtt_pass=args.mqtt_pass or env.get("mqtt_pass"),
        firebase_cred_path=args.firebase_creds or env.get("firebase_cred_path"),
        register_claims=args.register_claims,
    )

    simulator.run(duration_minutes=args.duration)


if __name__ == "__main__":
    main()
