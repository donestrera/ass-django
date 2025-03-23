#!/usr/bin/env python3
"""
Script to install OpenCV and test camera functionality.
"""

import os
import sys
import subprocess
import logging
import time
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Log to stdout
        logging.FileHandler('camera_test.log')  # Log to file
    ]
)
logger = logging.getLogger(__name__)

def install_opencv():
    """Install OpenCV if not already installed"""
    try:
        # Try to import cv2
        try:
            import cv2
            logger.info(f"OpenCV is already installed (version: {cv2.__version__})")
            return True
        except ImportError:
            logger.info("OpenCV not found, installing...")
            
            # Install OpenCV
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'install', 'opencv-python'],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                logger.info("OpenCV installed successfully")
                return True
            else:
                logger.error(f"Failed to install OpenCV: {result.stderr}")
                return False
    except Exception as e:
        logger.error(f"Error installing OpenCV: {e}")
        return False

def test_camera():
    """Test camera functionality"""
    try:
        logger.info("Importing cv2...")
        import cv2
        logger.info(f"OpenCV version: {cv2.__version__}")
        
        logger.info("Testing camera access...")
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.error("Cannot open webcam")
            return False
        
        logger.info("Camera opened successfully")
        
        # Capture a frame
        logger.info("Capturing frame...")
        ret, frame = cap.read()
        if not ret:
            logger.error("Could not read frame")
            return False
        
        logger.info(f"Frame captured successfully. Shape: {frame.shape}")
        
        # Get the absolute path to the media directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        media_dir = os.path.join(current_dir, 'media', 'captured_images')
        
        # Create directory if it doesn't exist
        os.makedirs(media_dir, exist_ok=True)
        logger.info(f"Ensured media directory exists: {media_dir}")
        
        # Save the captured frame
        timestamp = time.strftime('%Y%m%d_%H%M%S')
        filename = f"test_capture_{timestamp}.jpg"
        filepath = os.path.join(media_dir, filename)
        
        logger.info(f"Saving image to: {filepath}")
        success = cv2.imwrite(filepath, frame)
        logger.info(f"cv2.imwrite result: {success}")
        
        if os.path.exists(filepath):
            logger.info(f"Image saved successfully to: {filepath}")
            logger.info(f"File size: {os.path.getsize(filepath)} bytes")
            return True
        else:
            logger.error(f"Failed to save image to: {filepath}")
            
            # Try an alternative method to save the image
            logger.info("Trying alternative method to save image...")
            ret, img_encoded = cv2.imencode('.jpg', frame)
            if not ret:
                logger.error("Could not encode image")
                return False
                
            image_bytes = img_encoded.tobytes()
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
                
            if os.path.exists(filepath):
                logger.info(f"Image saved successfully using alternative method: {filepath}")
                logger.info(f"File size: {os.path.getsize(filepath)} bytes")
                return True
            else:
                logger.error("Alternative method also failed")
                return False
    except Exception as e:
        logger.error(f"Error testing camera: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False
    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
            logger.info("Camera released")
        if 'cv2' in sys.modules:
            cv2.destroyAllWindows()
            logger.info("All windows destroyed")

def main():
    """Main function"""
    try:
        logger.info("Starting camera setup and test")
        logger.info(f"Python version: {sys.version}")
        logger.info(f"Current directory: {os.getcwd()}")
        
        # Install OpenCV
        if not install_opencv():
            logger.error("Failed to install OpenCV")
            return False
        
        # Test camera
        if not test_camera():
            logger.error("Camera test failed")
            return False
        
        logger.info("Camera setup and test completed successfully")
        return True
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("Setup and test completed successfully")
        sys.exit(0)
    else:
        logger.error("Setup and test failed")
        sys.exit(1) 