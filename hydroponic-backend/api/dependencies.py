from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth as firebase_auth

from core.firebase_credentials import load_firebase_credentials

security = HTTPBearer()

_initialized = False


def _init_firebase():
    if not firebase_admin._apps:
        cred = load_firebase_credentials()
        firebase_admin.initialize_app(cred)


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
