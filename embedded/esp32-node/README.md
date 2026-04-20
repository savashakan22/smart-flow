# Smart-Flow ESP32 Node

This firmware scaffold implements the embedded requirements from `Group3_MidReport2.pdf` and connects directly to the current backend contract in this repository.

## What is included

- Captive portal onboarding for Wi-Fi and MQTT settings
- Persistent config in NVS (`Preferences`)
- MQTT provisioning, telemetry, and status topics
- AES-GCM protected MQTT payloads with device-derived keys
- Replay protection through monotonic message sequences
- Local buffering to LittleFS for up to 48 failed telemetry packets
- 15 minute deep-sleep cycle by default
- Sensor integration scaffold for the actual hardware list used in the project

## Hardware mapping in the current code

The firmware is now wired around these components:

- `ESP32-WROOM-32D`
- `DS18B20` for water temperature
- `AHT25` for air temperature and humidity
- `Arduino TDS Meter v1.0` for solution concentration
- `Arduino Water Level Sensor`
- `Basic LDR Light Sensor`

Default pin assumptions in `src/main.cpp`:

- `GPIO4`: DS18B20 data
- `GPIO21`: I2C SDA for AHT25
- `GPIO22`: I2C SCL for AHT25
- `GPIO34`: TDS analog output
- `GPIO35`: water level analog output
- `GPIO32`: LDR analog output

These are just compile-time defaults. If your wiring is different, update the constants near the top of `src/main.cpp`.

## MQTT contract

The firmware publishes to these topics:

- `sf/provisioning/<device_id>`: sent after onboarding and on boot so the backend can register the node and refresh the claim code
- `sf/telemetry/<device_id>`: sensor payload compatible with `hydroponic-backend/mqtt/subscriber.py`
- `sf/status/<device_id>`: health and availability information

All three payload types are wrapped in an encrypted envelope:

- `seq`
- `ciphertext`
- `tag`

`seq` is also used to deterministically derive the AES-GCM nonce together with the MQTT namespace.

The backend only accepts packets that:

1. decrypt correctly
2. match the expected topic/device context
3. carry a fresh sequence number

Telemetry payload fields:

- `ec`
- `air_temp`
- `humidity`
- `water_level`
- `water_temp`
- `light`
- `timestamp`
- `device_id`

Provisioning payload fields:

- `device_id`
- `claim_code`

Status payload fields:

- `device_id`
- `online`

## Hardware assumptions

The code now targets your named sensors directly, but three values still depend on installation-specific calibration:

- `ec`: estimated from the Arduino TDS Meter reading
- `water_level`: normalized from analog calibration points
- `light`: relative light value derived from the LDR analog range

Before field use, you should calibrate:

1. TDS dry/wet and solution conversion factor for your nutrient solution
2. Water level empty/full ADC values
3. LDR dark/bright ADC values

The MQTT and buffering logic can stay as-is while you tune those constants.

## Mock telemetry mode

For backend, MQTT, and encryption testing without physical sensors, the project includes a
second PlatformIO environment:

- `esp32dev`: normal firmware that reads real sensors
- `esp32dev-mock`: test firmware that publishes plausible mock telemetry values

The mock build keeps the same Wi-Fi, onboarding, MQTT, encryption, buffering, and sleep flow.
Only the sensor readings are replaced with generated values, so it is useful for checking that:

1. provisioning reaches the backend
2. encrypted MQTT payloads can be decrypted
3. telemetry appears in InfluxDB / Firestore

Example commands:

```powershell
pio run -e esp32dev-mock
pio run -e esp32dev-mock -t upload
pio device monitor -b 115200
```

## First boot

On first power-up the node opens a captive portal named like `SmartFlow-1A2B3C`.

After provisioning:

- after normal boot, press `BOOT` within about 3 seconds: opens the captive portal without clearing saved settings
- after normal boot, hold `BOOT` within that same window for about 2 seconds: clears saved Wi-Fi and custom config, then restarts into onboarding

The portal collects:

- MQTT host
- MQTT port
- MQTT username
- MQTT password
- sleep interval
- claim code display

Wi-Fi credentials are handled by WiFiManager and custom fields are stored in `Preferences`.

## Claim flow

The node generates a deterministic claim code from the ESP32 MAC address. The backend stores that code when it receives the provisioning message. After that, the dashboard can use the existing `/devices/claim` endpoint.

The captive portal now shows the claim code directly during onboarding. That makes local setup easier, but for a finished product you may still want a label or QR code on the device.

Recommended options:

- print the claim code or a QR code on the device or packaging
- show the claim code in the backend dashboard after the first provisioning message arrives
- expose the claim code in the captive portal during first setup

If none of these handoff paths exist, the user will not know which claim code to enter.

## Security setup

The firmware and backend must share the same 32-byte master key in hex form.

- Backend env: `MQTT_CRYPTO_MASTER_KEY_HEX`
- Firmware constant: `SMARTFLOW_CRYPTO_MASTER_KEY_HEX` in `src/main.cpp`

Before flashing real devices, replace the placeholder key in the firmware with the same value you configure on the backend.
