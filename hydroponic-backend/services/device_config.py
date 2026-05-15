from copy import deepcopy
from typing import Any, Dict

from services.firestore import get_firestore_service


DEFAULT_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "ec": {
        "min": 1.2,
        "max": 2.4,
        "recommended_action": "Dilute or enrich the nutrient solution manually.",
    },
    "water_temp": {
        "min": 18.0,
        "max": 24.0,
        "recommended_action": "Inspect the reservoir temperature and adjust manually.",
    },
    "air_temp": {
        "min": 18.0,
        "max": 27.0,
        "recommended_action": "Ventilate or insulate the grow area manually.",
    },
    "humidity": {
        "min": 45.0,
        "max": 75.0,
        "recommended_action": "Adjust room humidity manually.",
    },
    "water_level": {
        "min": 25.0,
        "max": 100.0,
        "recommended_action": "Refill or drain the reservoir manually.",
    },
    "light": {
        "min": 100.0,
        "max": 900.0,
        "recommended_action": "Reposition or toggle the lighting manually.",
    },
}


class DeviceConfigService:
    def build_thresholds(self, device_id: str) -> Dict[str, Dict[str, float]]:
        firestore = get_firestore_service()
        thresholds = deepcopy(DEFAULT_THRESHOLDS)
        overrides = firestore.get_device_thresholds(device_id)
        if not isinstance(overrides, dict):
            overrides = {}

        for metric, rule in overrides.items():
            if metric in thresholds and isinstance(rule, dict):
                for boundary in ("min", "max"):
                    value = rule.get(boundary)
                    if isinstance(value, (int, float)):
                        thresholds[metric][boundary] = value

        return {
            metric: {
                "min": float(rule["min"]),
                "max": float(rule["max"]),
            }
            for metric, rule in thresholds.items()
            if rule.get("min") is not None and rule.get("max") is not None
        }

    def build_config_payload(self, device_id: str) -> Dict[str, Any]:
        return {
            "device_id": device_id,
            "schema": "thresholds.v1",
            "thresholds": self.build_thresholds(device_id),
        }


device_config_service = DeviceConfigService()


def get_device_config_service() -> DeviceConfigService:
    return device_config_service
