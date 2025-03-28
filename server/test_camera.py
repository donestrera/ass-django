#!/usr/bin/env python3
"""
Test script for camera functionality.
This script tests if the camera can be accessed and captures an image.
"""

import os
import sys
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main function to test camera functionality"""
    try:
        # Add the current directory to the path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        sys.path.append(current_dir)
        
        # Import the camera module
        try:
            from camera import capture_and_upload_and_save, test_camera_access
            logger.info("Successfully imported camera module")
        except ImportError as e:
            logger.error(f"Failed to import camera module: {e}")
            return False
        
        # Test camera access
        logger.info("Testing camera access...")
        if not test_camera_access():
            logger.error("Camera access test failed")
            return False
        
        logger.info("Camera access test passed")
        
        # Create a test directory
        test_dir = os.path.join(current_dir, 'test_images')
        os.makedirs(test_dir, exist_ok=True)
        logger.info(f"Created test directory: {test_dir}")
        
        # Capture an image
        timestamp = time.strftime('%Y%m%d_%H%M%S')
        filename = f"test_capture_{timestamp}.jpg"
        logger.info(f"Capturing image with filename: {filename}")
        
        # We're not uploading to an API in this test, so we'll use a dummy URL
        result = capture_and_upload_and_save(
            api_url="http://localhost:8000/dummy",
            save_dir=test_dir,
            filename=filename,
            capture_delay=1
        )
        
        if result:
            logger.info(f"Image captured successfully: {result}")
            logger.info(f"Check the file at: {result}")
            return True
        else:
            logger.error("Image capture failed")
            return False
            
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("Camera test completed successfully")
        sys.exit(0)
    else:
        logger.error("Camera test failed")
        sys.exit(1) 