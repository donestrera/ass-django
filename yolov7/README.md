# YOLOv7 Person Detection

This module provides person detection capabilities using YOLOv7, a state-of-the-art object detection model.

## Features

- Real-time person detection using YOLOv7
- Automatic image capture when a person is detected
- Saving of detection metadata (bounding boxes, confidence scores)
- Visualization of detection results with bounding boxes
- Fallback to OpenCV HOG detector if YOLOv7 fails

## Installation

1. Install the required dependencies:

```bash
# Make the installation script executable
chmod +x install_yolo_deps.sh

# Run the installation script
./install_yolo_deps.sh
```

2. Ensure the YOLOv7 model is available:
   - The model file should be located at `yolov7/yolov7-tiny.pt`
   - The installation script will attempt to download it if not present

## Configuration

The detection behavior can be configured using environment variables in `server/.env`:

```
# Enable background mode (direct camera capture)
YOLO_BACKGROUND_MODE=1

# Enable automatic image capturing
AUTO_CAPTURE=1

# Capture images when a person is detected
CAPTURE_ON_DETECTION=1

# Save detection images with bounding boxes
SAVE_DETECTION_IMAGES=1
```

## Usage

The YOLOv7 detector will be automatically used when the camera relay server is running. It will:

1. Capture video frames from the camera
2. Process frames for person detection using YOLOv7
3. Save images with bounding boxes when a person is detected
4. Log detection events to the console and log file
5. Notify the API about person detection events

## Captured Images

Detected person images are saved to `server/media/captured_images/` with the following naming pattern:
- Image file: `person_detected_YYYYMMDD_HHMMSS.jpg`
- Metadata file: `person_detected_YYYYMMDD_HHMMSS_metadata.json`

The metadata file contains:
- Timestamp of detection
- Bounding box coordinates
- Confidence scores
- Class labels

## Troubleshooting

If you encounter issues with the YOLOv7 detector:

1. Check the logs for error messages:
   - `yolo_detector.log` for detector-specific issues
   - `camera_relay.log` for general camera and detection issues

2. Verify model availability:
   - Ensure `yolov7-tiny.pt` exists in the `yolov7/` directory

3. Test the detector:
   - Run `python -m yolov7.yolo_detector` to test the detector independently

If YOLOv7 detection fails, the system will automatically fall back to using OpenCV's HOG detector for basic person detection. 