#pragma once

#include <Arduino.h>

namespace smartflow {

#ifndef SMARTFLOW_CRYPTO_MASTER_KEY_HEX
#define SMARTFLOW_CRYPTO_MASTER_KEY_HEX \
  "00112233445566778899AABBCCDDEEFF00112233445566778899AABBCCDDEEFF"
#endif

#ifndef SMARTFLOW_MQTT_TOPIC_PREFIX
#define SMARTFLOW_MQTT_TOPIC_PREFIX "group3"
#endif

constexpr char kPrefsNamespace[] = "smartflow";
constexpr char kBufferFile[] = "/telemetry.json";
constexpr char kCryptoMasterKeyHex[] = SMARTFLOW_CRYPTO_MASTER_KEY_HEX;
constexpr char kMqttTopicPrefix[] = SMARTFLOW_MQTT_TOPIC_PREFIX;
constexpr size_t kMaxBufferedReadings = 48;
constexpr size_t kMasterKeyLength = 32;
constexpr size_t kTagLength = 16;
constexpr uint32_t kDefaultSleepSeconds = 900;
constexpr int kFactoryResetPin = 0;
constexpr int kSerialBaud = 115200;
constexpr uint32_t kPortalButtonDebounceMs = 30;
constexpr uint32_t kBootActionWindowMs = 3000;
constexpr uint32_t kFactoryResetHoldMs = 2000;
constexpr uint32_t kMqttPublishDrainMs = 750;
constexpr time_t kMinimumValidUnixTime = 1704067200;  // 2024-01-01T00:00:00Z
constexpr uint32_t kClockSyncTimeoutMs = 10000;
constexpr uint32_t kConfigSyncWaitMs = 1500;
constexpr uint32_t kConfigSyncPollMs = 20;
constexpr uint16_t kMqttPacketSize = 1024;
constexpr uint8_t kAlarmLedPin = 25;
constexpr uint8_t kOneWirePin = 4;
constexpr uint8_t kI2cSdaPin = 21;
constexpr uint8_t kI2cSclPin = 22;
constexpr uint8_t kTdsAnalogPin = 34;
constexpr uint8_t kWaterLevelPin = 35;
constexpr uint8_t kLightAnalogPin = 32;
constexpr uint8_t kAnalogSamples = 12;
constexpr uint32_t kAhtWarmupMs = 100;
constexpr float kInvalidTemperature = -127.0f;
constexpr float kEcPpmPerMsCm = 500.0f;
constexpr float kWaterLevelEmptyRaw = 900.0f;
constexpr float kWaterLevelFullRaw = 2600.0f;
constexpr float kLdrDarkRaw = 400.0f;
constexpr float kLdrBrightRaw = 3200.0f;

struct MetricThreshold {
  float min = 0.0f;
  float max = 0.0f;

  MetricThreshold() = default;
  MetricThreshold(float minValue, float maxValue) : min(minValue), max(maxValue) {}
};

struct ThresholdConfig {
  MetricThreshold ec = {1.2f, 2.4f};
  MetricThreshold waterTemp = {18.0f, 24.0f};
  MetricThreshold airTemp = {18.0f, 27.0f};
  MetricThreshold humidity = {45.0f, 75.0f};
  MetricThreshold waterLevel = {25.0f, 100.0f};
  MetricThreshold light = {100.0f, 900.0f};
};

struct DeviceConfig {
  String deviceId;
  String claimCode;
  String mqttHost;
  uint16_t mqttPort = 1883;
  String mqttUser;
  String mqttPassword;
  uint32_t sleepSeconds = kDefaultSleepSeconds;
  bool provisioningPending = true;

  bool isProvisioned() const { return mqttHost.length() > 0; }
};

struct SensorReadings {
  float ec = 0.0f;
  float airTemp = 0.0f;
  float humidity = 0.0f;
  float waterLevel = 0.0f;
  float waterTemp = 0.0f;
  float light = 0.0f;
  bool ahtOk = true;
  bool ds18b20Ok = true;
  bool tdsOk = true;
  bool waterLevelOk = true;
  bool lightOk = true;
  bool alarmActive = false;
  String alarmReasons;

  bool sensorOk() const {
    return ahtOk && ds18b20Ok && tdsOk && waterLevelOk && lightOk;
  }

  uint8_t sensorErrorCount() const {
    return static_cast<uint8_t>((ahtOk ? 0 : 1) + (ds18b20Ok ? 0 : 1) +
                                (tdsOk ? 0 : 1) + (waterLevelOk ? 0 : 1) +
                                (lightOk ? 0 : 1));
  }

  void clearAlarm() {
    alarmActive = false;
    alarmReasons = "";
  }

  void addAlarmReason(const char* reason) {
    if (alarmReasons.length() > 0) {
      alarmReasons += ",";
    }
    alarmReasons += reason;
    alarmActive = true;
  }
};

inline String chipIdentifier() {
  const uint64_t raw = ESP.getEfuseMac();
  char buffer[13];
  snprintf(
      buffer,
      sizeof(buffer),
      "%04X%08X",
      static_cast<uint16_t>(raw >> 32),
      static_cast<uint32_t>(raw));
  return String(buffer);
}

inline String defaultDeviceId() { return "sf-" + chipIdentifier().substring(6); }

inline String defaultClaimCode() { return "SF-" + chipIdentifier().substring(6); }

}  // namespace smartflow
