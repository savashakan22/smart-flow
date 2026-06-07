# Smart-Flow

Smart-Flow is an IoT smart hydroponics platform that connects ESP32 sensor nodes, a FastAPI backend, and a React dashboard. The system ingests encrypted MQTT telemetry, stores time-series data in InfluxDB, manages device metadata in Firestore, and surfaces live readings through a web UI.

## Table of Contents
- [Project overview](#project-overview)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Frontend setup](#frontend-setup)
- [Backend setup](#backend-setup)
- [Embedded firmware setup](#embedded-firmware-setup)
- [Sensor simulator](#sensor-simulator)
- [Configuration reference](#configuration-reference)
- [Testing and linting](#testing-and-linting)

## Project overview
- **Hydroponic frontend**: React + Vite dashboard for device monitoring, alerts, and configuration.
- **Hydroponic backend**: FastAPI service that validates Firebase auth, decrypts MQTT telemetry, and serves REST APIs.
- **Embedded firmware**: ESP32 Arduino firmware that publishes encrypted telemetry, provisioning, and status updates.
- **Tools**: Python sensor simulator for end-to-end pipeline testing without hardware.

## Architecture
<img width="3480" height="2327" alt="rapor3_arch_trans" src="https://github.com/user-attachments/assets/b995bae8-b68a-457d-be31-0a6d0f9cad0e" />
1. ESP32 nodes publish encrypted telemetry to MQTT topics (`group3/telemetry/<device_id>`).
2. The backend subscribes, decrypts, validates sequence numbers, and writes readings to InfluxDB.
3. Firestore stores device registry, claims, and configuration data.
4. The React frontend reads from the backend API and Firebase Auth to display real-time data.

## Repository structure
```
.
├── hydroponic-frontend/   # React + Vite dashboard
├── hydroponic-backend/    # FastAPI service, MQTT subscriber, tests
├── embedded/esp32-node/   # ESP32 firmware (PlatformIO)
├── tools/                 # Telemetry simulator
└── firebase.json          # Firebase hosting config
```

## Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+ and pip
- **PlatformIO** CLI (for ESP32 firmware)
- **MQTT broker** reachable by the backend and devices
- **Firebase project** (Auth + Firestore)
- **InfluxDB 3** instance for time-series storage

## Frontend setup
```bash
cd hydroponic-frontend
npm install
npm run dev
```

### Frontend environment variables
Create `hydroponic-frontend/.env.local` with:
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

## Backend setup
```bash
cd hydroponic-backend
pip install -r requirements.txt
uvicorn main:app --reload
```

For production-style hosting, use `uvicorn main:app --host 0.0.0.0 --port $PORT` (see `Procfile`).

### Backend environment variables
The backend loads configuration from `hydroponic-backend/.env` (see `core/config.py`).

Required:
```bash
INFLUXDB_TOKEN=...
INFLUX_URL=...
MQTT_IP=...
MQTT_USERNAME=...
MQTT_PASSWORD=...
MQTT_CRYPTO_MASTER_KEY_HEX=...
```

Common optional settings:
```bash
INFLUX_ORG=Dev
INFLUX_BUCKET=time-series
MQTT_PORT=1883
MQTT_TOPIC_PREFIX=group3
MQTT_ALLOW_LEGACY_SEQUENCE_REPLAY=false
MQTT_CONFIG_CACHE_TTL_SECONDS=600
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
FIREBASE_CREDENTIALS_JSON=...
FIREBASE_CREDENTIALS_BASE64=...
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://smart-flow-edc55.web.app
```

## Embedded firmware setup
The ESP32 firmware lives in `embedded/esp32-node` and uses PlatformIO.

```bash
cd embedded/esp32-node
pio run -e esp32dev
pio run -e esp32dev -t upload
pio device monitor -b 115200
```

Available environments:
- `esp32dev` / `esp32dev-mock` (production topic prefix)
- `esp32dev-dev` / `esp32dev-dev-mock` (uses `group3/dev` prefix)

Make sure the firmware constant `SMARTFLOW_CRYPTO_MASTER_KEY_HEX` matches the backend `MQTT_CRYPTO_MASTER_KEY_HEX`.

## Sensor simulator
The simulator publishes synthetic telemetry to MQTT for testing without hardware.

```bash
pip install -r tools/requirements.txt
python tools/simulator.py --devices sim_001,sim_002
```

Useful flags:
```bash
python tools/simulator.py --devices sim_001 --interval 30 --duration 10
python tools/simulator.py --devices sim_001 --register-claims
```

## Configuration reference
- **MQTT topics**
  - `group3/provisioning/<device_id>`
  - `group3/telemetry/<device_id>`
  - `group3/status/<device_id>`
- **Encryption**: AES-GCM envelope with sequence-based nonce (see `mqtt/subscriber.py`).
- **Firestore**: device registry, claim codes, and configuration.
- **InfluxDB**: time-series storage for telemetry.

## Testing and linting
Frontend:
```bash
cd hydroponic-frontend
npm run lint
npm run build
```

Backend:
```bash
cd hydroponic-backend
pytest
```
