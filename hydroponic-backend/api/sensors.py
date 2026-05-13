from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.dependencies import get_current_user
from services.firestore import get_firestore_service
from services.influx import get_influx_service

router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.get("/{device_id}/history")
async def get_sensor_history(
    device_id: str,
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
    uid: str = Depends(get_current_user),
):
    firestore = get_firestore_service()
    if not firestore.verify_device_ownership(uid, device_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Device not owned by user"
        )

    if end is None:
        end = datetime.now(timezone.utc)
    if start is None:
        start = end - timedelta(days=30)

    max_range = timedelta(days=90)
    if end - start > max_range:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Range exceeds 90 days"
        )

    influx = get_influx_service()
    data = influx.get_history(device_id, start, end)
    return {
        "device_id": device_id,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "count": len(data),
        "data": data,
    }


@router.get("/{device_id}")
async def get_latest_reading(device_id: str, uid: str = Depends(get_current_user)):
    firestore = get_firestore_service()
    if not firestore.verify_device_ownership(uid, device_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Device not owned by user"
        )

    influx = get_influx_service()
    data = influx.get_latest_reading(device_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No data found for device"
        )
    return data
