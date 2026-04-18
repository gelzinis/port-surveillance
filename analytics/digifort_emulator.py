import os
import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, Request
from pydantic import BaseModel

app = FastAPI(title="Digifort Emulator", version="1.0.0")

LISTEN_PORT = int(os.getenv("LISTEN_PORT", "8080"))

events_log = []

class VirtualSensorEvent(BaseModel):
    camera_id: str
    camera_name: str = ""
    timestamp: str
    event_type: str
    object_id: str = ""
    object_class: str = ""
    direction: str = ""
    confidence: float = 0.0
    snapshot_url: str = ""
    zone_id: str = ""
    line_id: str = ""
    severity: str = "medium"

@app.get("/")
async def root():
    return {"service": "Digifort Virtual Sensor Emulator", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok", "events_received": len(events_log)}

@app.post("/api/virtual-sensor")
async def receive_virtual_sensor(event: VirtualSensorEvent):
    event_dict = event.dict()
    event_dict["received_at"] = datetime.utcnow().isoformat()
    events_log.append(event_dict)
    print(f"[DIGIFORT] Event received: {event.event_type} - {event.object_class} at {event.timestamp}")
    return {"status": "accepted", "message": "Event logged"}

@app.get("/api/events")
async def get_events(limit: int = 100):
    return events_log[-limit:]

@app.get("/api/events/count")
async def get_event_count():
    return {"total": len(events_log)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=LISTEN_PORT)