#!/bin/zsh

# Install dependencies required for background detection mode

echo "===== Installing dependencies for background detection mode ====="

# Activate virtual environment
cd "$(dirname "$0")"
source venv/bin/activate

# Install OpenCV and other required packages
pip install opencv-python numpy requests websockets

# Test whether camera can be accessed in background mode
echo "===== Testing camera access ====="
python -c "
import cv2
import time

print('Opening camera...')
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print('ERROR: Cannot open camera!')
    exit(1)

print('Reading frame...')
ret, frame = cap.read()
if not ret:
    print('ERROR: Cannot read frame from camera!')
    cap.release()
    exit(1)

print('Camera test successful! Frame shape:', frame.shape)
print('Taking test image...')

# Save test image
cv2.imwrite('camera_test.jpg', frame)
print('Saved test image to: camera_test.jpg')

cap.release()
print('Camera released')
print('Background mode setup completed successfully!')
"

echo "===== Setup complete ====="
echo "You can now run the system in background mode"
echo "The detection will run automatically without user interaction" 