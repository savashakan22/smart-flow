# Hydroponic Sensor Simulator

Virtual ESP32 devices that publish fake telemetry data to test the entire pipeline.

## Setup

```bash
pip install -r tools/requirements.txt
```

## Quick Start

```bash
# Basic usage (reads MQTT creds from .env)
python tools/simulator.py --devices sim_001,sim_002

# With 30-second interval for faster testing
python tools/simulator.py --devices sim_001,sim_002,sim_003 --interval 30

# Run for 10 minutes then stop
python tools/simulator.py --devices sim_001 --duration 10

# Register claim codes in Firebase before publishing
python tools/simulator.py --devices sim_001 --register-claims
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--devices` | Comma-separated device IDs | (required) |
| `--interval` | Seconds between readings | 900 (15 min) |
| `--duration` | Run for N minutes then stop | infinite |
| `--mqtt-ip` | MQTT broker IP | from .env |
| `--mqtt-port` | MQTT broker port | 1883 |
| `--register-claims` | Register claim codes in Firestore | false |

## Testing Workflow

1. **Start backend** (if not running):
   ```bash
   cd hydroponic-backend
   uvicorn main:app
   ```

2. **Start simulator**:
   ```bash
   python tools/simulator.py --devices test_001 --interval 30 --duration 5
   ```

3. **Verify data via REST API**:
   ```bash
   curl http://localhost:8000/sensors/test_001 -H "Authorization: Bearer <token>"
   ```

## Simulated Values

| Sensor | Range |
|--------|-------|
| EC | 1.0 - 2.5 mS/cm |
| Air Temp | 18 - 28°C |
| Humidity | 50 - 80% |
| Water Level | 30 - 95% |
| Water Temp | 18 - 25°C |
| Light | 0 - 1000 lux |

All values are randomly generated within these ranges.