#include <Arduino.h>

#include "config_and_onboarding.h"
#include "security_and_backend.h"
#include "sensor_and_buffer.h"

namespace smartflow {

SensorSuite sensorSuite;
ConfigStore configStore;
TelemetryBuffer telemetryBuffer;
BackendClient backendClient;
OnboardingPortal onboardingPortal;
ThresholdConfig thresholdConfig;

enum class BootButtonAction {
  None,
  ForcePortal,
  FactoryReset,
};

void logDeviceIdentity(const DeviceConfig& config) {
  Serial.printf("Device ID: %s\n", config.deviceId.c_str());
  Serial.printf("Claim code: %s\n", config.claimCode.c_str());
  Serial.printf(
      "MQTT target: %s:%u\n",
      config.mqttHost.c_str(),
      static_cast<unsigned int>(config.mqttPort));
  Serial.printf(
      "Provisioning pending: %s\n", config.provisioningPending ? "yes" : "no");
}

void logReadings(const SensorReadings& readings, const char* label) {
  Serial.printf(
      "%s ec=%.2f air_temp=%.2f humidity=%.2f water_level=%.2f water_temp=%.2f light=%.2f sensor_ok=%s alarm=%s\n",
      label,
      readings.ec,
      readings.airTemp,
      readings.humidity,
      readings.waterLevel,
      readings.waterTemp,
      readings.light,
      readings.sensorOk() ? "yes" : "no",
      readings.alarmActive ? "yes" : "no");
  if (!readings.sensorOk()) {
    Serial.print("Sensor failures:");
    if (!readings.ahtOk) {
      Serial.print(" aht25");
    }
    if (!readings.ds18b20Ok) {
      Serial.print(" ds18b20");
    }
    if (!readings.tdsOk) {
      Serial.print(" tds");
    }
    if (!readings.waterLevelOk) {
      Serial.print(" water_level");
    }
    if (!readings.lightOk) {
      Serial.print(" light");
    }
    Serial.println();
  }
  if (readings.alarmActive) {
    Serial.printf("Alarm reasons: %s\n", readings.alarmReasons.c_str());
  }
}

const char* mqttStateLabel(int state) {
  switch (state) {
    case -4:
      return "MQTT_CONNECTION_TIMEOUT";
    case -3:
      return "MQTT_CONNECTION_LOST";
    case -2:
      return "MQTT_CONNECT_FAILED";
    case -1:
      return "MQTT_DISCONNECTED";
    case 0:
      return "MQTT_CONNECTED";
    case 1:
      return "MQTT_CONNECT_BAD_PROTOCOL";
    case 2:
      return "MQTT_CONNECT_BAD_CLIENT_ID";
    case 3:
      return "MQTT_CONNECT_UNAVAILABLE";
    case 4:
      return "MQTT_CONNECT_BAD_CREDENTIALS";
    case 5:
      return "MQTT_CONNECT_UNAUTHORIZED";
    default:
      return "MQTT_STATE_UNKNOWN";
  }
}

BootButtonAction detectBootButtonAction() {
  pinMode(kFactoryResetPin, INPUT_PULLUP);
  const uint32_t windowStart = millis();
  bool previousState = (digitalRead(kFactoryResetPin) == LOW);
  uint32_t pressedAt = 0;

  while (millis() - windowStart < kBootActionWindowMs) {
    const bool isPressed = (digitalRead(kFactoryResetPin) == LOW);

    if (isPressed && !previousState) {
      delay(kPortalButtonDebounceMs);
      if (digitalRead(kFactoryResetPin) == LOW) {
        pressedAt = millis();
      }
    }

    if (isPressed && pressedAt != 0 && millis() - pressedAt >= kFactoryResetHoldMs) {
      return BootButtonAction::FactoryReset;
    }

    if (!isPressed && previousState && pressedAt != 0) {
      if (millis() - pressedAt >= kPortalButtonDebounceMs) {
        return BootButtonAction::ForcePortal;
      }
      pressedAt = 0;
    }

    previousState = isPressed;
    delay(10);
  }

  return BootButtonAction::None;
}

void setupAlarmLed() {
  pinMode(kAlarmLedPin, OUTPUT);
  digitalWrite(kAlarmLedPin, LOW);
}

void setAlarmLed(bool active) { digitalWrite(kAlarmLedPin, active ? HIGH : LOW); }

void addRangeAlarm(
    SensorReadings& readings,
    float value,
    const MetricThreshold& threshold,
    const char* lowReason,
    const char* highReason) {
  if (value < threshold.min) {
    readings.addAlarmReason(lowReason);
  } else if (value > threshold.max) {
    readings.addAlarmReason(highReason);
  }
}

void evaluateAlarm(SensorReadings& readings, const ThresholdConfig& thresholds) {
  readings.clearAlarm();

  if (!readings.ahtOk) {
    readings.addAlarmReason("sensor_aht25_failed");
  }
  if (!readings.ds18b20Ok) {
    readings.addAlarmReason("sensor_ds18b20_failed");
  }
  if (!readings.tdsOk) {
    readings.addAlarmReason("sensor_tds_failed");
  }
  if (!readings.waterLevelOk) {
    readings.addAlarmReason("sensor_water_level_failed");
  }
  if (!readings.lightOk) {
    readings.addAlarmReason("sensor_light_failed");
  }

  addRangeAlarm(readings, readings.ec, thresholds.ec, "ec_low", "ec_high");
  addRangeAlarm(
      readings,
      readings.waterTemp,
      thresholds.waterTemp,
      "water_temp_low",
      "water_temp_high");
  addRangeAlarm(
      readings,
      readings.airTemp,
      thresholds.airTemp,
      "air_temp_low",
      "air_temp_high");
  addRangeAlarm(
      readings,
      readings.humidity,
      thresholds.humidity,
      "humidity_low",
      "humidity_high");
  addRangeAlarm(
      readings,
      readings.waterLevel,
      thresholds.waterLevel,
      "water_level_low",
      "water_level_high");
  addRangeAlarm(readings, readings.light, thresholds.light, "light_low", "light_high");
}

bool readTelemetrySample(SensorReadings& readings) {
  if (!sensorSuite.read(readings)) {
    return false;
  }
  evaluateAlarm(readings, thresholdConfig);
  setAlarmLed(readings.alarmActive);
  return true;
}

void bufferCurrentReading(const SensorReadings& readings) {
  String protectedPayload;
  if (backendClient.buildProtectedTelemetryEnvelope(readings, protectedPayload)) {
    telemetryBuffer.append(protectedPayload);
  }
}

void goToDeepSleep(uint32_t sleepSeconds) {
  setAlarmLed(false);
  Serial.printf("Sleeping for %lu seconds\n", static_cast<unsigned long>(sleepSeconds));
  esp_sleep_enable_timer_wakeup(static_cast<uint64_t>(sleepSeconds) * 1000000ULL);
  esp_deep_sleep_start();
}

}  // namespace smartflow

void setup() {
  using namespace smartflow;

  Serial.begin(kSerialBaud);
  delay(100);
  setupAlarmLed();
  DeviceConfig config;
  configStore.load(config);
  configStore.loadThresholdConfig(thresholdConfig);
  logDeviceIdentity(config);
  Serial.println(
      "After boot, press BOOT within 3s for portal or hold about 2s for factory reset.");

  const BootButtonAction bootButtonAction = detectBootButtonAction();
  const bool forcePortal = bootButtonAction == BootButtonAction::ForcePortal;

  if (bootButtonAction == BootButtonAction::FactoryReset) {
    Serial.println("Factory reset requested. Clearing Wi-Fi and custom config.");
    onboardingPortal.reset(configStore);
    delay(500);
    ESP.restart();
  }
  if (forcePortal) {
    Serial.println("BOOT short press detected. Opening captive portal.");
  }

  if (!telemetryBuffer.begin()) {
    Serial.println("LittleFS mount failed.");
  }

  if (!sensorSuite.begin()) {
    Serial.println("Sensor initialization failed.");
    setAlarmLed(true);
    delay(500);
    goToDeepSleep(config.sleepSeconds);
  }

  if (!onboardingPortal.ensureConfigured(configStore, config, forcePortal)) {
    Serial.println("Captive portal setup failed.");
    goToDeepSleep(config.sleepSeconds);
  }
  logDeviceIdentity(config);

  if (!backendClient.begin(config)) {
    Serial.println("Security initialization failed.");
    goToDeepSleep(config.sleepSeconds);
  }

  if (!backendClient.connectWifi()) {
    Serial.printf("Wi-Fi connection failed. status=%d\n", static_cast<int>(WiFi.status()));
    if (!backendClient.beginSecuritySession()) {
      Serial.println("Security session initialization failed.");
      goToDeepSleep(config.sleepSeconds);
    }
    SensorReadings readings;
    if (readTelemetrySample(readings)) {
      logReadings(readings, "Buffering offline telemetry:");
      bufferCurrentReading(readings);
    }
    goToDeepSleep(config.sleepSeconds);
  }

  if (!backendClient.beginSecuritySession()) {
    Serial.println("Security session initialization failed.");
    goToDeepSleep(config.sleepSeconds);
  }
  Serial.printf(
      "Security session prefix: %lu\n",
      static_cast<unsigned long>(backendClient.securitySessionPrefix()));

  if (!backendClient.connectMqtt()) {
    const int mqttState = backendClient.mqttState();
    Serial.printf(
        "MQTT connection failed. state=%d (%s)\n",
        mqttState,
        mqttStateLabel(mqttState));
    Serial.printf(
        "MQTT auth presence: username=%s password=%s\n",
        config.mqttUser.length() > 0 ? "set" : "empty",
        config.mqttPassword.length() > 0 ? "set" : "empty");
    SensorReadings readings;
    if (readTelemetrySample(readings)) {
      logReadings(readings, "Buffering offline telemetry:");
      bufferCurrentReading(readings);
    }
    goToDeepSleep(config.sleepSeconds);
  }

  if (config.provisioningPending) {
    const bool provisioningPublished = backendClient.publishProvisioning();
    Serial.printf(
        "Provisioning publish %s\n", provisioningPublished ? "succeeded" : "failed");
    if (provisioningPublished) {
      config.provisioningPending = false;
      configStore.setProvisioningPending(false);
    }
  } else {
    Serial.println("Provisioning skipped for this wake cycle.");
  }

  const bool onlineStatusPublished = backendClient.publishStatus(true);
  Serial.printf(
      "Online status publish %s\n", onlineStatusPublished ? "succeeded" : "failed");

  if (backendClient.syncThresholdConfig(thresholdConfig)) {
    configStore.saveThresholdConfig(thresholdConfig);
    Serial.println("Threshold config synced and saved.");
  } else {
    Serial.println("Threshold config not received; using saved/default thresholds.");
  }

  const bool flushSucceeded = telemetryBuffer.flush([&](const String& payload) {
    const bool published = backendClient.publishBufferedPayload(payload);
    Serial.printf("Buffered telemetry publish %s\n", published ? "succeeded" : "failed");
    return published;
  });
  Serial.printf("Buffered telemetry flush %s\n", flushSucceeded ? "completed" : "failed");

  SensorReadings current;
  if (readTelemetrySample(current)) {
    logReadings(current, "Telemetry sample:");
    if (!backendClient.publishTelemetry(current)) {
      Serial.println("Telemetry publish failed, buffering payload.");
      bufferCurrentReading(current);
    } else {
      Serial.println("Telemetry publish succeeded.");
    }
  } else {
    Serial.println("Sensor read failed.");
  }

  const bool offlineStatusPublished = backendClient.publishStatus(false);
  Serial.printf(
      "Offline status publish %s\n", offlineStatusPublished ? "succeeded" : "failed");
  Serial.println("Waiting briefly for MQTT packets to flush before sleep.");
  backendClient.settleAndDisconnect();
  goToDeepSleep(config.sleepSeconds);
}

void loop() {}
