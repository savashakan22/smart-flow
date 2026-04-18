from unittest.mock import MagicMock, patch


class TestAlertService:
    def test_out_of_range_metric_creates_alert(self):
        mock_firestore = MagicMock()
        mock_firestore.get_device_thresholds.return_value = {}
        mock_firestore.get_device_users.return_value = ["user_1"]
        mock_firestore.create_alert.return_value = "alert_1"

        with patch(
            "services.alerts.get_firestore_service", return_value=mock_firestore
        ):
            from services.alerts import AlertService

            service = AlertService()
            result = service.evaluate_readings(
                "esp32_001",
                {
                    "ec": 3.1,
                },
            )

        assert result == ["alert_1"]
        mock_firestore.create_alert.assert_called_once()

    def test_in_range_metrics_do_not_create_alert(self):
        mock_firestore = MagicMock()
        mock_firestore.get_device_thresholds.return_value = {}
        mock_firestore.get_device_users.return_value = ["user_1"]

        with patch(
            "services.alerts.get_firestore_service", return_value=mock_firestore
        ):
            from services.alerts import AlertService

            service = AlertService()
            result = service.evaluate_readings(
                "esp32_001",
                {
                    "ec": 1.9,
                    "water_temp": 21.0,
                },
            )

        assert result == []
        mock_firestore.create_alert.assert_not_called()
