import base64
import json

from firebase_admin import credentials

from core.config import get_settings


def load_firebase_credentials():
    settings = get_settings()

    if settings.firebase_credentials_base64:
        payload = base64.b64decode(settings.firebase_credentials_base64).decode("utf-8")
        return credentials.Certificate(json.loads(payload))

    if settings.firebase_credentials_json:
        return credentials.Certificate(json.loads(settings.firebase_credentials_json))

    return credentials.Certificate(settings.firebase_credentials_path)
