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

## Features

- **Object Detection**: Ships, boats, kayaks, rafts, unknown marine objects
- **Multi-Object Tracking**: Persistent track IDs with ByteTrack
- **Direction Analysis**: Entering, leaving, parallel, stationary
- **Virtual Lines & Zones**: Polygon zone entry, line crossing detection
- **Rule Engine**: Configurable rules with cooldown, severity, snapshots
- **False Alarm Reduction**: Minimum size filter, repeated detection confirmation
- **Digifort Integration**: HTTP REST + TCP virtual sensor
- **Demo Mode**: Works without real cameras using sample videos

## Quick Start

### Prerequisites
- Docker 24.0+
- Docker Compose 2.20+

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd port-surveillance
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker compose up --build
```

4. Access the dashboard:
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

### Default Credentials
- Username: `admin`
- Password: `admin` (change in production)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | postgresql://user:pass@database:5432/db |
| `REDIS_URL` | Redis connection | redis://redis:6379 |
| `SECRET_KEY` | JWT secret | changeme |
| `DEMO_MODE` | Enable demo mode | true |
| `YOLO_MODEL` | YOLO model size | yolov8n |
| `DIGIFORT_URL` | Digifort endpoint | http://localhost:8080 |

## Camera Configuration

Add cameras via the API or dashboard:

```bash
curl -X POST http://localhost:8000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "CAM-001",
    "name": "Port Entrance",
    "location": "North Pier",
    "stream_url": "rtsp://camera-ip:554/stream",
    "fps_target": 10,
    "is_demo": false
  }'
```

Or use the web UI at http://localhost:3000/cameras

## Demo Mode

When `DEMO_MODE=true`, the analytics worker looks for video files in `/app/samples/`. Place sample maritime videos named `{camera_id}.mp4` in that directory, or they will be loaded from any `.mp4` file found.

## Digifort Integration

### HTTP REST Integration
Configure Digifort webhook URL in settings. Events are sent as JSON:

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
The `digifort-emulator` service listens on port 8080 for testing.

## API Documentation

Interactive API docs available at http://localhost:8000/docs

### Key Endpoints

- `GET /api/cameras` - List cameras
- `POST /api/cameras` - Add camera
- `GET /api/events` - Query events
- `POST /api/detections` - Receive detections from worker
- `GET /api/analytics/overview` - Dashboard stats
- `GET /health` - Health check

## Development

### Folder Structure

```
/frontend         # React dashboard
/backend          # FastAPI backend
/analytics       # YOLO + tracking worker
/infra           # Docker configs, DB init
/scripts         # Utility scripts
/samples         # Demo video files
```

### Running Tests

```bash
# Backend tests
cd backend && python -m pytest

# Full system health check
curl http://localhost:8000/health
```

## Limitations (MVP)

- Basic tracking (no re-identification after long occlusion)
- Direction analysis based on simple motion vectors
- No_gpu = CPU only (slower processing)
- No AIS/IMO/MMSI fusion yet
- Basic false alarm filtering

## Roadmap

- [ ] TensorRT optimization for Jetson Orin
- [ ] Fine-tuned maritime detection model
- [ ] Thermal camera support
- [ ] AIS data fusion
- [ ] Advanced alert scoring
- [ ] Long-term analytics

## Security Notes

- Change `SECRET_KEY` in production
- Use strong database passwords
- Secure Redis with password
- Use TLS in production
- Restrict CORS origins

## Troubleshooting

### Services won't start
```bash
docker compose logs
```

### Stream connection fails
- Check camera IP/port is accessible
- Verify RTSP URL format
- Check network firewall

### No detections
- Verify YOLO model loaded
- Check confidence thresholds
- Ensure ROI covers water area

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact the development team.