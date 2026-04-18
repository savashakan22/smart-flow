#include <Arduino.h>

#include "config_and_onboarding.h"
#include "security_and_backend.h"
#include "sensor_and_buffer.h"

namespace smartflow {

RTC_DATA_ATTR uint32_t bootCount = 0;

SensorSuite sensorSuite;
ConfigStore configStore;
TelemetryBuffer telemetryBuffer;
BackendClient backendClient;
OnboardingPortal onboardingPortal;

bool factoryResetRequested() {
  pinMode(kFactoryResetPin, INPUT_PULLUP);
  delay(20);
  return digitalRead(kFactoryResetPin) == LOW;
}

void bufferCurrentReading(const SensorReadings& readings) {
  String protectedPayload;
  if (backendClient.buildProtectedTelemetryEnvelope(readings, protectedPayload)) {
    telemetryBuffer.append(protectedPayload);
  }
}

void goToDeepSleep(uint32_t sleepSeconds) {
  Serial.printf("Sleeping for %lu seconds\n", static_cast<unsigned long>(sleepSeconds));
  esp_sleep_enable_timer_wakeup(static_cast<uint64_t>(sleepSeconds) * 1000000ULL);
  esp_deep_sleep_start();
}

}  // namespace smartflow

void setup() {
  using namespace smartflow;

  Serial.begin(kSerialBaud);
  delay(100);
  ++bootCount;

  DeviceConfig config;
  configStore.load(config);

  if (factoryResetRequested()) {
    Serial.println("Factory reset requested. Clearing Wi-Fi and custom config.");
    onboardingPortal.reset(configStore);
    delay(500);
    ESP.restart();
  }

  if (!telemetryBuffer.begin()) {
    Serial.println("LittleFS mount failed.");
  }

  if (!sensorSuite.begin()) {
    Serial.println("Sensor initialization failed.");
    goToDeepSleep(config.sleepSeconds);
  }

  if (!onboardingPortal.ensureConfigured(configStore, config, false)) {
    Serial.println("Captive portal setup failed.");
    goToDeepSleep(config.sleepSeconds);
  }

  if (!backendClient.begin(config) || !backendClient.beginSecuritySession()) {
    Serial.println("Security initialization failed.");
    goToDeepSleep(config.sleepSeconds);
  }

  if (!backendClient.connectWifi() || !backendClient.connectMqtt()) {
    Serial.println("Network or MQTT connection failed.");
    SensorReadings readings;
    if (sensorSuite.read(readings)) {
      bufferCurrentReading(readings);
    }
    goToDeepSleep(config.sleepSeconds);
  }

  backendClient.publishProvisioning();
  backendClient.publishStatus(true, "boot");
  telemetryBuffer.flush(
      [&](const String& payload) { return backendClient.publishBufferedPayload(payload); });

  SensorReadings current;
  if (sensorSuite.read(current)) {
    if (!backendClient.publishTelemetry(current)) {
      Serial.println("Telemetry publish failed, buffering payload.");
      bufferCurrentReading(current);
    }
  } else {
    Serial.println("Sensor read failed.");
  }

  backendClient.publishStatus(false, "sleep");
  goToDeepSleep(config.sleepSeconds);
}

void loop() {}
