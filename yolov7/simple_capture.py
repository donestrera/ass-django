#!/usr/bin/env python3
"""
Simple Person Detection and Image Capture

This script continuously captures frames from the camera,
detects if a person is present using OpenCV's built-in HOG detector,
and saves images when people are detected.
"""

import os
import sys
import cv2
import time
import logging
import argparse
import requests
import json
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('person_capture.log')
    ]
)
logger = logging.getLogger('person_capture')

# Django API settings
DJANGO_API_URL = "http://localhost:8000/api"
PERSON_DETECTED_ENDPOINT = f"{DJANGO_API_URL}/person-detected/"
UPLOAD_IMAGE_ENDPOINT = f"{DJANGO_API_URL}/upload-image/"

# Try to get admin token for API auth
def get_admin_token():
    """Get admin token for API authentication"""
    try:
        auth_url = f"{DJANGO_API_URL}/auth/login/"
        auth_data = {
            "username": "testuser",
            "password": "testpassword"
        }
        
        # First try to authenticate with standard JSON
        try:
            response = requests.post(auth_url, json=auth_data, timeout=5)
            if response.status_code == 200 and 'access' in response.json():
                logger.info("Successfully authenticated with JSON payload")
                return response.json().get('access')
        except Exception as json_err:
            logger.debug(f"JSON authentication failed: {json_err}, trying form data")
        
        # If JSON fails, try form data
        response = requests.post(auth_url, data=auth_data, timeout=5)
        
        if response.status_code == 200:
            logger.info("Successfully authenticated with form data")
            return response.json().get('access')
        else:
            logger.warning(f"Failed to get admin token: {response.status_code} {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error getting admin token: {e}")
        return None

def notify_django_api(timestamp, confidence, filepath):
    """
    Notify Django API about person detection
    
    Args:
        timestamp: Detection timestamp (ISO format string)
        confidence: Detection confidence (float)
        filepath: Path to the saved image
    
    Returns:
        bool: True if notification was successful, False otherwise
    """
    try:
        # We'll skip authentication since we've modified the API to not require it
        
        # Prepare data for API call
        data = {
            'timestamp': timestamp,
            'confidence': confidence
        }
        
        # Make API call to notify Django
        logger.info(f"Notifying Django API about person detection: {data}")
        
        max_retries = 3
        retry_count = 0
        success = False
        
        while retry_count < max_retries and not success:
            try:
                response = requests.post(
                    PERSON_DETECTED_ENDPOINT,
                    json=data,
                    timeout=5
                )
                
                if response.status_code == 200:
                    logger.info(f"Django API notified successfully: {response.json()}")
                    success = True
                    return True
                else:
                    logger.error(f"Failed to notify Django API: {response.status_code} {response.text}")
                    retry_count += 1
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error: {e}")
                retry_count += 1
                time.sleep(1)  # Wait before retrying
        
        if not success:
            logger.error(f"Failed to notify Django API after {max_retries} attempts")
            return False
            
    except Exception as e:
        logger.error(f"Error notifying Django API: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def upload_image_to_api(filepath, filename, timestamp):
    """
    Upload image to Django API
    
    Args:
        filepath: Path to the image file
        filename: Name of the image file
        timestamp: Detection timestamp
    
    Returns:
        bool: True if upload was successful, False otherwise
    """
    try:
        # We'll skip authentication since we've modified the API to not require it
        
        # Prepare the image for upload
        with open(filepath, 'rb') as f:
            image_data = f.read()
        
        files = {'image': (filename, image_data, 'image/jpeg')}
        data = {'timestamp': timestamp}
        
        # Make API call to upload image
        logger.info(f"Uploading image to Django API: {filename}")
        
        max_retries = 3
        retry_count = 0
        success = False
        
        while retry_count < max_retries and not success:
            try:
                response = requests.post(
                    UPLOAD_IMAGE_ENDPOINT,
                    files=files,
                    data=data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    logger.info(f"Image uploaded successfully: {response.json()}")
                    success = True
                    return True
                else:
                    logger.error(f"Failed to upload image: {response.status_code} {response.text}")
                    retry_count += 1
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error during image upload: {e}")
                retry_count += 1
                time.sleep(1)  # Wait before retrying
        
        if not success:
            logger.error(f"Failed to upload image after {max_retries} attempts")
            return False
            
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def capture_and_detect(output_dir, confidence_threshold=0.4, interval=2.0, display=False, notify_api=True):
    """
    Main function to capture video feed and detect people
    
    Args:
        output_dir: Directory to save detected person images
        confidence_threshold: Minimum confidence to consider as a valid detection
        interval: Minimum time between captures in seconds
        display: Whether to display video feed with detections
        notify_api: Whether to notify the Django API about detections
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    logger.info(f"Saving detected person images to: {output_dir}")
    
    # Initialize OpenCV's HOG detector
    logger.info("Initializing OpenCV HOG person detector")
    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
    
    # Initialize camera
    logger.info("Initializing camera")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        logger.error("Failed to open camera")
        return False
    
    # Set camera properties for better performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    logger.info(f"Starting person detection with confidence threshold: {confidence_threshold}")
    
    # Variables to track captures
    last_capture_time = 0
    frame_count = 0
    fps_start_time = time.time()
    
    try:
        while True:
            # Capture frame
            ret, frame = cap.read()
            if not ret:
                logger.error("Failed to read frame from camera")
                time.sleep(1)
                continue
            
            # Count frames for FPS calculation
            frame_count += 1
            if frame_count % 30 == 0:
                current_time = time.time()
                fps = 30 / (current_time - fps_start_time)
                fps_start_time = current_time
                logger.debug(f"Current FPS: {fps:.1f}")
            
            # Check if enough time has passed since last capture
            current_time = time.time()
            if current_time - last_capture_time < interval:
                # Skip detection if interval hasn't passed
                if display:
                    cv2.imshow('Live Feed', frame)
                    if cv2.waitKey(1) == ord('q'):
                        break
                continue
            
            # Run person detection
            start_time = time.time()
            # Detect people in the image using HOG
            # Returns bounding boxes and weights (confidence scores)
            boxes, weights = hog.detectMultiScale(
                frame, 
                winStride=(8, 8),
                padding=(4, 4), 
                scale=1.05,
                useMeanshiftGrouping=False
            )
            
            detection_time = time.time() - start_time
            
            # Filter detections by confidence
            valid_detections = []
            for i, (x, y, w, h) in enumerate(boxes):
                if weights[i] >= confidence_threshold:
                    valid_detections.append((x, y, w, h, weights[i]))
            
            # If people detected with sufficient confidence
            if valid_detections:
                # Get best detection (highest confidence)
                best_detection = max(valid_detections, key=lambda x: x[4])
                x, y, w, h, confidence = best_detection
                
                logger.info(f"Person detected with confidence: {confidence:.4f}")
                
                # Draw detection on frame
                detection_frame = frame.copy()
                cv2.rectangle(detection_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(detection_frame, f"Person: {confidence:.2f}", 
                           (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                # Generate timestamp for filename
                timestamp = datetime.now()
                timestamp_str = timestamp.strftime('%Y%m%d_%H%M%S')
                filename = f"person_detected_{timestamp_str}.jpg"
                filepath = os.path.join(output_dir, filename)
                
                # Save the image with detection visualization
                cv2.imwrite(filepath, detection_frame)
                logger.info(f"Saved detection image to {filepath}")
                
                # Save metadata as JSON
                metadata_filename = os.path.splitext(filename)[0] + "_metadata.json"
                metadata_filepath = os.path.join(output_dir, metadata_filename)
                
                # Create metadata
                metadata = {
                    'timestamp': timestamp.isoformat(),
                    'confidence': float(confidence),
                    'bbox': [int(x), int(y), int(w), int(h)],
                    'detection_time': detection_time,
                    'filename': filename
                }
                
                # Save metadata to JSON file
                with open(metadata_filepath, 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                logger.info(f"Saved detection metadata to {metadata_filepath}")
                
                # Notify Django API about the detection
                if notify_api:
                    api_success = notify_django_api(
                        timestamp=timestamp.isoformat(),
                        confidence=float(confidence),
                        filepath=filepath
                    )
                    if api_success:
                        logger.info("Successfully notified Django API about person detection")
                    else:
                        logger.warning("Failed to notify Django API, detection may not appear in logs")
                        
                    # Upload the image to Django API
                    upload_success = upload_image_to_api(
                        filepath=filepath,
                        filename=filename,
                        timestamp=timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    )
                    if upload_success:
                        logger.info("Successfully uploaded image to Django API")
                    else:
                        logger.warning("Failed to upload image to Django API")
                
                # Update last capture time
                last_capture_time = current_time
            else:
                logger.debug(f"No person detected with confidence above {confidence_threshold}")
            
            # Display video feed if enabled
            if display:
                # Draw all detections
                display_frame = frame.copy()
                for detection in valid_detections:
                    x, y, w, h, conf = detection
                    cv2.rectangle(display_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                    cv2.putText(display_frame, f"{conf:.2f}", (x, y - 5), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                
                cv2.imshow('Person Detection', display_frame)
                if cv2.waitKey(1) == ord('q'):
                    break
    
    except KeyboardInterrupt:
        logger.info("Detection stopped by user")
    except Exception as e:
        logger.error(f"Error during detection: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        # Release resources
        cap.release()
        if display:
            cv2.destroyAllWindows()
        logger.info("Cleaned up resources")
    
    return True

def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Detect people and capture images using OpenCV')
    parser.add_argument('--output', type=str, default='captured_images',
                        help='Output directory for captured images')
    parser.add_argument('--confidence', type=float, default=0.3,
                        help='Confidence threshold for person detection (0.0-1.0)')
    parser.add_argument('--interval', type=float, default=2.0,
                        help='Minimum interval between captures in seconds')
    parser.add_argument('--display', action='store_true',
                        help='Display video feed with detections')
    parser.add_argument('--no-api', action='store_true',
                        help='Disable API notifications (for standalone use)')
    args = parser.parse_args()
    
    # Make output path absolute if it's relative
    if not os.path.isabs(args.output):
        args.output = os.path.join(os.getcwd(), args.output)
    
    # Run detection and capture
    success = capture_and_detect(
        args.output,
        confidence_threshold=args.confidence,
        interval=args.interval,
        display=args.display,
        notify_api=not args.no_api
    )
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main()) 