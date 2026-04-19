#pragma once

#include <DNSServer.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiManager.h>

#include "smartflow_types.h"

namespace smartflow {

class ConfigStore {
 public:
  bool load(DeviceConfig& config) {
    Preferences prefs;
    if (!prefs.begin(kPrefsNamespace, true)) {
      return false;
    }

    config.deviceId = prefs.getString("device_id", defaultDeviceId());
    config.claimCode = prefs.getString("claim_code", defaultClaimCode());
    config.mqttHost = prefs.getString("mqtt_host", "");
    config.mqttPort = prefs.getUShort("mqtt_port", 1883);
    config.mqttUser = prefs.getString("mqtt_user", "");
    config.mqttPassword = prefs.getString("mqtt_pass", "");
    config.sleepSeconds = prefs.getUInt("sleep_s", kDefaultSleepSeconds);
    prefs.end();
    return true;
  }

  bool save(const DeviceConfig& config) {
    Preferences prefs;
    if (!prefs.begin(kPrefsNamespace, false)) {
      return false;
    }

    prefs.putString("device_id", config.deviceId);
    prefs.putString("claim_code", config.claimCode);
    prefs.putString("mqtt_host", config.mqttHost);
    prefs.putUShort("mqtt_port", config.mqttPort);
    prefs.putString("mqtt_user", config.mqttUser);
    prefs.putString("mqtt_pass", config.mqttPassword);
    prefs.putUInt("sleep_s", config.sleepSeconds);
    prefs.end();
    return true;
  }

  void clear() {
    Preferences prefs;
    if (prefs.begin(kPrefsNamespace, false)) {
      prefs.clear();
      prefs.end();
    }
  }
};

class OnboardingPortal {
 public:
  bool ensureConfigured(ConfigStore& store, DeviceConfig& config, bool forcePortal) {
    if (!config.deviceId.length()) {
      config.deviceId = defaultDeviceId();
    }
    if (!config.claimCode.length()) {
      config.claimCode = defaultClaimCode();
    }

    WiFiManager wm;
    wm.setConfigPortalBlocking(true);

    char mqttHost[64];
    char mqttPort[8];
    char mqttUser[32];
    char mqttPass[32];
    char sleepSeconds[12];
    char claimInfoHtml[192];

    copyString(config.mqttHost, mqttHost, sizeof(mqttHost));
    snprintf(mqttPort, sizeof(mqttPort), "%u", config.mqttPort);
    copyString(config.mqttUser, mqttUser, sizeof(mqttUser));
    copyString(config.mqttPassword, mqttPass, sizeof(mqttPass));
    snprintf(
        sleepSeconds,
        sizeof(sleepSeconds),
        "%lu",
        static_cast<unsigned long>(config.sleepSeconds));
    snprintf(
        claimInfoHtml,
        sizeof(claimInfoHtml),
        "<div style='padding:10px 0;font-size:16px;'><strong>Claim code:</strong> %s</div>",
        config.claimCode.c_str());

    WiFiManagerParameter claimInfoParam(claimInfoHtml);
    WiFiManagerParameter hostParam("mqtt_host", "MQTT host", mqttHost, sizeof(mqttHost));
    WiFiManagerParameter portParam("mqtt_port", "MQTT port", mqttPort, sizeof(mqttPort));
    WiFiManagerParameter userParam(
        "mqtt_user", "MQTT username", mqttUser, sizeof(mqttUser));
    WiFiManagerParameter passParam(
        "mqtt_pass", "MQTT password", mqttPass, sizeof(mqttPass));
    WiFiManagerParameter sleepParam(
        "sleep_s", "Sleep seconds", sleepSeconds, sizeof(sleepSeconds));

    wm.addParameter(&claimInfoParam);
    wm.addParameter(&hostParam);
    wm.addParameter(&portParam);
    wm.addParameter(&userParam);
    wm.addParameter(&passParam);
    wm.addParameter(&sleepParam);

    const bool needsPortal = forcePortal || !config.isProvisioned();
    bool success = true;
    if (needsPortal) {
      String apName = "SmartFlow-" + config.deviceId.substring(config.deviceId.length() - 6);
      success = wm.startConfigPortal(apName.c_str());
    } else {
      success = wm.autoConnect();
    }

    if (!success) {
      return false;
    }

    config.mqttHost = hostParam.getValue();
    config.mqttPort = static_cast<uint16_t>(atoi(portParam.getValue()));
    config.mqttUser = userParam.getValue();
    config.mqttPassword = passParam.getValue();
    config.sleepSeconds = static_cast<uint32_t>(strtoul(sleepParam.getValue(), nullptr, 10));

    if (config.mqttPort == 0) {
      config.mqttPort = 1883;
    }
    if (config.sleepSeconds == 0) {
      config.sleepSeconds = kDefaultSleepSeconds;
    }

    return store.save(config);
  }

  void reset(ConfigStore& store) {
    WiFiManager wm;
    wm.resetSettings();
    store.clear();
  }

 private:
  void copyString(const String& source, char* target, size_t size) {
    source.toCharArray(target, size);
    target[size - 1] = '\0';
  }
};

}  // namespace smartflow
