from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import cv2
import numpy as np
import threading
import logging
import time

app = FastAPI(title="Stream Proxy")

logger = logging.getLogger("stream-proxy")

streams = {}
stream_lock = threading.Lock()
frame_lock = threading.Lock()

def read_rtsp_stream(camera_id: str, rtsp_url: str):
    """Read RTSP stream and store latest frame"""
    cap = cv2.VideoCapture(rtsp_url)
    
    while camera_id in streams:
        ret, frame = cap.read()
        if ret:
            with frame_lock:
                streams[camera_id]['frame'] = frame
            streams[camera_id]['last_frame_time'] = time.time()
        time.sleep(0.03)
    
    cap.release()
    logger.info(f"Stream reader stopped for {camera_id}")

@app.post("/api/streams/{camera_id}")
async def add_stream(camera_id: str, rtsp_url: str):
    """Add a stream to monitor"""
    with stream_lock:
        if camera_id in streams:
            streams[camera_id]['running'] = False
        
        streams[camera_id] = {
            'rtsp_url': rtsp_url,
            'frame': None,
            'running': True,
            'last_frame_time': 0
        }
        
        thread = threading.Thread(target=read_rtsp_stream, args=(camera_id, rtsp_url))
        thread.daemon = True
        thread.start()
    
    return {"status": "stream_started", "camera_id": camera_id}

@app.get("/api/streams/{camera_id}/frame.jpg")
async def get_frame(camera_id: str):
    """Get latest frame as JPEG"""
    if camera_id not in streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    with frame_lock:
        frame = streams[camera_id].get('frame')
    
    if frame is None:
        raise HTTPException(status_code=404, detail="No frame available")
    
    ret, jpeg = cv2.imencode('.jpg', frame)
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to encode frame")
    
    jpeg_bytes = jpeg.tobytes()
    
    return StreamingResponse(
        iter([jpeg_bytes]),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/streams")
async def list_streams():
    """List active streams"""
    with stream_lock:
        result = {}
        for cam_id, info in streams.items():
            with frame_lock:
                result[cam_id] = {
                    'rtsp_url': info['rtsp_url'],
                    'has_frame': info['frame'] is not None,
                    'last_frame_time': info.get('last_frame_time', 0)
                }
    return result

@app.delete("/api/streams/{camera_id}")
async def remove_stream(camera_id: str):
    """Stop monitoring a stream"""
    with stream_lock:
        if camera_id in streams:
            streams[camera_id]['running'] = False
            del streams[camera_id]
    return {"status": "stream_stopped", "camera_id": camera_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)