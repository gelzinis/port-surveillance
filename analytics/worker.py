import os
import sys
import json
import time
import uuid
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field
from collections import deque
import threading

import cv2
import numpy as np
import redis.asyncio as redis
import httpx
from ultralytics import YOLO
from filterpy.kalman import KalmanFilter

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("analytics-worker")

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
YOLO_MODEL = os.getenv("YOLO_MODEL", "yolov8n")

MARINE_CLASSES = {
    0: "ship",
    1: "boat",
    2: "kayak",
    3: "raft",
    4: "unknown"
}

@dataclass
class Detection:
    track_id: str
    object_class: str
    confidence: float
    bbox: Tuple[int, int, int, int]
    center: Tuple[int, int]
    timestamp: float
    direction: str = "unknown"
    speed: float = 0.0

@dataclass
class TrackedObject:
    object_id: str
    track_id: int
    object_class: str
    active: bool = True
    positions: deque = field(default_factory=lambda: deque(maxlen=30))
    last_seen: float = 0
    first_seen: float = 0
    direction: str = "unknown"
    speed: float = 0.0
    frame_count: int = 0
    confirm_count: int = 0

class ByteTrack:
    def __init__(self, max_time_since_update: float = 30.0):
        self.max_time_since_update = max_time_since_update
        self.tracked_objects: Dict[int, TrackedObject] = {}
        self.track_id_counter = 0
        self.frame_id = 0

    def update(self, detections: List[Dict], timestamp: float) -> List[Detection]:
        self.frame_id += 1
        current_time = timestamp

        for obj in list(self.tracked_objects.values()):
            obj.active = False

        output_detections = []

        for det in detections:
            bbox = det.get("bbox", [0, 0, 0, 0])
            x1, y1, x2, y2 = bbox
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            w = x2 - x1
            h = y2 - y1

            matched_track_id = None
            min_distance = float('inf')

            for track_id, obj in self.tracked_objects.items():
                if obj.active:
                    continue
                if obj.positions:
                    last_pos = obj.positions[-1]
                    dist = np.sqrt((cx - last_pos[0])**2 + (cy - last_pos[1])**2)
                    if dist < min_distance and dist < max(w, h) * 1.5:
                        min_distance = dist
                        matched_track_id = track_id

            if matched_track_id is not None:
                track = self.tracked_objects[matched_track_id]
            else:
                self.track_id_counter += 1
                matched_track_id = self.track_id_counter
                track = TrackedObject(
                    object_id=f"OBJ-{matched_track_id}",
                    track_id=matched_track_id,
                    object_class=det.get("class", "unknown"),
                    first_seen=current_time
                )
                self.tracked_objects[matched_track_id] = track

            track.positions.append((cx, cy, w, h))
            track.last_seen = current_time
            track.active = True
            track.confirm_count += 1
            track.frame_count += 1

            direction = self._calculate_direction(track)
            speed = self._calculate_speed(track)

            detection = Detection(
                track_id=str(matched_track_id),
                object_class=det.get("class", "unknown"),
                confidence=det.get("confidence", 0.0),
                bbox=bbox,
                center=(cx, cy),
                timestamp=current_time,
                direction=direction,
                speed=speed
            )
            output_detections.append(detection)

        return output_detections

    def _calculate_direction(self, track: TrackedObject) -> str:
        if len(track.positions) < 3:
            return "unknown"

        points = list(track.positions)[-10:]
        x_positions = [p[0] for p in points]
        y_positions = [p[1] for p in points]

        if len(x_positions) < 2:
            return "unknown"

        dx = x_positions[-1] - x_positions[0]
        dy = y_positions[-1] - y_positions[0]

        if abs(dx) < 10 and abs(dy) < 10:
            return "stationary"

        angle = np.arctan2(dy, dx) * 180 / np.pi

        if -45 <= angle < 45:
            return "right"
        elif 45 <= angle < 135:
            return "down"
        elif 135 <= angle <= 180 or -180 <= angle < -135:
            return "left"
        else:
            return "up"

    def _calculate_speed(self, track: TrackedObject) -> float:
        if len(track.positions) < 2:
            return 0.0

        points = list(track.positions)[-5:]
        dx = points[-1][0] - points[0][0]
        dy = points[-1][1] - points[0][1]
        dt = max(points[-1][3], 1) / 30.0

        pixels_per_second = np.sqrt(dx**2 + dy**2) / dt
        return pixels_per_second

class ZoneAnalyzer:
    def __init__(self, zones: Dict[str, Any]):
        self.zones = zones

    def check_zone_entry(self, center: Tuple[int, int], camera_id: str) -> Optional[str]:
        x, y = center
        for zone_id, zone in self.zones.items():
            if zone.get("camera_id") != camera_id:
                continue
            points = zone.get("polygon_points", [])
            if len(points) < 3:
                continue
            if cv2.pointPolygonTest(np.array(points, dtype=np.int32), (float(x), float(y)), False) >= 0:
                return zone_id
        return None

class LineAnalyzer:
    def __init__(self, lines: Dict[str, Any]):
        self.lines = lines

    def check_line_crossing(self, center: Tuple[int, int], prev_center: Tuple[int, int], camera_id: str) -> Optional[Dict]:
        for line_id, line in self.lines.items():
            if line.get("camera_id") != camera_id:
                continue
            start = tuple(line.get("start_point", [0, 0]))
            end = tuple(line.get("end_point", [0, 0]))

            if self._segments_intersect(prev_center, center, start, end):
                direction = self._get_crossing_direction(prev_center, center, start, end)
                return {"line_id": line_id, "direction": direction}
        return None

    def _segments_intersect(self, p1: Tuple, p2: Tuple, p3: Tuple, p4: Tuple) -> bool:
        def ccw(A, B, C):
            return (C[1] - A[1]) * (A[0] - B[0]) > (A[1] - B[1]) * (C[0] - A[0])
        A, B, C, D = p1, p2, p3, p4
        return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)

    def _get_crossing_direction(self, p1: Tuple, p2: Tuple, line_start: Tuple, line_end: Tuple) -> str:
        dx = p2[0] - p1[0]
        line_dx = line_end[0] - line_start[0]
        dir_p = 1 if dx > 0 else -1
        line_dir = 1 if line_dx > 0 else -1
        return "forward" if dir_p == line_dir else "backward"

class RuleEngine:
    def __init__(self, rules: List[Dict]):
        self.rules = {r.get("rule_id"): r for r in rules}
        self.last_events: Dict[str, float] = {}

    def evaluate(self, detection: Detection, camera_id: str, zone_id: Optional[str] = None, line_id: Optional[str] = None) -> List[Dict]:
        events = []
        current_time = detection.timestamp

        for rule_id, rule in self.rules.items():
            if not rule.get("enabled", True):
                continue

            if rule.get("camera_id") and rule.get("camera_id") != camera_id:
                continue

            if detection.object_class not in rule.get("object_classes", []):
                continue

            if detection.confidence < rule.get("confidence_threshold", 0.5):
                continue

            event_type = rule.get("event_type")
            should_fire = False

            if event_type == "zone_entry" and zone_id:
                should_fire = True
            elif event_type == "line_crossing" and line_id:
                should_fire = True
            elif event_type == "object_detected":
                should_fire = True

            if should_fire:
                cooldown = rule.get("cooldown_seconds", 60)
                key = f"{rule_id}:{detection.track_id}"
                last_time = self.last_events.get(key, 0)

                if current_time - last_time > cooldown:
                    events.append({
                        "rule_id": rule_id,
                        "event_type": event_type,
                        "severity": rule.get("severity", "medium"),
                        "take_snapshot": rule.get("take_snapshot", True),
                        "webhook_enabled": rule.get("webhook_enabled", False),
                        "digifort_enabled": rule.get("digifort_enabled", False),
                        "direction": detection.direction,
                    })
                    self.last_events[key] = current_time

        return events

class RTSPStreamHandler:
    def __init__(self, stream_url: str, fps: int = 10):
        self.stream_url = stream_url
        self.target_fps = fps
        self.frame_delay = 1.0 / fps
        self.capture = None
        self.is_connected = False

    def connect(self) -> bool:
        try:
            self.capture = cv2.VideoCapture(self.stream_url)
            if self.capture.isOpened():
                self.is_connected = True
                return True
        except Exception as e:
            logger.error(f"Failed to connect to stream: {e}")
        return False

    def read(self) -> Optional[np.ndarray]:
        if not self.is_connected or not self.capture:
            return None
        ret, frame = self.capture.read()
        if ret:
            return frame
        return None

    def release(self):
        if self.capture:
            self.capture.release()
        self.is_connected = False

class DemoStreamHandler:
    def __init__(self, video_path: str, fps: int = 10):
        self.video_path = video_path
        self.target_fps = fps
        self.frame_delay = 1.0 / fps
        self.capture = None
        self.frame_count = 0

    def connect(self) -> bool:
        try:
            self.capture = cv2.VideoCapture(self.video_path)
            if self.capture.isOpened():
                return True
        except Exception as e:
            logger.error(f"Failed to open video: {e}")
        return False

    def read(self) -> Optional[np.ndarray]:
        if not self.capture:
            return None
        ret, frame = self.capture.read()
        if ret:
            self.frame_count += 1
            return frame
        else:
            self.capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
            self.frame_count = 0
            ret, frame = self.capture.read()
            if ret:
                self.frame_count += 1
            return frame

    def release(self):
        if self.capture:
            self.capture.release()

class CameraProcessor:
    def __init__(self, camera_config: Dict):
        self.camera_id = camera_config.get("camera_id")
        self.name = camera_config.get("name")
        self.stream_url = camera_config.get("stream_url")
        self.fps = camera_config.get("fps_target", 10)
        self.roi = (
            camera_config.get("roi_x", 0),
            camera_config.get("roi_y", 0),
            camera_config.get("roi_width", 1920),
            camera_config.get("roi_height", 1080)
        )
        self.confidence_threshold = camera_config.get("confidence_threshold", 0.5)
        self.min_object_size = camera_config.get("min_object_size", 50)
        self.enabled = camera_config.get("enabled", True)
        self.is_demo = camera_config.get("is_demo", False)

        self.stream_handler: Any = None
        self.tracker = ByteTrack()
        self.zone_analyzer = None
        self.line_analyzer = None
        self.rule_engine = None
        self.last_frame_time = 0
        self.frame_interval = 1.0 / self.fps

    def set_zones(self, zones: List[Dict]):
        zones_dict = {z.get("zone_id"): z for z in zones if z.get("camera_id") == self.camera_id}
        self.zone_analyzer = ZoneAnalyzer(zones_dict)

    def set_lines(self, lines: List[Dict]):
        lines_dict = {l.get("line_id"): l for l in lines if l.get("camera_id") == self.camera_id}
        self.line_analyzer = LineAnalyzer(lines_dict)

    def set_rules(self, rules: List[Dict]):
        camera_rules = [r for r in rules if r.get("camera_id") == self.camera_id or r.get("camera_id") is None]
        self.rule_engine = RuleEngine(camera_rules)

    def connect(self) -> bool:
        if self.is_demo:
            samples_dir = Path("/app/samples")
            video_path = samples_dir / f"{self.camera_id}.mp4"
            if video_path.exists():
                self.stream_handler = DemoStreamHandler(str(video_path), self.fps)
            else:
                for f in samples_dir.glob("*.mp4"):
                    self.stream_handler = DemoStreamHandler(str(f), self.fps)
                    break
            if self.stream_handler:
                return self.stream_handler.connect()
            logger.warning(f"No demo video found for camera {self.camera_id}")
            return False
        else:
            self.stream_handler = RTSPStreamHandler(self.stream_url, self.fps)
            return self.stream_handler.connect()

    def process_frame(self, frame: np.ndarray, model: YOLO, redis_client: redis.Redis) -> List[Dict]:
        current_time = time.time()

        if current_time - self.last_frame_time < self.frame_interval:
            return []
        self.last_frame_time = current_time

        roi = self.roi
        x, y, w, h = roi
        roi_frame = frame[y:y+h, x:x+w]

        results = model(roi_frame, conf=self.confidence_threshold, verbose=False)

        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                xyxy = box.xyxy[0].cpu().numpy()

                bbox = (int(xyxy[0]) + x, int(xyxy[1]) + y, int(xyxy[2]) + x, int(xyxy[3]) + y)
                bw = bbox[2] - bbox[0]
                bh = bbox[3] - bbox[1]

                if bw < self.min_object_size or bh < self.min_object_size:
                    continue

                obj_class = MARINE_CLASSES.get(cls, "unknown")
                detections.append({
                    "class": obj_class,
                    "confidence": conf,
                    "bbox": bbox,
                })
        if not detections:
            return []

        tracked = self.tracker.update(detections, current_time)
        events = []

        for det in tracked:
            zone_id = None
            if self.zone_analyzer:
                zone_id = self.zone_analyzer.check_zone_entry(det.center, self.camera_id)

            line_info = None
            if self.line_analyzer and len(det.track_id) > 0:
                prev_positions = list(self.tracker.tracked_objects.get(int(det.track_id), TrackedObject("", 0, "")).positions or [])[:-1]
                if prev_positions:
                    prev_center = prev_positions[-1][:2]
                    line_info = self.line_analyzer.check_line_crossing(det.center, prev_center, self.camera_id)

            line_id = line_info.get("line_id") if line_info else None

            if self.rule_engine:
                rule_events = self.rule_engine.evaluate(det, self.camera_id, zone_id, line_id)
                events.extend(rule_events)

            snapshot_path = None
            if any(e.get("take_snapshot") for e in events):
                snapshot_path = self._save_snapshot(frame, det.bbox)

            payload = {
                "camera_id": self.camera_id,
                "track_id": det.track_id,
                "object_class": det.object_class,
                "confidence": det.confidence,
                "bbox": det.bbox,
                "direction": det.direction,
                "speed": det.speed,
                "zone_id": zone_id,
                "line_id": line_id,
                "snapshot_path": snapshot_path,
                "events": events,
                "timestamp": datetime.fromtimestamp(current_time).isoformat(),
            }

            try:
                asyncio.create_task(redis_client.publish("detections", json.dumps(payload)))
            except:
                pass

        return events

    def _save_snapshot(self, frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> Optional[str]:
        try:
            x1, y1, x2, y2 = bbox
            padding = 20
            x1 = max(0, x1 - padding)
            y1 = max(0, y1 - padding)
            x2 = min(frame.shape[1], x2 + padding)
            y2 = min(frame.shape[0], y2 + padding)

            snapshot = frame[y1:y2, x1:x2]
            snapshot_dir = Path("/app/snapshots")
            snapshot_dir.mkdir(parents=True, exist_ok=True)

            filename = f"{self.camera_id}_{int(time.time() * 1000)}.jpg"
            filepath = snapshot_dir / filename
            cv2.imwrite(str(filepath), snapshot)
            return str(filepath)
        except Exception as e:
            logger.error(f"Failed to save snapshot: {e}")
        return None

    def release(self):
        if self.stream_handler:
            self.stream_handler.release()

class AnalyticsWorker:
    def __init__(self):
        self.model = None
        self.redis_client = None
        self.cameras: Dict[str, CameraProcessor] = {}
        self.running = False

    async def initialize(self):
        logger.info("Initializing analytics worker...")

        try:
            self.model = YOLO(f"{YOLO_MODEL}.pt")
            logger.info(f"Loaded YOLO model: {YOLO_MODEL}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            self.model = YOLO("yolov8n.pt")

        self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await self.redis_client.ping()
        logger.info("Connected to Redis")

        await self._load_cameras()
        self.running = True

    async def _load_cameras(self):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{API_BASE_URL}/api/cameras")
                if response.status_code == 200:
                    cameras_data = response.json()
                    for cam in cameras_data:
                        if cam.get("enabled"):
                            processor = CameraProcessor(cam)
                            processor.set_zones([])
                            processor.set_lines([])
                            processor.set_rules([])
                            if processor.connect():
                                self.cameras[cam.get("camera_id")] = processor
                                logger.info(f"Connected to camera: {cam.get('camera_id')}")
                            else:
                                logger.warning(f"Failed to connect to camera: {cam.get('camera_id')}")
            except Exception as e:
                logger.error(f"Failed to load cameras: {e}")

    async def process_cameras(self):
        logger.info("Starting camera processing loop...")

        while self.running:
            try:
                for camera_id, processor in list(self.cameras.items()):
                    if not processor.enabled:
                        continue

                    frame = processor.stream_handler.read()
                    if frame is None:
                        continue

                    events = processor.process_frame(frame, self.model, self.redis_client)

                    if events:
                        logger.info(f"Camera {camera_id}: {len(events)} events generated")

                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Error processing cameras: {e}")

    async def run(self):
        await self.initialize()
        await self.process_cameras()

async def main():
    worker = AnalyticsWorker()
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())