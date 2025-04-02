#!/usr/bin/env python3
"""
Camera Relay Server for macOS with Apple Silicon

This script creates a WebSocket server that relays camera frames from a local client
to any connected remote clients, allowing camera access through Nginx/HTTPS.
It can also directly capture from the system camera when running in background mode.
"""

import asyncio
import websockets
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('camera_relay.log')
    ]
)
logger = logging.getLogger('camera_relay')

# Load environment variables from .env file
def load_env_from_file():
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    logger.info(f"Attempting to load environment variables from: {env_file}")
    env_vars = {}
    
    if os.path.exists(env_file):
        logger.info(f".env file found: {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
                    # Also set in environment
                    os.environ[key.strip()] = value.strip()
        logger.info(f"Loaded {len(env_vars)} variables from .env file")
    else:
        logger.warning(f".env file not found: {env_file}")
    
    return env_vars

# Load environment variables
env_vars = load_env_from_file()

# Store connected clients
connected_clients = set()
# Store the most recent frame for new clients
latest_frame = None
# Flag to indicate if a producer (local camera source) is connected
producer_connected = False
# Store detection results
latest_detection = None
# Set up environment variables
BACKGROUND_MODE = os.environ.get('YOLO_BACKGROUND_MODE', '0') == '1'
DIRECT_CAMERA_ACCESS = os.environ.get('DIRECT_CAMERA_ACCESS', '1') == '1'
AUTO_CAPTURE = os.environ.get('AUTO_CAPTURE', '0') == '1'
CAPTURE_ON_DETECTION = os.environ.get('CAPTURE_ON_DETECTION', '0') == '1'
SAVE_DETECTION_IMAGES = os.environ.get('SAVE_DETECTION_IMAGES', '0') == '1'

logger.info(f"BACKGROUND_MODE: {BACKGROUND_MODE}")
logger.info(f"DIRECT_CAMERA_ACCESS: {DIRECT_CAMERA_ACCESS}")
logger.info(f"AUTO_CAPTURE: {AUTO_CAPTURE}")
logger.info(f"CAPTURE_ON_DETECTION: {CAPTURE_ON_DETECTION}")
logger.info(f"SAVE_DETECTION_IMAGES: {SAVE_DETECTION_IMAGES}")

# Import OpenCV for direct camera access if background mode is enabled
if BACKGROUND_MODE:
    try:
        import cv2
        import base64
        import numpy as np
        logger.info("OpenCV imported successfully for background camera capture")
        
        # Test camera access immediately
        try:
            test_cap = cv2.VideoCapture(0)
            if not test_cap.isOpened():
                logger.warning("Cannot access camera directly. Background mode will continue but without camera access.")
                logger.warning("Visit http://localhost:9090 at least once to grant camera permissions")
                DIRECT_CAMERA_ACCESS = False
            else:
                ret, frame = test_cap.read()
                if not ret:
                    logger.warning("Cannot read frame from camera. Background mode will continue but without camera access.")
                    DIRECT_CAMERA_ACCESS = False
                else:
                    logger.info(f"Camera test successful. Frame shape: {frame.shape}")
                    DIRECT_CAMERA_ACCESS = True
                test_cap.release()
        except Exception as e:
            logger.error(f"Error testing camera access: {e}")
            logger.warning("Camera access test failed. Background mode will continue but without camera access.")
            DIRECT_CAMERA_ACCESS = False
            
    except ImportError as e:
        logger.error(f"Error importing OpenCV: {e}")
        logger.warning("Background mode disabled due to missing dependencies")
        BACKGROUND_MODE = False
        DIRECT_CAMERA_ACCESS = False

async def handle_connection(websocket, path):
    """Handle a new WebSocket connection"""
    global latest_frame, producer_connected, latest_detection, DIRECT_CAMERA_ACCESS
    
    # Get client info
    client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    is_localhost = websocket.remote_address[0] in ['127.0.0.1', 'localhost', '::1']
    
    # Determine if this is a producer (localhost) or consumer connection
    try:
        message = await websocket.recv()
        data = json.loads(message)
        
        client_type = data.get('type', 'consumer')
        is_producer = client_type == 'producer' and is_localhost
        
        if is_producer and not BACKGROUND_MODE:
            logger.info(f"Producer connected from {client_info}")
            if producer_connected:
                logger.warning("Another producer is already connected. Rejecting connection.")
                await websocket.send(json.dumps({"status": "error", "message": "Another producer is already connected"}))
                return
            producer_connected = True
            await websocket.send(json.dumps({"status": "connected", "message": "Producer connected successfully"}))
        elif is_producer and BACKGROUND_MODE and not DIRECT_CAMERA_ACCESS:
            # In background mode but no direct access, accept producer as a fallback
            logger.info(f"Producer connected from {client_info} - will use as camera source since no direct access available")
            producer_connected = True
            await websocket.send(json.dumps({"status": "connected", "message": "Producer connected as camera source"}))
        elif is_producer and BACKGROUND_MODE and DIRECT_CAMERA_ACCESS:
            logger.info(f"Producer tried to connect but background mode with direct access is active. Only accepting detection data.")
            await websocket.send(json.dumps({"status": "info", "message": "System is in background mode with direct camera access. Only detection data will be processed."}))
        else:
            logger.info(f"Consumer connected from {client_info}")
            await websocket.send(json.dumps({"status": "connected", "message": "Consumer connected successfully"}))
            # Send the latest frame to the new consumer if available
            if latest_frame:
                await websocket.send(latest_frame)
            # Send the latest detection data if available
            if latest_detection:
                await websocket.send(json.dumps({
                    "type": "detection",
                    "data": latest_detection
                }))
        
        # Add to connected clients
        connected_clients.add(websocket)
        
        try:
            # Main message handling loop
            async for message in websocket:
                if is_producer:
                    try:
                        # Check if this is a detection message or a frame
                        if message.startswith(b'{'):
                            # This is likely a JSON message
                            try:
                                data = json.loads(message)
                                if data.get('type') == 'detection':
                                    # Store the latest detection data
                                    latest_detection = data.get('data')
                                    # Broadcast detection data to all consumers
                                    broadcast_tasks = []
                                    for client in connected_clients:
                                        if client != websocket:  # Don't send back to producer
                                            broadcast_tasks.append(asyncio.create_task(
                                                client.send(message)
                                            ))
                                    if broadcast_tasks:
                                        await asyncio.gather(*broadcast_tasks, return_exceptions=True)
                                    continue
                            except json.JSONDecodeError:
                                # Not a JSON message, treat as binary frame
                                pass
                        
                        # If we get here, treat as a binary frame
                        if not BACKGROUND_MODE or (BACKGROUND_MODE and not DIRECT_CAMERA_ACCESS):
                            # Process frames from producer in non-background mode or when no direct access
                            latest_frame = message
                            broadcast_tasks = []
                            for client in connected_clients:
                                if client != websocket:  # Don't send back to producer
                                    broadcast_tasks.append(asyncio.create_task(
                                        client.send(message)
                                    ))
                            if broadcast_tasks:
                                await asyncio.gather(*broadcast_tasks, return_exceptions=True)
                    except Exception as e:
                        logger.error(f"Error processing producer message: {e}")
                else:
                    # If this is a consumer, handle any control messages
                    try:
                        data = json.loads(message)
                        logger.debug(f"Received control message from consumer: {data}")
                    except json.JSONDecodeError:
                        logger.warning(f"Received invalid JSON from consumer: {message[:100]}...")
        finally:
            # Clean up on disconnect
            connected_clients.remove(websocket)
            if is_producer and (not BACKGROUND_MODE or (BACKGROUND_MODE and not DIRECT_CAMERA_ACCESS)):
                producer_connected = False
                logger.info(f"Producer disconnected from {client_info}")
            else:
                logger.info(f"Consumer disconnected from {client_info}")
    
    except Exception as e:
        logger.error(f"Error handling connection: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if websocket in connected_clients:
            connected_clients.remove(websocket)

async def health_check():
    """Periodic health check to log server status"""
    while True:
        logger.info(f"Health check: {len(connected_clients)} clients connected, producer: {producer_connected}, background_mode: {BACKGROUND_MODE}, direct_camera_access: {DIRECT_CAMERA_ACCESS}")
        await asyncio.sleep(60)  # Check every minute

async def background_camera_capture():
    """Capture frames directly from the system camera in background mode"""
    global latest_frame, latest_detection
    
    if not BACKGROUND_MODE:
        return
    
    logger.info("Starting background camera capture...")
    
    # If we don't have direct camera access, we'll wait for a producer to connect
    if not DIRECT_CAMERA_ACCESS:
        logger.info("No direct camera access available. Waiting for browser to connect and provide camera feed.")
        # Keep checking for direct camera access every minute
        while not DIRECT_CAMERA_ACCESS and BACKGROUND_MODE:
            await asyncio.sleep(60)  # Wait 1 minute
            try:
                test_cap = cv2.VideoCapture(0)
                if test_cap.isOpened():
                    ret, frame = test_cap.read()
                    if ret:
                        logger.info("Camera now accessible! Starting direct capture.")
                        test_cap.release()
                        break
                    test_cap.release()
            except Exception:
                pass
            logger.info("Still waiting for camera access...")
        # If we got access, we'll continue, otherwise we're exiting the function
        if not DIRECT_CAMERA_ACCESS:
            return
    
    # Initialize camera
    try:
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.error("Cannot open camera in background mode")
            return
        
        logger.info("Camera opened successfully in background mode")
        
        # Set camera properties for optimal performance
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Import the YOLOv7 detection logic if available
        try:
            import sys
            import os.path
            # Get the absolute path to the server directory
            server_dir = os.path.dirname(os.path.abspath(__file__))
            sys.path.append(server_dir)
            
            # Check if yolov7 directory exists and add to path
            yolov7_dir = os.path.join(os.path.dirname(server_dir), 'yolov7')
            if os.path.exists(yolov7_dir):
                sys.path.append(yolov7_dir)
                logger.info(f"Added yolov7 directory to path: {yolov7_dir}")
            
            # Try to import detection packages
            yolo_detector = None
            try:
                # Try different potential module names
                try:
                    import yolo_detector
                    logger.info("Using yolo_detector module for background processing")
                except ImportError:
                    # Try direct imports from yolov7 directory
                    sys.path.append(os.path.join(os.path.dirname(server_dir), 'yolov7'))
                    try:
                        import detect
                        yolo_detector = detect
                        logger.info("Using direct detect.py from yolov7 directory")
                    except ImportError:
                        logger.warning("Could not import detect.py, using OpenCV detector")
                        yolo_detector = None
            except ImportError:
                logger.warning("YOLOv7 detector not available, will use OpenCV HOG detector")
                yolo_detector = None
        except ImportError as e:
            logger.warning(f"Could not import detection modules: {e}")
            yolo_detector = None
        
        frame_count = 0
        last_detection_time = time.time() - 10  # Initialize to allow immediate detection
        
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.error("Failed to read frame from camera")
                await asyncio.sleep(1)
                continue
            
            frame_count += 1
            
            # Process every 3rd frame to reduce CPU usage (10fps with 30fps camera)
            if frame_count % 3 == 0:
                # Convert frame to JPEG format
                _, buffer = cv2.imencode('.jpg', frame)
                jpeg_bytes = buffer.tobytes()
                
                # Store as latest frame
                latest_frame = jpeg_bytes
                
                # Broadcast to all connected clients
                if connected_clients:
                    broadcast_tasks = []
                    for client in connected_clients:
                        broadcast_tasks.append(asyncio.create_task(
                            client.send(jpeg_bytes)
                        ))
                    
                    if broadcast_tasks:
                        await asyncio.gather(*broadcast_tasks, return_exceptions=True)
                
                # Run detection every ~2 seconds (on every ~20th frame at 10fps)
                current_time = time.time()
                if yolo_detector and (current_time - last_detection_time) > 2.0:
                    last_detection_time = current_time
                    
                    # Run detection in the background to avoid blocking the frame capture
                    asyncio.create_task(process_detection(frame, current_time))
            
            # Sleep briefly to control frame rate and CPU usage
            await asyncio.sleep(0.03)  # ~30fps max
            
    except Exception as e:
        logger.error(f"Error in background camera capture: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
            logger.info("Camera released in background mode")

async def process_detection(frame, timestamp):
    """Process a frame for object detection"""
    global latest_detection
    
    try:
        # Run detection
        person_detected = detect_person(frame)
        
        if person_detected:
            logger.info(f"Person detected at {datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')}")
            
            # ALWAYS save the image when a person is detected (regardless of environment variables)
            logger.info("Person detected, saving image...")
            try:
                # Draw bounding boxes on a copy of the frame for visualization
                vis_frame = frame.copy()
                if latest_detection and 'detections' in latest_detection:
                    h, w = frame.shape[:2]
                    for det in latest_detection['detections']:
                        if 'bbox' in det:
                            bbox = det['bbox']
                            x1, y1, x2, y2 = int(bbox[0] * w), int(bbox[1] * h), int(bbox[2] * w), int(bbox[3] * h)
                            confidence = det.get('confidence', 0)
                            
                            # Draw rectangle
                            cv2.rectangle(vis_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            
                            # Draw label
                            label = f"Person: {confidence:.2f}"
                            cv2.putText(vis_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                # Generate a unique filename
                import time
                timestamp_str = time.strftime('%Y%m%d_%H%M%S')
                filename = f"person_detected_{timestamp_str}.jpg"
                
                # Ensure the media directory exists
                media_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'media')
                captured_images_dir = os.path.join(media_dir, 'captured_images')
                os.makedirs(captured_images_dir, exist_ok=True)
                
                # Save the visualization frame
                filepath = os.path.join(captured_images_dir, filename)
                _, img_encoded = cv2.imencode('.jpg', vis_frame)
                with open(filepath, 'wb') as f:
                    f.write(img_encoded.tobytes())
                
                # Set file permissions to ensure it's writeable/deletable
                try:
                    os.chmod(filepath, 0o666)  # rw-rw-rw-
                    logger.info(f"Detection image saved to {filepath} with permissions 666")
                except Exception as perm_err:
                    logger.error(f"Error setting file permissions: {perm_err}")
                
                # Save metadata about the detection
                metadata_path = os.path.join(captured_images_dir, f"{os.path.splitext(filename)[0]}_metadata.json")
                with open(metadata_path, 'w') as f:
                    import json
                    json.dump({
                        'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
                        'detections': latest_detection.get('detections', []) if latest_detection else [],
                        'personDetected': True,
                        'filename': filename
                    }, f, indent=2)
                
                # Set permissions on metadata file too
                try:
                    os.chmod(metadata_path, 0o666)  # rw-rw-rw-
                except Exception as perm_err:
                    logger.error(f"Error setting metadata file permissions: {perm_err}")
                logger.info(f"Detection metadata saved to {metadata_path}")
                
            except Exception as e:
                logger.error(f"Error saving detection image: {e}")
            
            # Check if auto-capture is enabled in environment variables (original code path)
            if AUTO_CAPTURE and CAPTURE_ON_DETECTION:
                logger.info("Auto-capture is enabled in environment variables")
            
            # Notify API about person detection
            try:
                import requests
                
                # Try local API first
                api_url = "http://localhost:8000/api/person-detected/"
                
                # Get the confidence from the latest detection
                confidence = 0.85  # Default confidence
                if latest_detection and 'detections' in latest_detection and latest_detection['detections']:
                    best_detection = max(latest_detection['detections'], key=lambda d: d.get('confidence', 0))
                    confidence = best_detection.get('confidence', 0.85)
                
                # Prepare data
                data = {
                    'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
                    'confidence': float(confidence),
                    'detections': latest_detection.get('detections', []) if latest_detection else []
                }
                
                # Get admin token
                admin_token = get_admin_token()
                
                if admin_token:
                    headers = {
                        'Authorization': f'Bearer {admin_token}',
                        'Content-Type': 'application/json'
                    }
                    
                    response = requests.post(api_url, json=data, headers=headers, timeout=5)
                    if response.status_code == 200:
                        logger.info("Successfully notified API about person detection")
                    else:
                        logger.warning(f"Failed to notify API: {response.status_code} {response.text}")
                else:
                    logger.warning("No admin token available for API notification")
                
            except Exception as e:
                logger.error(f"Error notifying API about detection: {e}")
                import traceback
                logger.error(traceback.format_exc())
                
                # If API notification fails but we need to capture, attempt direct capture
                if AUTO_CAPTURE and CAPTURE_ON_DETECTION and not SAVE_DETECTION_IMAGES:
                    try:
                        # Save the image directly (this is redundant now that we save above)
                        pass
                    except Exception as capture_err:
                        logger.error(f"Error saving image directly: {capture_err}")
            
            # Create detection data in the same format as the frontend
            detection_data = {
                'type': 'detection',
                'data': latest_detection if latest_detection else {
                    'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
                    'detections': [{
                        'class': 'person',
                        'confidence': 0.85,  # Example confidence
                        'bbox': [0.1, 0.1, 0.8, 0.8]  # Example bounding box
                    }],
                    'personDetected': True
                }
            }
            
            # Broadcast to all connected clients
            if connected_clients:
                broadcast_tasks = []
                for client in connected_clients:
                    broadcast_tasks.append(asyncio.create_task(
                        client.send(json.dumps(detection_data))
                    ))
                
                if broadcast_tasks:
                    await asyncio.gather(*broadcast_tasks, return_exceptions=True)
                    
    except Exception as e:
        logger.error(f"Error in detection processing: {e}")

def detect_person(frame):
    """Person detection using YOLOv7 or OpenCV as fallback"""
    try:
        # Try to use YOLOv7 detector
        try:
            # Import the detector
            import sys
            import os
            
            # Get path to yolov7 directory
            server_dir = os.path.dirname(os.path.abspath(__file__))
            yolov7_dir = os.path.join(os.path.dirname(server_dir), 'yolov7')
            
            # Add to path
            if yolov7_dir not in sys.path:
                sys.path.append(yolov7_dir)
            
            # Import the detector module
            import yolo_detector
            
            # Run detection
            person_detected, confidence, results = yolo_detector.detect_person(frame)
            
            # Log detection results
            if person_detected:
                logger.info(f"YOLOv7 detected person with confidence: {confidence:.2f}")
                
                # If we have detailed detection results, update latest_detection with bounding box info
                if results and 'detections' in results:
                    # Store only person detections
                    person_detections = [d for d in results['detections'] if d['class'].lower() == 'person']
                    if person_detections:
                        # Update the global latest_detection variable with better data
                        global latest_detection
                        if latest_detection is None:
                            latest_detection = {}
                        
                        latest_detection['detections'] = person_detections
                        latest_detection['personDetected'] = True
                        latest_detection['timestamp'] = datetime.now().isoformat()
                        latest_detection['inference_time'] = results.get('inferenceTime', 0)
            
            return person_detected
            
        except ImportError as e:
            logger.warning(f"Error importing YOLOv7 detector: {e}. Falling back to OpenCV HOG detector")
            # Fall back to OpenCV HOG detector
            return use_opencv_hog_detector(frame)
            
        except Exception as e:
            logger.error(f"Error using YOLOv7 detector: {e}")
            logger.warning("Falling back to OpenCV HOG detector")
            # Fall back to OpenCV HOG detector
            return use_opencv_hog_detector(frame)
            
    except Exception as e:
        logger.error(f"Error in person detection: {e}")
        return False

def use_opencv_hog_detector(frame):
    """Basic person detection using OpenCV HOG as fallback"""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Use HOG detector for person detection
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
        # Detect people
        boxes, weights = hog.detectMultiScale(gray, winStride=(8, 8), padding=(4, 4), scale=1.05)
        
        # If any person detected with confidence > 0.5, return True
        has_person = len(boxes) > 0 and any(weight > 0.5 for weight in weights)
        
        if has_person:
            logger.info(f"OpenCV HOG detected {len(boxes)} people")
            
            # Update the global latest_detection variable
            global latest_detection
            if latest_detection is None:
                latest_detection = {}
            
            # Create detections in the same format as YOLOv7 for consistency
            detections = []
            for i, (x, y, w, h) in enumerate(boxes):
                confidence = float(weights[i]) if i < len(weights) else 0.5
                if confidence > 0.5:
                    # Convert to relative coordinates
                    img_h, img_w = frame.shape[:2]
                    rel_bbox = [float(x/img_w), float(y/img_h), float((x+w)/img_w), float((y+h)/img_h)]
                    
                    detections.append({
                        'class': 'person',
                        'confidence': confidence,
                        'bbox': rel_bbox
                    })
            
            latest_detection['detections'] = detections
            latest_detection['personDetected'] = True
            latest_detection['timestamp'] = datetime.now().isoformat()
        
        return has_person
        
    except Exception as e:
        logger.error(f"Error in OpenCV HOG detection: {e}")
        return False

def get_admin_token():
    """Get admin token for API authentication"""
    try:
        # This function would implement the logic to get an admin API token
        # For now, return a placeholder or fetch from a secure location
        admin_token = os.environ.get('ADMIN_TOKEN')
        
        # If no admin token in environment, try to get it from database
        if not admin_token:
            # Try to get from Django auth system
            try:
                import django
                django.setup()
                from django.contrib.auth.models import User
                from rest_framework_simplejwt.tokens import AccessToken
                
                # Get or create admin user
                admin_user = User.objects.filter(is_superuser=True).first()
                if admin_user:
                    token = AccessToken.for_user(admin_user)
                    admin_token = str(token)
                    logger.info(f"Generated admin token for user: {admin_user.username}")
            except Exception as e:
                logger.error(f"Error getting admin token from database: {e}")
        
        return admin_token or 'placeholder_token'
    except Exception as e:
        logger.error(f"Error getting admin token: {e}")
        return None

async def main():
    """Start the WebSocket server"""
    # Get port from environment or use default
    port = int(os.environ.get('CAMERA_RELAY_PORT', 8765))
    
    # Create the server
    logger.info(f"Starting camera relay server on port {port}")
    stop = asyncio.Future()
    
    # Handle graceful shutdown
    def handle_signal(sig, frame):
        logger.info(f"Received signal {sig}, shutting down...")
        stop.set_result(None)
    
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    # Start health check task
    health_check_task = asyncio.create_task(health_check())
    
    # Start background camera capture if enabled
    background_task = None
    if BACKGROUND_MODE:
        if DIRECT_CAMERA_ACCESS:
            logger.info("Starting background camera capture mode with direct camera access")
        else:
            logger.info("Starting background camera capture mode (waiting for browser for camera access)")
        background_task = asyncio.create_task(background_camera_capture())
    else:
        logger.info("Running in relay-only mode")
    
    # Retry logic for server startup
    max_retries = 5
    retry_count = 0
    retry_delay = 2  # seconds
    
    while retry_count < max_retries:
        try:
            server = await websockets.serve(handle_connection, "0.0.0.0", port)
            logger.info(f"Camera relay server is running at ws://0.0.0.0:{port}")
            
            # Wait for stop signal
            await stop
            
            # Clean up
            logger.info("Server is shutting down")
            server.close()
            await server.wait_closed()
            health_check_task.cancel()
            try:
                await health_check_task
            except asyncio.CancelledError:
                pass
            
            if background_task:
                background_task.cancel()
                try:
                    await background_task
                except asyncio.CancelledError:
                    pass
            
            break
            
        except OSError as e:
            retry_count += 1
            logger.error(f"Failed to start server (attempt {retry_count}/{max_retries}): {e}")
            if retry_count < max_retries:
                logger.info(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error("Maximum retries reached. Could not start server.")
                raise

if __name__ == "__main__":
    try:
        # Set a higher priority for this process if possible
        try:
            import os
            os.nice(-10)  # Try to increase process priority
            logger.info("Process priority increased")
        except (OSError, AttributeError):
            logger.warning("Could not increase process priority")
            
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1) 