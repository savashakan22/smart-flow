from typing import Any, Dict, List

from services.device_config import DEFAULT_THRESHOLDS
from services.firestore import get_firestore_service


class AlertService:
    def evaluate_readings(self, device_id: str, readings: Dict[str, Any]) -> List[str]:
        firestore = get_firestore_service()
        thresholds = {
            metric: dict(rule) for metric, rule in DEFAULT_THRESHOLDS.items()
        }
        overrides = firestore.get_device_thresholds(device_id)

        for metric, rule in overrides.items():
            if metric in thresholds and isinstance(rule, dict):
                thresholds[metric].update(rule)

        users = firestore.get_device_users(device_id)
        created_alert_ids: List[str] = []

        for metric, rule in thresholds.items():
            value = readings.get(metric)
            if value is None:
                continue

            threshold_min = rule.get("min")
            threshold_max = rule.get("max")
            if threshold_min is None and threshold_max is None:
                continue

            if self._is_in_range(value, threshold_min, threshold_max):
                continue

            severity = self._calculate_severity(value, threshold_min, threshold_max)
            created_alert_ids.append(
                firestore.create_alert(
                    device_id=device_id,
                    metric=metric,
                    value=float(value),
                    threshold_min=threshold_min,
                    threshold_max=threshold_max,
                    severity=severity,
                    recommended_action=rule["recommended_action"],
                    users=users,
                )
            )

        return created_alert_ids

    @staticmethod
    def _is_in_range(
        value: float, threshold_min: float | None, threshold_max: float | None
    ) -> bool:
        if threshold_min is not None and value < threshold_min:
            return False
        if threshold_max is not None and value > threshold_max:
            return False
        return True

    @staticmethod
    def _calculate_severity(
        value: float, threshold_min: float | None, threshold_max: float | None
    ) -> str:
        boundary = (
            threshold_min
            if threshold_min is not None and value < threshold_min
            else threshold_max
        )
        if boundary in (None, 0):
            return "warning"

        deviation = abs(value - boundary) / abs(boundary)
        return "critical" if deviation >= 0.2 else "warning"


alert_service = AlertService()


def get_alert_service() -> AlertService:
    return alert_service
