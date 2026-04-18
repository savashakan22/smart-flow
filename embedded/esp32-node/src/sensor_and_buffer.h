#pragma once

#include <AHTxx.h>
#include <ArduinoJson.h>
#include <DallasTemperature.h>
#include <FS.h>
#include <LittleFS.h>
#include <OneWire.h>
#include <Wire.h>

#include "smartflow_types.h"

namespace smartflow {

class SensorSuite {
 public:
  SensorSuite()
      : oneWire_(kOneWirePin),
        waterThermometer_(&oneWire_),
        aht_(AHTXX_ADDRESS_X38, AHT2x_SENSOR) {}

  bool begin() {
    Wire.begin(kI2cSdaPin, kI2cSclPin);

    waterThermometer_.begin();
    waterThermometer_.setWaitForConversion(true);

    pinMode(kTdsAnalogPin, INPUT);
    pinMode(kWaterLevelPin, INPUT);
    pinMode(kLightAnalogPin, INPUT);

#if defined(ARDUINO_ARCH_ESP32)
    analogReadResolution(12);
    analogSetPinAttenuation(kTdsAnalogPin, ADC_11db);
    analogSetPinAttenuation(kWaterLevelPin, ADC_11db);
    analogSetPinAttenuation(kLightAnalogPin, ADC_11db);
#endif

    delay(kAhtWarmupMs);
    return true;
  }

  bool read(SensorReadings& readings) {
    const float airTemp = aht_.readTemperature();
    const float humidity = aht_.readHumidity();

    waterThermometer_.requestTemperatures();
    const float waterTemp = waterThermometer_.getTempCByIndex(0);
    if (waterTemp == DEVICE_DISCONNECTED_C || waterTemp <= kInvalidTemperature) {
      return false;
    }

    readings.airTemp = sanitizeAhtValue(airTemp, 18.0f);
    readings.humidity = sanitizeAhtValue(humidity, 50.0f);
    readings.waterTemp = waterTemp;

    const float tdsPpm = readTdsPpm(readings.waterTemp);
    readings.ec = tdsPpmToEc(tdsPpm);
    readings.waterLevel = readWaterLevelPercent();
    readings.light = readRelativeLight();
    return true;
  }

 private:
  OneWire oneWire_;
  DallasTemperature waterThermometer_;
  AHTxx aht_;

  float sanitizeAhtValue(float value, float fallback) {
    if (value == 255.0f || isnan(value) || isinf(value)) {
      return fallback;
    }
    return value;
  }

  uint16_t readAverageRaw(uint8_t pin) {
    uint32_t total = 0;
    for (uint8_t i = 0; i < kAnalogSamples; ++i) {
      total += analogRead(pin);
      delay(5);
    }
    return static_cast<uint16_t>(total / kAnalogSamples);
  }

  float readAverageVoltage(uint8_t pin) {
#if defined(ARDUINO_ARCH_ESP32)
    uint32_t totalMillivolts = 0;
    for (uint8_t i = 0; i < kAnalogSamples; ++i) {
      totalMillivolts += analogReadMilliVolts(pin);
      delay(5);
    }
    return (static_cast<float>(totalMillivolts) / kAnalogSamples) / 1000.0f;
#else
    return (readAverageRaw(pin) / 4095.0f) * 3.3f;
#endif
  }

  float readTdsPpm(float waterTempC) {
    const float voltage = readAverageVoltage(kTdsAnalogPin);
    const float compensationCoefficient = 1.0f + 0.02f * (waterTempC - 25.0f);
    const float compensationVoltage = voltage / compensationCoefficient;
    return (133.42f * compensationVoltage * compensationVoltage * compensationVoltage -
            255.86f * compensationVoltage * compensationVoltage +
            857.39f * compensationVoltage) *
           0.5f;
  }

  float tdsPpmToEc(float tdsPpm) {
    return max(0.0f, tdsPpm / kEcPpmPerMsCm);
  }

  float readWaterLevelPercent() {
    const float raw = static_cast<float>(readAverageRaw(kWaterLevelPin));
    const float normalized =
        (raw - kWaterLevelEmptyRaw) / (kWaterLevelFullRaw - kWaterLevelEmptyRaw);
    return constrain(normalized * 100.0f, 0.0f, 100.0f);
  }

  float readRelativeLight() {
    const float raw = static_cast<float>(readAverageRaw(kLightAnalogPin));
    const float normalized = (raw - kLdrDarkRaw) / (kLdrBrightRaw - kLdrDarkRaw);
    return constrain(normalized * 1000.0f, 0.0f, 1000.0f);
  }
};

class TelemetryBuffer {
 public:
  bool begin() { return LittleFS.begin(true); }

  bool append(const String& payload) {
    DynamicJsonDocument root(24576);
    JsonArray readings = load(root);
    readings.add(payload);

    while (readings.size() > kMaxBufferedReadings) {
      readings.remove(0);
    }

    return persist(root);
  }

  template <typename Publisher>
  bool flush(Publisher publisher) {
    DynamicJsonDocument root(24576);
    JsonArray readings = load(root);
    if (readings.isNull() || readings.size() == 0) {
      return true;
    }

    DynamicJsonDocument remaining(24576);
    JsonArray remainingReadings = remaining.to<JsonArray>();

    for (JsonVariant reading : readings) {
      const String payload = reading.as<String>();
      if (!publisher(payload)) {
        remainingReadings.add(payload);
      }
    }

    return persist(remaining);
  }

 private:
  JsonArray load(DynamicJsonDocument& root) {
    File file = LittleFS.open(kBufferFile, FILE_READ);
    if (!file) {
      return root.to<JsonArray>();
    }

    DeserializationError error = deserializeJson(root, file);
    file.close();
    if (error || !root.is<JsonArray>()) {
      root.clear();
      return root.to<JsonArray>();
    }

    return root.as<JsonArray>();
  }

  bool persist(const DynamicJsonDocument& root) {
    if (LittleFS.exists(kBufferFile)) {
      LittleFS.remove(kBufferFile);
    }

    File file = LittleFS.open(kBufferFile, FILE_WRITE);
    if (!file) {
      return false;
    }

    serializeJson(root, file);
    file.close();
    return true;
  }
};

}  // namespace smartflow
