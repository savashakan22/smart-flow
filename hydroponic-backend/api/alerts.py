from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from api.dependencies import get_current_user
from services.firestore import get_firestore_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertAcknowledgeRequest(BaseModel):
    manual_action: Optional[str] = None


@router.get("")
async def list_alerts(
    device_id: Optional[str] = Query(default=None),
    include_acknowledged: bool = Query(default=False),
    uid: str = Depends(get_current_user),
):
    firestore = get_firestore_service()
    alerts = firestore.list_alerts_for_user(
        uid,
        device_id=device_id,
        include_acknowledged=include_acknowledged,
    )
    return {"count": len(alerts), "alerts": alerts}


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    body: AlertAcknowledgeRequest,
    uid: str = Depends(get_current_user),
):
    firestore = get_firestore_service()
    alert = firestore.acknowledge_alert(
        alert_id,
        uid,
        manual_action=body.manual_action,
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or not accessible",
        )
    return {"success": True, "alert": alert}
