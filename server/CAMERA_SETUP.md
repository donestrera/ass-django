# Camera Setup Guide

This guide will help you set up and test the camera functionality for the application.

## Prerequisites

- Python 3.6 or higher
- OpenCV library (will be installed by the setup script)
- Camera access permissions for your terminal application

## Camera Permission Issues on macOS

If you encounter the error `not authorized to capture video` or `camera failed to properly initialize`, it means your terminal application doesn't have permission to access the camera.

### Granting Camera Permissions on macOS

1. Open System Preferences/Settings
2. Go to 'Security & Privacy' or 'Privacy & Security'
3. Select 'Camera' from the left sidebar
4. Make sure your terminal application (Terminal or iTerm) is checked
5. If it's not in the list, you may need to run the camera application once and then grant permission when prompted
6. After granting permission, you may need to restart your terminal

You can open the Privacy settings directly by running:

```bash
open x-apple.systempreferences:com.apple.preference.security?Privacy_Camera
```

## Setup and Testing

1. Run the setup and test script:

```bash
python3 setup_and_test_camera.py
```

This script will:

- Install OpenCV if not already installed
- Test camera access
- Capture a test image and save it to the `media/captured_images` directory

2. If the test is successful, you should see a message indicating that the camera test completed successfully.

3. Check the `media/captured_images` directory for the captured test image.

## Troubleshooting

### Camera Not Found

If the camera is not found, make sure:

- Your camera is connected and working
- Your terminal application has permission to access the camera (see above)
- No other application is currently using the camera

### Image Not Saved

If the image is not saved, make sure:

- The `media/captured_images` directory exists and is writable
- The script has permission to write to the directory
- There is enough disk space

### OpenCV Installation Issues

If OpenCV fails to install, try:

- Installing it manually: `pip install opencv-python`
- Checking for any error messages during installation
- Ensuring you have the necessary dependencies installed

## Integration with the Application

Once the camera setup is working, the application will:

1. Capture images when motion is detected
2. Save the images to the `media/captured_images` directory
3. Display the images in the web interface

## Additional Resources

- [OpenCV Documentation](https://docs.opencv.org/)
- [Python Camera Access Guide](https://docs.python.org/3/library/camera.html)
- [macOS Privacy Settings Guide](https://support.apple.com/guide/mac-help/control-access-to-your-camera-mchlf6d108da/mac)
