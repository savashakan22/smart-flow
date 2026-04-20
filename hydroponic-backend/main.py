import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from api.alerts import router as alerts_router
from core.config import get_cors_allowed_origins
from api.sensors import router as sensors_router
from api.dependencies import get_current_user
from services.firestore import get_firestore_service
from mqtt.subscriber import get_mqtt_subscriber


class ClaimRequest(BaseModel):
    claim_code: str


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    firestore = get_firestore_service()
    firestore.initialize()
    mqtt_sub = get_mqtt_subscriber()
    mqtt_sub.start()
    yield
    logger.info("Shutting down...")
    mqtt_sub.stop()


app = FastAPI(title="Smart Hydroponic API", lifespan=lifespan)
cors_allowed_origins = get_cors_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensors_router)
app.include_router(alerts_router)


@app.get("/ping")
async def ping():
    return {"status": "ok"}


@app.get("/devices")
async def list_devices(uid: str = Depends(get_current_user)):
    firestore = get_firestore_service()
    devices = firestore.get_user_devices(uid)
    return {"devices": devices}


@app.post("/devices/claim")
async def claim_device(body: ClaimRequest, uid: str = Depends(get_current_user)):
    firestore = get_firestore_service()
    device_id = firestore.consume_claim(body.claim_code)
    if not device_id:
        return {"success": False, "detail": "Invalid or expired claim code"}

    firestore.add_device_to_user(uid, device_id)
    return {"success": True, "device_id": device_id}


@app.post("/devices/{device_id}/unclaim")
async def unclaim_device(device_id: str, uid: str = Depends(get_current_user)):
    firestore = get_firestore_service()
    if not firestore.verify_device_ownership(uid, device_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Device not owned by user"
        )

    firestore.remove_device_from_user(uid, device_id)
    remaining_users = firestore.get_device_users(device_id)
    reopened = False
    if not remaining_users:
        reopened = firestore.reopen_claim(device_id)

    return {
        "success": True,
        "device_id": device_id,
        "claim_reopened": reopened,
    }
