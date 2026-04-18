# Port Surveillance AI Platform

Modular AI-powered video analytics platform for monitoring port access zones and detecting approaching vessels in real-time. Designed for maritime environments with challenging conditions (waves, fog, rain, glare, distant objects).

## Architecture

```mermaid
graph TB
    subgraph External
        CCTV[IP Cameras RTSP]
        VMS[Digifort VMS]
    end

    subgraph Docker_Network
        DB[(PostgreSQL)]
        REDIS[(Redis)]
        
        subgraph API_Gateway
            FE[Frontend React]
            BE[Backend FastAPI]
        end
        
        subgraph Analytics
            AW[Analytics Worker<br/>YOLO + Tracking]
        end
        
        EM[Digifort Emulator]
    end
    
    CCTV --> AW
    AW --> BE
    BE --> DB
    BE --> REDIS
    AW --> REDIS
    FE --> BE
    AW --> EM
    EM --> VMS
```

## Services

| Service | Description | Port |
|---------|-------------|------|
| `frontend` | React dashboard for operators | 3000 |
| `backend-api` | FastAPI REST API | 8000 |
| `database` | PostgreSQL for metadata | 5432 |
| `redis` | Message broker / cache | 6379 |
| `analytics-worker` | YOLO + tracking pipeline | - |
| `digifort-emulator` | Digifort mock receiver | 8080 |

## Requirements

- Docker 24.0+
- Docker Compose 2.20+
- 4GB+ RAM (8GB+ recommended for AI processing)
- PostgreSQL client (optional for debugging)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/gelzinis/port-surveillance.git
cd port-surveillance
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` file with your settings:

```bash
# Database
DB_USER=portvision
DB_PASSWORD=changeme
DATABASE_URL=postgresql://portvision:changeme@database:5432/port_surveillance

# Redis
REDIS_URL=redis://redis:6379

# Security - CHANGE THIS IN PRODUCTION!
SECRET_KEY=your-secret-key-here

# Demo mode (set to false for real cameras)
DEMO_MODE=true

# YOLO model (yolov8n, yolov8s, yolov8m)
YOLO_MODEL=yolov8n
```

### 3. Start the system

```bash
docker compose up --build
```

### 4. Access the dashboard

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Default Credentials

After first run, you can register a user via the API or use the system in demo mode without authentication.

## Adding Cameras

### Via Web UI

1. Go to http://localhost:3000
2. Navigate to **Cameras** tab
3. Click **Add Camera**
4. Fill in the details:
   - Camera ID: Unique identifier (e.g., `CAM-001`)
   - Name: Display name (e.g., "Port Entrance North")
   - Location: Physical location
   - Stream URL: RTSP URL (e.g., `rtsp://192.168.1.100:554/stream`)
   - FPS Target: Target frames per second (default: 10)
   - Demo Mode: Check for testing without real camera

### Via API

```bash
curl -X POST http://localhost:8000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "CAM-001",
    "name": "Port Entrance",
    "location": "North Pier",
    "stream_url": "rtsp://192.168.1.100:554/stream",
    "fps_target": 10,
    "is_demo": false
  }'
```

## Demo Mode

When `DEMO_MODE=true` in `.env`, the system runs without real cameras:

1. Place sample videos in `samples/` folder named `{camera_id}.mp4`
2. Or the system will use any `.mp4` file found in samples directory
3. Demo cameras are automatically created on first run

## Configuration Options

### YOLO Models

| Model | Size | Speed | Accuracy |
|-------|------|-------|---------|
| `yolov8n` | 6MB | Fastest | Lowest |
| `yolov8s` | 22MB | Fast | Medium |
| `yolov8m` | 52MB | Medium | High |

### Camera Settings

- **ROI (Region of Interest)**: Define area to analyze
- **Horizon Line**: Filter distant objects above horizon
- **Minimum Object Size**: Filter small objects/noise
- **Confidence Threshold**: Detection sensitivity (0.0-1.0)

### Rule Configuration

Create detection rules via API or UI:

```bash
curl -X POST http://localhost:8000/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "rule_id": "RULE-001",
    "name": "Ship Detection",
    "event_type": "object_detected",
    "object_classes": ["ship", "boat"],
    "confidence_threshold": 0.6,
    "enabled": true,
    "cooldown_seconds": 60,
    "severity": "high",
    "take_snapshot": true
  }'
```

## Digifort Integration

### HTTP Integration

Configure webhook URL in settings. Events are sent as JSON:

```json
{
  "camera_id": "CAM-PORT-01",
  "timestamp": "2025-01-15T10:30:00Z",
  "event_type": "zone_entry",
  "object_id": "OBJ-001",
  "object_class": "ship",
  "direction": "entering_port",
  "confidence": 0.85,
  "snapshot_url": "http://api/snapshots/xxx.jpg"
}
```

### TCP Virtual Sensor

The emulator listens on port 8080:
- For testing, connect to `http://localhost:8080`
- Endpoint: `POST /api/virtual-sensor`

### Enable Integration

```bash
DIGIFORT_ENABLED=true
DIGIFORT_URL=http://your-digifort-server:8080
```

## API Documentation

Interactive documentation available at http://localhost:8000/docs

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| GET | `/api/cameras` | List all cameras |
| POST | `/api/cameras` | Add new camera |
| GET | `/api/events` | Query events |
| GET | `/api/analytics/overview` | Dashboard stats |
| GET | `/health` | System health check |
| GET | `/api/rules` | List detection rules |

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs

# Common issues:
# - Port already in use: Change port in docker-compose.yml
# - Database connection: Wait for DB to initialize
```

### No detections

1. Verify camera is connected: `docker compose logs analytics-worker`
2. Check YOLO model loaded
3. Verify RTSP URL is correct
4. Check confidence thresholds

### High CPU usage

- Reduce FPS target in camera settings
- Use smaller YOLO model (yolov8n)
- Enable ROI to reduce frame area

### Database issues

```bash
# Reset database
docker compose down -v
docker compose up -d
```

## Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` to random string
- [ ] Use strong database password
- [ ] Enable Redis authentication
- [ ] Configure firewall rules
- [ ] Use HTTPS in production
- [ ] Restrict CORS origins

### Performance Tuning

For high traffic:
- Increase worker count
- Use GPU for YOLO (TensorRT)
- Optimize ROI areas
- Adjust detection intervals

### Backup

```bash
# Backup database
docker compose exec database pg_dump -U portvision port_surveillance > backup.sql

# Backup snapshots
docker compose cp analytics-worker:/app/snapshots ./snapshots-backup
```

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- GitHub Issues: https://github.com/gelzinis/port-surveillance/issues