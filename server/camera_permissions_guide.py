#!/usr/bin/env python3
"""
Guide for granting camera permissions on macOS.
"""

import os
import sys
import subprocess
import logging
import webbrowser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Main function to guide the user through camera permissions"""
    logger.info("Camera Permission Guide for macOS")
    logger.info("=================================")
    logger.info("")
    logger.info("The error 'not authorized to capture video' indicates that your terminal")
    logger.info("application doesn't have permission to access the camera.")
    logger.info("")
    logger.info("To fix this issue, follow these steps:")
    logger.info("")
    logger.info("1. Open System Preferences/Settings")
    logger.info("2. Go to 'Security & Privacy' or 'Privacy & Security'")
    logger.info("3. Select 'Camera' from the left sidebar")
    logger.info("4. Make sure your terminal application (Terminal or iTerm) is checked")
    logger.info("5. If it's not in the list, you may need to run the camera application once")
    logger.info("   and then grant permission when prompted")
    logger.info("")
    logger.info("Would you like to open the Privacy settings now? (y/n)")
    
    response = input().strip().lower()
    if response == 'y':
        # Open Privacy settings
        try:
            # For newer macOS versions
            subprocess.run(['open', 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'])
            logger.info("")
            logger.info("Privacy settings opened. Please grant camera access to Terminal/iTerm.")
            logger.info("After granting permission, you may need to restart your terminal.")
        except Exception as e:
            logger.error(f"Failed to open Privacy settings: {e}")
            logger.info("")
            logger.info("Please open System Preferences/Settings manually and navigate to")
            logger.info("Privacy & Security > Camera")
    
    logger.info("")
    logger.info("After granting permission, run the setup_and_test_camera.py script again.")
    
    return True

if __name__ == "__main__":
    main() 