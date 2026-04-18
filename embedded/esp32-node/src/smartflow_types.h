#pragma once

#include <Arduino.h>

namespace smartflow {

#ifndef SMARTFLOW_CRYPTO_MASTER_KEY_HEX
#define SMARTFLOW_CRYPTO_MASTER_KEY_HEX \
  "00112233445566778899AABBCCDDEEFF00112233445566778899AABBCCDDEEFF"
#endif

constexpr char kPrefsNamespace[] = "smartflow";
constexpr char kBufferFile[] = "/telemetry.json";
constexpr char kCryptoMasterKeyHex[] = SMARTFLOW_CRYPTO_MASTER_KEY_HEX;
constexpr size_t kMaxBufferedReadings = 48;
constexpr size_t kMasterKeyLength = 32;
constexpr size_t kTagLength = 16;
constexpr uint32_t kDefaultSleepSeconds = 900;
constexpr int kFactoryResetPin = 0;
constexpr int kSerialBaud = 115200;
constexpr uint16_t kMqttPacketSize = 1024;
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

struct DeviceConfig {
  String deviceId;
  String claimCode;
  String mqttHost;
  uint16_t mqttPort = 1883;
  String mqttUser;
  String mqttPassword;
  uint32_t sleepSeconds = kDefaultSleepSeconds;

  bool isProvisioned() const { return mqttHost.length() > 0; }
};

struct SensorReadings {
  float ec = 0.0f;
  float airTemp = 0.0f;
  float humidity = 0.0f;
  float waterLevel = 0.0f;
  float waterTemp = 0.0f;
  float light = 0.0f;
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
