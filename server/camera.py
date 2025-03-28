import cv2
import os
import requests
import time
import logging
import sys
from pathlib import Path
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('camera.log')
    ]
)
logger = logging.getLogger(__name__)

def capture_and_upload_and_save(api_url, save_dir="captured_images", filename="captured_image.jpg", capture_delay=2, add_visual_info=True):
    """
    Captures an image from the webcam, saves it to a directory, and uploads it to an API.

    Args:
        api_url: The URL of the API endpoint.
        save_dir: The directory to save the image to.
        filename: The name of the saved image file.
        capture_delay: Time in seconds to wait before capturing.
        add_visual_info: Whether to add visual information about person detection.
    """

    try:
        logger.info(f"Starting camera capture with save_dir={save_dir}, filename={filename}")
        
        # Ensure save_dir is an absolute path
        if not os.path.isabs(save_dir):
            logger.warning(f"save_dir is not an absolute path: {save_dir}")
            # Make it absolute based on the current script directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            save_dir = os.path.join(current_dir, save_dir)
            logger.info(f"Converted to absolute path: {save_dir}")
        
        # Create directory if it doesn't exist
        os.makedirs(save_dir, exist_ok=True)
        logger.info(f"Ensured directory exists: {save_dir}")
        
        # Initialize camera
        logger.info("Initializing camera...")
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.error("Cannot open webcam. Check camera permissions.")
            raise IOError("Cannot open webcam. Check camera permissions.")

        logger.info(f"Waiting {capture_delay} seconds before capture...")
        time.sleep(capture_delay)

        # Capture frame
        logger.info("Capturing frame...")
        ret, frame = cap.read()
        if not ret:
            logger.error("Could not read frame")
            raise IOError("Could not read frame")
        
        logger.info(f"Frame captured successfully. Shape: {frame.shape}")

        # Add visual information if requested
        if add_visual_info and "person_detected" in filename:
            frame = add_detection_info(frame)

        # Save to file
        filepath = os.path.join(save_dir, filename)
        logger.info(f"Saving image to: {filepath}")
        
        # Try direct save first
        success = cv2.imwrite(filepath, frame)
        if not success:
            logger.warning("Direct save with cv2.imwrite failed, trying alternative method")
            # Try alternative method
            ret, img_encoded = cv2.imencode('.jpg', frame)
            if not ret:
                logger.error("Could not encode image")
                raise IOError("Could not encode image")

            image_bytes = img_encoded.tobytes()
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
        
        # Verify file was saved
        if os.path.exists(filepath):
            logger.info(f"Image saved successfully to: {filepath}")
            logger.info(f"File size: {os.path.getsize(filepath)} bytes")
        else:
            logger.error(f"Failed to save image to: {filepath}")
            raise IOError(f"Failed to save image to: {filepath}")

        # Upload to API
        logger.info(f"Uploading image to API: {api_url}")
        try:
            # Prepare the image for upload
            with open(filepath, 'rb') as f:
                image_data = f.read()
            
            files = {'image': (filename, image_data, 'image/jpeg')}
            data = {'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')}

            response = requests.post(api_url, files=files, data=data, timeout=10)
            response.raise_for_status()
            logger.info(f"Image uploaded successfully. Response: {response.json()}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error uploading image: {e}")
            # Continue execution even if upload fails - we still have the saved image

        return filepath  # Return the path where the image was saved

    except IOError as e:
        logger.error(f"Error capturing/saving image: {e}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None
    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
            logger.info("Camera released")
        cv2.destroyAllWindows()
        logger.info("All windows destroyed")

def add_detection_info(frame):
    """
    Add visual information to the frame indicating person detection.
    
    Args:
        frame: The image frame to add information to.
        
    Returns:
        The modified frame with visual information.
    """
    try:
        height, width = frame.shape[:2]
        
        # Add a semi-transparent red border to indicate detection
        border_thickness = int(min(width, height) * 0.03)  # 3% of the smaller dimension
        overlay = frame.copy()
        
        # Draw red border
        cv2.rectangle(overlay, (0, 0), (width, height), (0, 0, 255), border_thickness)
        
        # Add text banner at the top
        banner_height = int(height * 0.08)  # 8% of the height
        cv2.rectangle(overlay, (0, 0), (width, banner_height), (0, 0, 255), -1)
        
        # Add text
        font = cv2.FONT_HERSHEY_SIMPLEX
        text = "PERSON DETECTED"
        font_scale = min(width, height) * 0.001  # Scale font based on image size
        text_size = cv2.getTextSize(text, font, font_scale, 2)[0]
        text_x = (width - text_size[0]) // 2
        text_y = banner_height - (banner_height - text_size[1]) // 2
        cv2.putText(overlay, text, (text_x, text_y), font, font_scale, (255, 255, 255), 2)
        
        # Add timestamp
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        timestamp_scale = font_scale * 0.7
        cv2.putText(overlay, timestamp, (10, height - 10), font, timestamp_scale, (0, 0, 255), 2)
        
        # Blend the overlay with the original frame
        alpha = 0.7  # Transparency factor
        cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
        
        return frame
    except Exception as e:
        logger.error(f"Error adding detection info to frame: {e}")
        return frame  # Return original frame if there's an error

# Test function to check camera access
def test_camera_access():
    """Test if the camera can be accessed"""
    try:
        logger.info("Testing camera access...")
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.error("Cannot open webcam. Check camera permissions.")
            return False
        
        ret, frame = cap.read()
        if not ret:
            logger.error("Could not read frame")
            return False
        
        logger.info(f"Camera test successful. Frame shape: {frame.shape}")
        return True
    except Exception as e:
        logger.error(f"Camera test failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False
    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        cv2.destroyAllWindows()

# Example usage (commented out to prevent automatic execution)
# api_endpoint = "http://localhost:8000/api/upload-image/"
# current_dir = os.path.dirname(os.path.abspath(__file__))
# save_directory = os.path.join(current_dir, "media", "captured_images")
# capture_and_upload_and_save(api_endpoint, save_dir=save_directory, filename="person.jpg")
