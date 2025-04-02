#!/bin/bash
# Installation script for YOLOv7 dependencies

# Set error handling
set -e

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing YOLOv7 dependencies...${NC}"

# Check if we're in a virtual environment
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo -e "${YELLOW}Warning: Not running in a virtual environment.${NC}"
    echo -e "${YELLOW}It's recommended to install dependencies in a virtual environment.${NC}"
    echo -e "${YELLOW}Would you like to proceed anyway? [y/N]${NC}"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${RED}Installation cancelled.${NC}"
        exit 1
    fi
fi

# Get the directory of this script
SCRIPT_DIR=$(dirname "$0")
SERVER_DIR=$(dirname "$SCRIPT_DIR")/server

# Install PyTorch and other dependencies from requirements.txt
if [ -f "$SERVER_DIR/requirements.txt" ]; then
    echo -e "${GREEN}Installing dependencies from requirements.txt...${NC}"
    pip install -r "$SERVER_DIR/requirements.txt"
else
    echo -e "${YELLOW}requirements.txt not found, installing critical dependencies only...${NC}"
    pip install torch torchvision numpy opencv-python Pillow
fi

# Check if YOLOv7 model exists
if [ ! -f "$SCRIPT_DIR/yolov7-tiny.pt" ]; then
    echo -e "${YELLOW}YOLOv7 model not found. Downloading...${NC}"
    # Try to download the model - this requires wget
    if command -v wget &> /dev/null; then
        cd "$SCRIPT_DIR" && wget -q https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.pt
    else
        echo -e "${RED}wget command not found. Please download yolov7-tiny.pt manually and place it in ${SCRIPT_DIR}${NC}"
        echo -e "${RED}You can download it from: https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.pt${NC}"
        exit 1
    fi
fi

# Test the detector
echo -e "${GREEN}Testing YOLOv7 detector...${NC}"
cd "$SCRIPT_DIR" && python3 -c "
import sys
try:
    import torch
    import numpy as np
    import cv2
    print('PyTorch version:', torch.__version__)
    print('CUDA available:', torch.cuda.is_available())
    if torch.cuda.is_available():
        print('CUDA version:', torch.version.cuda)
    print('OpenCV version:', cv2.__version__)
    print('All dependencies installed successfully!')
    
    # Try to import our detector
    try:
        import yolo_detector
        print('YOLOv7 detector can be imported successfully!')
        # Try to create a detector
        try:
            detector = yolo_detector.load_detector()
            if detector is not None:
                print('YOLOv7 detector created successfully!')
                print('Installation completed successfully!')
            else:
                print('Error creating YOLOv7 detector. Check the model file.')
        except Exception as e:
            print('Error creating detector:', e)
    except ImportError as e:
        print('Error importing yolo_detector:', e)
        print('Make sure yolo_detector.py is in the current directory.')
except ImportError as e:
    print('Error importing dependencies:', e)
    print('Installation may not be complete. Please check error messages.')
    sys.exit(1)
"

# Set permissions
chmod +x "$SCRIPT_DIR/install_yolo_deps.sh"

echo -e "${GREEN}Installation script completed!${NC}"
echo -e "${GREEN}To use YOLOv7 for person detection, set the following environment variables:${NC}"
echo -e "${YELLOW}export YOLO_BACKGROUND_MODE=1${NC}"
echo -e "${YELLOW}export CAPTURE_ON_DETECTION=1${NC}"
echo -e "${YELLOW}export SAVE_DETECTION_IMAGES=1${NC}" 