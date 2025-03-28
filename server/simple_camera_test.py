#!/usr/bin/env python3
"""
Simple test script for camera functionality.
This script tests if the camera device is accessible without using OpenCV.
"""

import os
import sys
import logging
import platform
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_camera_device_macos():
    """Check if camera device is accessible on macOS"""
    try:
        # On macOS, we can check for camera devices using system_profiler
        result = subprocess.run(
            ['system_profiler', 'SPCameraDataType'],
            capture_output=True,
            text=True,
            check=False
        )
        
        if "Camera" in result.stdout:
            logger.info("Camera device found:")
            for line in result.stdout.splitlines():
                if line.strip():
                    logger.info(f"  {line.strip()}")
            return True
        else:
            logger.error("No camera device found")
            return False
    except Exception as e:
        logger.error(f"Error checking camera device: {e}")
        return False

def check_media_directory():
    """Check if media directory exists and is writable"""
    try:
        # Get the absolute path to the media directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        media_dir = os.path.join(current_dir, 'media', 'captured_images')
        
        # Check if directory exists
        if os.path.exists(media_dir):
            logger.info(f"Media directory exists: {media_dir}")
            
            # Check if directory is writable
            if os.access(media_dir, os.W_OK):
                logger.info("Media directory is writable")
                
                # List contents of the directory
                files = os.listdir(media_dir)
                logger.info(f"Media directory contains {len(files)} files")
                return True
            else:
                logger.error("Media directory is not writable")
                return False
        else:
            logger.error(f"Media directory does not exist: {media_dir}")
            # Try to create it
            try:
                os.makedirs(media_dir, exist_ok=True)
                logger.info(f"Created media directory: {media_dir}")
                return True
            except Exception as e:
                logger.error(f"Failed to create media directory: {e}")
                return False
    except Exception as e:
        logger.error(f"Error checking media directory: {e}")
        return False

def main():
    """Main function to test camera functionality"""
    try:
        logger.info(f"Running on {platform.system()} {platform.release()}")
        
        # Check camera device
        if platform.system() == "Darwin":  # macOS
            camera_available = check_camera_device_macos()
        else:
            logger.error(f"Unsupported platform: {platform.system()}")
            return False
        
        # Check media directory
        media_dir_ok = check_media_directory()
        
        return camera_available and media_dir_ok
            
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