from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials
from firebase_admin import auth as firebase_auth

from core.config import get_settings

security = HTTPBearer()

_initialized = False


def _init_firebase():
    global _initialized
    if not _initialized:
        settings = get_settings()
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
        _initialized = True


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    _init_firebase()
    token = credentials.credentials
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
