#pragma once

#include <ArduinoJson.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <mbedtls/gcm.h>
#include <mbedtls/md.h>
#include <time.h>

#include "smartflow_types.h"

namespace smartflow {

class SequenceManager {
 public:
  bool begin() {
    Preferences prefs;
    if (!prefs.begin(kPrefsNamespace, false)) {
      return false;
    }

    const uint32_t storedPrefix = prefs.getUInt("sec_epoch", 0);
    const uint32_t nextStoredPrefix = storedPrefix + 1;
    const time_t now = time(nullptr);
    const uint32_t clockPrefix =
        now >= kMinimumValidUnixTime ? static_cast<uint32_t>(now) : 0;

    sessionPrefix_ =
        clockPrefix > nextStoredPrefix ? clockPrefix : nextStoredPrefix;
    prefs.putUInt("sec_epoch", sessionPrefix_);
    prefs.end();

    provisioningCounter_ = 0;
    statusCounter_ = 0;
    telemetryCounter_ = 0;
    return true;
  }

  uint64_t nextProvisioningSequence() { return nextSequence(provisioningCounter_); }
  uint64_t nextStatusSequence() { return nextSequence(statusCounter_); }
  uint64_t nextTelemetrySequence() { return nextSequence(telemetryCounter_); }
  uint32_t sessionPrefix() const { return sessionPrefix_; }

 private:
  uint64_t nextSequence(uint16_t& counter) {
    counter = static_cast<uint16_t>(counter + 1);
    return (static_cast<uint64_t>(sessionPrefix_) << 16) | counter;
  }

  uint32_t sessionPrefix_ = 0;
  uint16_t provisioningCounter_ = 0;
  uint16_t statusCounter_ = 0;
  uint16_t telemetryCounter_ = 0;
};

class CryptoSuite {
 public:
  bool begin(const String& deviceId) {
    deviceId_ = deviceId;
    if (!parseMasterKey()) {
      return false;
    }
    return true;
  }

  bool protect(
      const char* messageType,
      uint64_t sequence,
      const JsonDocument& plaintext,
      String& protectedPayload) {
    String plaintextJson;
    serializeJson(plaintext, plaintextJson);

    uint8_t topicKey[kMasterKeyLength];
    if (!deriveTopicKey(topicKey, sizeof(topicKey))) {
      return false;
    }

    uint8_t nonce[12];
    if (!buildNonce(messageType, sequence, nonce, sizeof(nonce))) {
      return false;
    }

    const String aadString = buildAad(messageType, sequence);
    const uint8_t* input = reinterpret_cast<const uint8_t*>(plaintextJson.c_str());
    const size_t inputLength = plaintextJson.length();
    uint8_t* ciphertext = static_cast<uint8_t*>(malloc(inputLength));
    if (ciphertext == nullptr) {
      return false;
    }

    uint8_t tag[kTagLength];
    mbedtls_gcm_context context;
    mbedtls_gcm_init(&context);

    bool success = false;
    if (mbedtls_gcm_setkey(
            &context, MBEDTLS_CIPHER_ID_AES, topicKey, kMasterKeyLength * 8) == 0) {
      const int result = mbedtls_gcm_crypt_and_tag(
          &context,
          MBEDTLS_GCM_ENCRYPT,
          inputLength,
          nonce,
          sizeof(nonce),
          reinterpret_cast<const uint8_t*>(aadString.c_str()),
          aadString.length(),
          input,
          ciphertext,
          sizeof(tag),
          tag);
      success = (result == 0);
    }

    mbedtls_gcm_free(&context);
    if (!success) {
      free(ciphertext);
      return false;
    }

    DynamicJsonDocument envelope(1024);
    envelope["seq"] = static_cast<uint64_t>(sequence);
    envelope["ciphertext"] = bytesToHex(ciphertext, inputLength);
    envelope["tag"] = bytesToHex(tag, sizeof(tag));

    free(ciphertext);
    serializeJson(envelope, protectedPayload);
    return true;
  }

 private:
  String deviceId_;
  uint8_t masterKey_[kMasterKeyLength] = {0};
  bool masterKeyReady_ = false;

  bool parseMasterKey() {
    if (masterKeyReady_) {
      return true;
    }

    const size_t expectedHexLength = kMasterKeyLength * 2;
    if (strlen(kCryptoMasterKeyHex) != expectedHexLength) {
      Serial.println("Invalid crypto master key length.");
      return false;
    }

    for (size_t i = 0; i < kMasterKeyLength; ++i) {
      int high = hexToNibble(kCryptoMasterKeyHex[i * 2]);
      int low = hexToNibble(kCryptoMasterKeyHex[i * 2 + 1]);
      if (high < 0 || low < 0) {
        Serial.println("Invalid crypto master key hex.");
        return false;
      }
      masterKey_[i] = static_cast<uint8_t>((high << 4) | low);
    }

    masterKeyReady_ = true;
    return true;
  }

  bool deriveTopicKey(uint8_t* outKey, size_t outLength) {
    const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    if (info == nullptr || outLength < 32) {
      return false;
    }

    return mbedtls_md_hmac(
               info,
               masterKey_,
               sizeof(masterKey_),
               reinterpret_cast<const uint8_t*>(deviceId_.c_str()),
               deviceId_.length(),
               outKey) == 0;
  }

  String buildAad(const char* messageType, uint64_t sequence) {
    char sequenceBuffer[24];
    snprintf(
        sequenceBuffer,
        sizeof(sequenceBuffer),
        "%llu",
        static_cast<unsigned long long>(sequence));
    return String(messageType) + ":" + deviceId_ + ":" + String(sequenceBuffer);
  }

  bool buildNonce(const char* messageType, uint64_t sequence, uint8_t* nonce, size_t length) {
    if (length != 12) {
      return false;
    }

    const uint32_t namespaceCode = namespaceToCode(messageType);
    if (namespaceCode == 0) {
      return false;
    }

    nonce[0] = static_cast<uint8_t>((namespaceCode >> 24) & 0xFF);
    nonce[1] = static_cast<uint8_t>((namespaceCode >> 16) & 0xFF);
    nonce[2] = static_cast<uint8_t>((namespaceCode >> 8) & 0xFF);
    nonce[3] = static_cast<uint8_t>(namespaceCode & 0xFF);
    for (size_t i = 0; i < 8; ++i) {
      nonce[4 + i] = static_cast<uint8_t>((sequence >> (56 - (i * 8))) & 0xFF);
    }
    return true;
  }

  uint32_t namespaceToCode(const char* messageType) {
    if (strcmp(messageType, "telemetry") == 0) {
      return 1;
    }
    if (strcmp(messageType, "provisioning") == 0) {
      return 2;
    }
    if (strcmp(messageType, "status") == 0) {
      return 3;
    }
    return 0;
  }

  String bytesToHex(const uint8_t* data, size_t length) {
    static const char kHexChars[] = "0123456789abcdef";
    String hex;
    hex.reserve(length * 2);
    for (size_t i = 0; i < length; ++i) {
      hex += kHexChars[(data[i] >> 4) & 0x0F];
      hex += kHexChars[data[i] & 0x0F];
    }
    return hex;
  }

  int hexToNibble(char value) {
    if (value >= '0' && value <= '9') {
      return value - '0';
    }
    if (value >= 'a' && value <= 'f') {
      return value - 'a' + 10;
    }
    if (value >= 'A' && value <= 'F') {
      return value - 'A' + 10;
    }
    return -1;
  }
};

class BackendClient {
 public:
  BackendClient() : mqttClient_(wifiClient_) {}

  bool begin(const DeviceConfig& config) {
    config_ = config;
    mqttClient_.setServer(config.mqttHost.c_str(), config.mqttPort);
    mqttClient_.setBufferSize(kMqttPacketSize);
    return crypto_.begin(config.deviceId);
  }

  bool connectWifi() {
    if (WiFi.status() == WL_CONNECTED) {
      return true;
    }

    WiFi.mode(WIFI_STA);
    const uint32_t deadline = millis() + 30000;
    while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
      delay(250);
    }

    if (WiFi.status() == WL_CONNECTED) {
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      waitForClockSync();
    }
    return WiFi.status() == WL_CONNECTED;
  }

  bool connectMqtt() {
    if (mqttClient_.connected()) {
      return true;
    }

    String willPayload;
    if (!buildProtectedStatusEnvelope(false, willPayload)) {
      return false;
    }

    const String statusTopic = topicFor("status");
    return mqttClient_.connect(
        config_.deviceId.c_str(),
        config_.mqttUser.c_str(),
        config_.mqttPassword.c_str(),
        statusTopic.c_str(),
        1,
        true,
        willPayload.c_str());
  }

  bool buildProtectedTelemetryEnvelope(
      const SensorReadings& readings,
      String& protectedPayload) {
    DynamicJsonDocument doc(768);
    doc["device_id"] = config_.deviceId;
    const String timestamp = isoTimestamp();
    if (timestamp.length() > 0) {
      doc["timestamp"] = timestamp;
    }
    doc["ec"] = round2(readings.ec);
    doc["air_temp"] = round2(readings.airTemp);
    doc["humidity"] = round2(readings.humidity);
    doc["water_level"] = round2(readings.waterLevel);
    doc["water_temp"] = round2(readings.waterTemp);
    doc["light"] = round2(readings.light);
    doc["sensor_ok"] = readings.sensorOk();
    doc["sensor_error_count"] = readings.sensorErrorCount();
    doc["aht_ok"] = readings.ahtOk;
    doc["ds18b20_ok"] = readings.ds18b20Ok;
    doc["tds_ok"] = readings.tdsOk;
    doc["water_level_ok"] = readings.waterLevelOk;
    doc["light_ok"] = readings.lightOk;

    JsonArray failedSensors = doc["failed_sensors"].to<JsonArray>();
    if (!readings.ahtOk) {
      failedSensors.add("aht25");
    }
    if (!readings.ds18b20Ok) {
      failedSensors.add("ds18b20");
    }
    if (!readings.tdsOk) {
      failedSensors.add("tds");
    }
    if (!readings.waterLevelOk) {
      failedSensors.add("water_level");
    }
    if (!readings.lightOk) {
      failedSensors.add("light");
    }

    return crypto_.protect("telemetry", sequences_.nextTelemetrySequence(), doc, protectedPayload);
  }

  bool publishProvisioning() {
    DynamicJsonDocument doc(512);
    doc["device_id"] = config_.deviceId;
    doc["claim_code"] = config_.claimCode;

    String protectedPayload;
    if (!crypto_.protect(
            "provisioning",
            sequences_.nextProvisioningSequence(),
            doc,
            protectedPayload)) {
      return false;
    }

    return mqttClient_.publish(
        topicFor("provisioning").c_str(),
        protectedPayload.c_str(),
        true);
  }

  bool publishStatus(bool online) {
    String protectedPayload;
    if (!buildProtectedStatusEnvelope(online, protectedPayload)) {
      return false;
    }

    return mqttClient_.publish(
        topicFor("status").c_str(), protectedPayload.c_str(), true);
  }

  bool publishTelemetry(const SensorReadings& readings) {
    String protectedPayload;
    if (!buildProtectedTelemetryEnvelope(readings, protectedPayload)) {
      return false;
    }

    return mqttClient_.publish(
        topicFor("telemetry").c_str(), protectedPayload.c_str(), false);
  }

  bool publishBufferedPayload(const String& payload) {
    return mqttClient_.publish(
        topicFor("telemetry").c_str(), payload.c_str(), false);
  }

  bool beginSecuritySession() { return sequences_.begin(); }
  uint32_t securitySessionPrefix() const { return sequences_.sessionPrefix(); }

  int mqttState() { return mqttClient_.state(); }

  void settleAndDisconnect() {
    if (!mqttClient_.connected()) {
      return;
    }

    mqttClient_.loop();
    delay(kMqttPublishDrainMs);
    mqttClient_.loop();
    mqttClient_.disconnect();
    delay(100);
  }

 private:
  WiFiClient wifiClient_;
  PubSubClient mqttClient_;
  DeviceConfig config_;
  SequenceManager sequences_;
  CryptoSuite crypto_;

  bool buildProtectedStatusEnvelope(bool online, String& protectedPayload) {
    DynamicJsonDocument doc(256);
    doc["device_id"] = config_.deviceId;
    doc["online"] = online;

    return crypto_.protect("status", sequences_.nextStatusSequence(), doc, protectedPayload);
  }

  String topicFor(const char* messageType) {
    return String(kMqttTopicPrefix) + "/" + messageType + "/" + config_.deviceId;
  }

  bool isClockSynchronized() {
    const time_t now = time(nullptr);
    return now >= kMinimumValidUnixTime;
  }

  void waitForClockSync() {
    const uint32_t deadline = millis() + kClockSyncTimeoutMs;
    while (!isClockSynchronized() && millis() < deadline) {
      delay(250);
    }
  }

  String isoTimestamp() {
    time_t now = time(nullptr);
    if (now < kMinimumValidUnixTime) {
      return String();
    }

    struct tm utcTime {};
    gmtime_r(&now, &utcTime);

    char buffer[25];
    strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &utcTime);
    return String(buffer);
  }

  float round2(float value) { return roundf(value * 100.0f) / 100.0f; }
};

}  // namespace smartflow
