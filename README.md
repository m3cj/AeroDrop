# AeroDrop 🚁

**Autonomous Delivery Drone Operations & Ground Control Platform**

AeroDrop is an aerospace-grade Ground Control Station (GCS) and mission planner designed for autonomous drone delivery operations. It delivers real-time 60 FPS telemetry visualization, tactical geospatial tracking with smoothed heading interpolation, aviation-standard meteorological monitoring (METAR & wind rose), automated 6-point flight feasibility validation, and live camera feed integration.

---

## 🌟 Key Features

- **🎮 Real-Time Telemetry & HUD Gauges**: 60 FPS canvas artificial horizon, VSI vertical speed indicator, quad-motor ESC RPM visualizers, GNSS coordinates, and power draw monitoring.
- **🗺️ Tactical Geospatial Map**: Leaflet-powered tracking with geofence perimeter rings, breadcrumb flight trail, shortest-path angle lerp with angular deadband filtering (zero-jitter pointer), and interactive drop target designation.
- **🌤️ Aviation Meteorological Standard**: Real-time wind rose vector dial ($360^\circ$ bearing, $\text{m/s}$ & $\text{knots}$, gust factor), atmospheric temperature & dew point ($T_d$), altimeter pressure ($\text{QNH } 1013\text{ hPa}$), density altitude ($\text{DA}$), decoded METAR string, and $\text{VFR}$ / $\text{IFR}$ flight go/no-go safety gates.
- **🛡️ Automated 6-Point Feasibility Engine**: Pre-flight verification checking payload mass, geofence radius, battery reserve margins, time-of-flight (TOF), and airspace weather before arming.
- **📡 MAVLink UDP & Mock Telemetry**: Native MAVLink protocol support via `pymavlink` (`udpin:0.0.0.0:14550`) with built-in autonomous flight physics simulation for testing without physical hardware.
- **📹 Live Camera Feed**: Low-latency HLS video player with HUD overlays and fallback simulation stream.
- **🛠️ Simulator Tweaks & Sound Synth**: Interactive scenario injection (wind turbulence, GPS loss, low battery) and synthesized avionics Web Audio engine.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Backend** | FastAPI + asyncio | High-performance async Python REST & WebSocket API |
| **Telemetry & Protocols** | pymavlink | MAVLink UDP drone communication |
| **Database & ORM** | SQLAlchemy async + SQLite / PostgreSQL | Async persistent mission & settings storage |
| **Frontend** | React 18 + Vite | Modern reactive single-page dashboard |
| **Styling** | Vanilla CSS + Tailwind CSS | Custom deep charcoal aerospace glassmorphism & HUD tokens |
| **State Management** | Zustand | Multi-store reactive telemetry & mission pipeline |
| **Geospatial Mapping** | Leaflet + CartoDB Dark | Smooth tactical mapping & waypoint plotting |
| **Meteorology** | WeatherAPI.com | Real-time atmospheric conditions & forecasts |
| **Audio** | Web Audio API | Synthetic avionics oscillators & UI sound effects |
| **Containerization** | Docker + Docker Compose | Full-stack production container deployment |

---

## 📋 Prerequisites

Ensure you have the following installed on your system:
- **Python**: `3.10` or higher
- **Node.js**: `18.x` or higher (`npm` included)
- **Git**

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository

```bash
git clone https://github.com/m3cj/AeroDrop.git
cd AeroDrop
```

### 2. Backend Setup

Open a terminal in the project root:

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
# On Windows (PowerShell):
python -m venv .venv
.venv\Scripts\activate

# On macOS/Linux:
# python3 -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI backend server (runs at http://127.0.0.1:8000)
uvicorn app.main:app --reload --port 8000
```

> **Note**: The backend starts in **Mock Mode** by default — an autonomous delivery mission simulator will be available immediately without requiring a physical drone.

### 3. Frontend Setup

Open a second terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server (runs at http://localhost:5173 or 5174)
npm run dev
```

Open your browser and navigate to: **`http://localhost:5173`** (or the port displayed in your terminal).

---

## 🐳 Full Stack Deployment with Docker Compose

You can launch the entire stack (FastAPI backend + Nginx frontend + PostgreSQL) using Docker:

```bash
# Copy example environment file
cp .env.example .env

# Build and start all containers
docker compose up --build
```

Access the dashboard at **`http://localhost:80`**.

---

## ⚙️ Configuration & Environment

Configuration can be customized via `.env` or dynamically at runtime via the **Settings Panel** in the dashboard UI.

| Parameter | Default | Description |
|---|---|---|
| `HOME_LAT` / `HOME_LON` | `12.8406`, `80.1534` | Home base station GPS coordinates (default: VIT Chennai) |
| `MOCK_MODE` | `true` | Set to `false` when connecting to a real drone via MAVLink |
| `MAVLINK_CONNECTION_STRING` | `udpin:0.0.0.0:14550` | UDP port for incoming MAVLink telemetry stream |
| `WEATHER_API_KEY` | `""` (mock fallback) | Optional WeatherAPI.com API key for live meteorological feeds |
| `JETSON_HLS_URL` | `http://localhost:8554/stream.m3u8` | MediaMTX / RTSP-to-HLS camera stream URL |
| `MAX_PAYLOAD_KG` | `2.0` | Drone maximum safe payload capacity |
| `MAX_RANGE_KM` | `5.0` | Maximum operational geofence radius |
| `MAX_WIND_SPEED_MS` | `10.0` | Maximum allowable wind speed safety threshold |

---

## 🛰️ Connecting Physical Hardware

### Connecting a Real Drone (Pixhawk / ArduPilot / PX4)
1. Open the dashboard and click the **Settings (⚙️)** button in the top navigation bar.
2. Toggle **Mock Telemetry Mode** to **Disabled**.
3. Verify the **MAVLink Connection String** matches your ground station telemetry link (default: `udpin:0.0.0.0:14550`).
4. Power on your drone's telemetry radio or companion computer (e.g., Raspberry Pi / Jetson running MAVLink router).
5. The dashboard header will display `MAVLink: 5Hz` and live GPS coordinates once telemetry frames arrive.

### Live Camera Stream (MediaMTX / RTSP)
1. Install [MediaMTX](https://github.com/bluenviron/mediamtx) on your camera streaming host.
2. In `mediamtx.yml`, route your drone's RTSP video camera feed.
3. In AeroDrop Settings, set the **Live Stream URL** to your HLS endpoint (e.g., `http://<ip>:8554/drone/stream.m3u8`).

---

## 📁 Repository Structure

```
AeroDrop/
├── backend/                     # FastAPI Python backend
│   ├── app/
│   │   ├── api/                 # REST API endpoints (missions, settings, weather)
│   │   ├── models/              # SQLAlchemy database models
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── services/            # MAVLink, physics mock, validation engine, weather
│   │   ├── utils/               # Haversine calculation, battery physics model
│   │   ├── ws/                  # Real-time WebSocket broadcasting handler
│   │   ├── config.py            # Global application settings
│   │   ├── database.py          # Database session management
│   │   └── main.py              # Application entry point & lifespan
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Backend container recipe
├── frontend/                    # React 18 + Vite frontend
│   ├── src/
│   │   ├── assets/              # Drone SVGs, branding icons, demo media
│   │   ├── components/          # UI components
│   │   │   ├── common/          # DroneLogo, TweaksPanel, Toast notifications
│   │   │   ├── layout/          # Aerospace Header and View router
│   │   │   ├── map/             # MapView (tactical Leaflet tracking & smooth LERP)
│   │   │   ├── mission/         # MissionDrawer, MissionDetailsPanel, ActiveMissionPanel
│   │   │   ├── settings/        # SettingsPage & hardware configuration
│   │   │   ├── telemetry/       # StatusPanel (Weather Standard & Avionics), DroneDataList
│   │   │   ├── video/           # VideoPlayer HUD feed
│   │   │   └── weather/         # WeatherBadge & WeatherCard
│   │   ├── hooks/               # useWebSocket, useTelemetry smooth interpolator
│   │   ├── lib/                 # AudioService synth, formatters, Axios API client
│   │   └── stores/              # Zustand stores (telemetry, missions, settings)
│   ├── package.json             # Frontend dependencies
│   ├── vite.config.js           # Vite development server & proxy config
│   └── Dockerfile               # Frontend container recipe
├── docker-compose.yml           # Full-stack Docker service definitions
├── .env.example                 # Example configuration template
├── .gitignore                   # Git ignore specifications
├── LICENSE                      # MIT License
└── README.md                    # Project documentation
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
