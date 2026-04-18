import os
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

import redis.asyncio as redis
import asyncpg
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from jose import JWTError, jwt
from passlib.context import CryptContext
import uvicorn

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://portvision:changeme@database:5432/port_surveillance")
SECRET_KEY = os.getenv("SECRET_KEY", "changeme-secret-key")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

engine = create_engine(DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

redis_client = None

app = FastAPI(title="Port Surveillance API", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255))
    stream_url = Column(String(500))
    enabled = Column(Boolean, default=True)
    fps_target = Column(Integer, default=10)
    resolution_width = Column(Integer, default=1920)
    resolution_height = Column(Integer, default=1080)
    roi_x = Column(Integer, default=0)
    roi_y = Column(Integer, default=0)
    roi_width = Column(Integer, default=1920)
    roi_height = Column(Integer, default=1080)
    horizon_line = Column(Integer, default=0)
    min_object_size = Column(Integer, default=50)
    confidence_threshold = Column(Float, default=0.5)
    is_demo = Column(Boolean, default=False)
    status = Column(String(20), default="offline")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    polygon_points = Column(JSON)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class VirtualLine(Base):
    __tablename__ = "virtual_lines"
    id = Column(Integer, primary_key=True, index=True)
    line_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    start_point = Column(JSON)
    end_point = Column(JSON)
    direction = Column(String(20), default="both")
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Rule(Base):
    __tablename__ = "rules"
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    event_type = Column(String(50))
    object_classes = Column(JSON)
    confidence_threshold = Column(Float, default=0.5)
    enabled = Column(Boolean, default=True)
    cooldown_seconds = Column(Integer, default=60)
    severity = Column(String(20), default="medium")
    take_snapshot = Column(Boolean, default=True)
    webhook_enabled = Column(Boolean, default=False)
    digifort_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class DetectedObject(Base):
    __tablename__ = "detected_objects"
    id = Column(Integer, primary_key=True, index=True)
    object_id = Column(String(50), nullable=False)
    track_id = Column(String(50))
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    object_class = Column(String(50))
    confidence = Column(Float)
    bbox_x = Column(Integer)
    bbox_y = Column(Integer)
    bbox_width = Column(Integer)
    bbox_height = Column(Integer)
    direction = Column(String(20))
    speed_estimate = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), unique=True, nullable=False)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    rule_id = Column(Integer, ForeignKey("rules.id"))
    tracker_id = Column(String(50))
    object_class = Column(String(50))
    confidence = Column(Float)
    direction = Column(String(20))
    speed_estimate = Column(Float)
    bbox_x = Column(Integer)
    bbox_y = Column(Integer)
    bbox_width = Column(Integer)
    bbox_height = Column(Integer)
    zone_id = Column(String(50))
    line_id = Column(String(50))
    snapshot_path = Column(String(500))
    event_type = Column(String(50))
    severity = Column(String(20))
    raw_payload = Column(JSON)
    digifort_status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class IntegrationLog(Base):
    __tablename__ = "integration_logs"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    integration_type = Column(String(50))
    status = Column(String(20))
    response_body = Column(Text)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return redis_client

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return payload

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class CameraCreate(BaseModel):
    camera_id: str
    name: str
    location: Optional[str] = None
    stream_url: Optional[str] = None
    fps_target: int = 10
    resolution_width: int = 1920
    resolution_height: int = 1080
    roi_x: int = 0
    roi_y: int = 0
    roi_width: int = 1920
    roi_height: int = 1080
    horizon_line: int = 0
    min_object_size: int = 50
    confidence_threshold: float = 0.5
    is_demo: bool = False

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    stream_url: Optional[str] = None
    enabled: Optional[bool] = None
    fps_target: Optional[int] = None
    resolution_width: Optional[int] = None
    resolution_height: Optional[int] = None
    roi_x: Optional[int] = None
    roi_y: Optional[int] = None
    roi_width: Optional[int] = None
    roi_height: Optional[int] = None
    horizon_line: Optional[int] = None
    min_object_size: Optional[int] = None
    confidence_threshold: Optional[float] = None

class CameraResponse(BaseModel):
    id: int
    camera_id: str
    name: str
    location: Optional[str]
    stream_url: Optional[str]
    enabled: bool
    fps_target: int
    resolution_width: int
    resolution_height: int
    is_demo: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ZoneCreate(BaseModel):
    zone_id: str
    name: str
    camera_id: int
    polygon_points: List[List[int]]
    enabled: bool = True

class ZoneResponse(BaseModel):
    id: int
    zone_id: str
    name: str
    camera_id: int
    polygon_points: List[List[int]]
    enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class VirtualLineCreate(BaseModel):
    line_id: str
    name: str
    camera_id: int
    start_point: List[int]
    end_point: List[int]
    direction: str = "both"
    enabled: bool = True

class VirtualLineResponse(BaseModel):
    id: int
    line_id: str
    name: str
    camera_id: int
    start_point: List[int]
    end_point: List[int]
    direction: str
    enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class RuleCreate(BaseModel):
    rule_id: str
    name: str
    camera_id: Optional[int] = None
    event_type: str
    object_classes: List[str]
    confidence_threshold: float = 0.5
    enabled: bool = True
    cooldown_seconds: int = 60
    severity: str = "medium"
    take_snapshot: bool = True
    webhook_enabled: bool = False
    digifort_enabled: bool = False

class RuleResponse(BaseModel):
    id: int
    rule_id: str
    name: str
    camera_id: Optional[int]
    event_type: str
    object_classes: List[str]
    confidence_threshold: float
    enabled: bool
    cooldown_seconds: int
    severity: str
    take_snapshot: bool
    webhook_enabled: bool
    digifort_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    camera_id: int
    object_class: str
    confidence: float
    direction: Optional[str] = None
    speed_estimate: Optional[float] = None
    bbox_x: int
    bbox_y: int
    bbox_width: int
    bbox_height: int
    zone_id: Optional[str] = None
    line_id: Optional[str] = None
    event_type: str
    severity: str = "medium"
    raw_payload: Optional[dict] = None

class EventResponse(BaseModel):
    id: int
    event_id: str
    camera_id: int
    object_class: str
    confidence: float
    direction: Optional[str]
    speed_estimate: Optional[float]
    bbox_x: int
    bbox_y: int
    bbox_width: int
    bbox_height: int
    zone_id: Optional[str]
    line_id: Optional[str]
    event_type: str
    severity: str
    snapshot_path: Optional[str]
    digifort_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DetectionPayload(BaseModel):
    camera_id: str
    frame_id: str
    detections: List[dict]
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    database: str
    redis: str
    analytics_workers: int

@app.on_event("startup")
async def startup():
    global redis_client
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
    except Exception as e:
        print(f"Redis connection failed: {e}")

@app.get("/health")
async def health_check():
    db_status = "ok"
    redis_status = "ok"
    try:
        SessionLocal().execute("SELECT 1")
    except:
        db_status = "error"
    try:
        r = await get_redis()
        await r.ping()
    except:
        redis_status = "error"
    return {"status": "ok", "database": db_status, "redis": redis_status}

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    hashed = pwd_context.hash(user.password)
    db_user = User(username=user.username, email=user.email, hashed_password=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    access_token = create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
async def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/cameras", response_model=List[CameraResponse])
async def get_cameras(db: Session = Depends(get_db)):
    cameras = db.query(Camera).all()
    return cameras

@app.post("/api/cameras", response_model=CameraResponse)
async def create_camera(camera: CameraCreate, db: Session = Depends(get_db)):
    db_camera = Camera(
        camera_id=camera.camera_id,
        name=camera.name,
        location=camera.location,
        stream_url=camera.stream_url,
        fps_target=camera.fps_target,
        resolution_width=camera.resolution_width,
        resolution_height=camera.resolution_height,
        roi_x=camera.roi_x,
        roi_y=camera.roi_y,
        roi_width=camera.roi_width,
        roi_height=camera.roi_height,
        horizon_line=camera.horizon_line,
        min_object_size=camera.min_object_size,
        confidence_threshold=camera.confidence_threshold,
        is_demo=camera.is_demo,
    )
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@app.get("/api/cameras/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@app.put("/api/cameras/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: str, camera: CameraUpdate, db: Session = Depends(get_db)):
    db_camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    for key, value in camera.dict(exclude_unset=True).items():
        setattr(db_camera, key, value)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@app.delete("/api/cameras/{camera_id}")
async def delete_camera(camera_id: str, db: Session = Depends(get_db)):
    db_camera = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    db.delete(db_camera)
    db.commit()
    return {"message": "Camera deleted"}

@app.get("/api/zones", response_model=List[ZoneResponse])
async def get_zones(db: Session = Depends(get_db)):
    zones = db.query(Zone).all()
    return zones

@app.post("/api/zones", response_model=ZoneResponse)
async def create_zone(zone: ZoneCreate, db: Session = Depends(get_db)):
    db_zone = Zone(
        zone_id=zone.zone_id,
        name=zone.name,
        camera_id=zone.camera_id,
        polygon_points=zone.polygon_points,
        enabled=zone.enabled,
    )
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone

@app.get("/api/virtual-lines", response_model=List[VirtualLineResponse])
async def get_virtual_lines(db: Session = Depends(get_db)):
    lines = db.query(VirtualLine).all()
    return lines

@app.post("/api/virtual-lines", response_model=VirtualLineResponse)
async def create_virtual_line(line: VirtualLineCreate, db: Session = Depends(get_db)):
    db_line = VirtualLine(
        line_id=line.line_id,
        name=line.name,
        camera_id=line.camera_id,
        start_point=line.start_point,
        end_point=line.end_point,
        direction=line.direction,
        enabled=line.enabled,
    )
    db.add(db_line)
    db.commit()
    db.refresh(db_line)
    return db_line

@app.get("/api/rules", response_model=List[RuleResponse])
async def get_rules(db: Session = Depends(get_db)):
    rules = db.query(Rule).all()
    return rules

@app.post("/api/rules", response_model=RuleResponse)
async def create_rule(rule: RuleCreate, db: Session = Depends(get_db)):
    db_rule = Rule(
        rule_id=rule.rule_id,
        name=rule.name,
        camera_id=rule.camera_id,
        event_type=rule.event_type,
        object_classes=rule.object_classes,
        confidence_threshold=rule.confidence_threshold,
        enabled=rule.enabled,
        cooldown_seconds=rule.cooldown_seconds,
        severity=rule.severity,
        take_snapshot=rule.take_snapshot,
        webhook_enabled=rule.webhook_enabled,
        digifort_enabled=rule.digifort_enabled,
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@app.get("/api/events", response_model=List[EventResponse])
async def get_events(
    camera_id: Optional[int] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if camera_id:
        query = query.filter(Event.camera_id == camera_id)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    events = query.order_by(Event.created_at.desc()).limit(limit).all()
    return events

@app.post("/api/events", response_model=EventResponse)
async def create_event(event: EventCreate, db: Session = Depends(get_db)):
    event_uuid = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    db_event = Event(
        event_id=event_uuid,
        camera_id=event.camera_id,
        object_class=event.object_class,
        confidence=event.confidence,
        direction=event.direction,
        speed_estimate=event.speed_estimate,
        bbox_x=event.bbox_x,
        bbox_y=event.bbox_y,
        bbox_width=event.bbox_width,
        bbox_height=event.bbox_height,
        zone_id=event.zone_id,
        line_id=event.line_id,
        event_type=event.event_type,
        severity=event.severity,
        raw_payload=event.raw_payload,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    r = await get_redis()
    await r.publish("events", json.dumps({
        "event_id": event_uuid,
        "event_type": event.event_type,
        "camera_id": event.camera_id,
    }))
    return db_event

@app.get("/api/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@app.get("/api/analytics/overview")
async def get_analytics_overview(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    events_today = db.query(Event).filter(Event.created_at >= datetime.combine(today, datetime.min.time())).count()
    events_week = db.query(Event).filter(Event.created_at >= datetime.combine(week_ago, datetime.min.time())).count()
    cameras_active = db.query(Camera).filter(Camera.enabled == True).count()
    events_by_type = db.query(Event.event_type, db.func.count(Event.id)).filter(Event.created_at >= datetime.combine(week_ago, datetime.min.time())).group_by(Event.event_type).all()
    events_by_camera = db.query(Event.camera_id, db.func.count(Event.id)).filter(Event.created_at >= datetime.combine(week_ago, datetime.min.time())).group_by(Event.camera_id).all()
    return {
        "events_today": events_today,
        "events_week": events_week,
        "cameras_active": cameras_active,
        "events_by_type": [{"type": e[0], "count": e[1]} for e in events_by_type],
        "events_by_camera": [{"camera_id": e[0], "count": e[1]} for e in events_by_camera],
    }

@app.post("/api/integrations/test")
async def test_integration(digifort_url: str, db: Session = Depends(get_db)):
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{digifort_url}/api/virtual-sensor",
                json={"test": True, "timestamp": datetime.utcnow().isoformat()},
                timeout=5.0
            )
        return {"status": "success", "response": response.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/detections")
async def receive_detection(payload: DetectionPayload, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.camera_id == payload.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    for det in payload.detections:
        obj_id = f"{payload.camera_id}-{det.get('track_id', uuid.uuid4().hex[:6])}"
        db_obj = DetectedObject(
            object_id=obj_id,
            track_id=det.get("track_id"),
            camera_id=camera.id,
            object_class=det.get("class"),
            confidence=det.get("confidence"),
            bbox_x=det.get("bbox", [0, 0, 0, 0])[0],
            bbox_y=det.get("bbox", [0, 0, 0, 0])[1],
            bbox_width=det.get("bbox", [0, 0, 0, 0])[2],
            bbox_height=det.get("bbox", [0, 0, 0, 0])[3],
            direction=det.get("direction"),
            speed_estimate=det.get("speed"),
        )
        db.add(db_obj)
    db.commit()
    r = await get_redis()
    await r.publish("detections", json.dumps(payload.dict()))
    return {"status": "received", "count": len(payload.detections)}

@app.websocket("/ws/detections")
async def websocket_detections(websocket: WebSocket):
    await websocket.accept()
    r = await get_redis()
    pub = r.pubsub()
    await pub.subscribe("detections")
    try:
        while True:
            message = await pub.get(ignore_subscribe_messages=True, decode=True)
            if message:
                await websocket.send_text(message)
    except WebSocketDisconnect:
        await pub.unsubscribe("detections")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)