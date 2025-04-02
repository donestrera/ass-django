# Background Detection Mode

The system now supports running YOLOv7 object detection in the background without requiring the website to be open.

## Features

- **Automatic Detection:** The system automatically starts detecting objects when the services are started.
- **No User Interaction Required:** No need to press "Start Camera" or "Start Detection" buttons.
- **Background Processing:** Detection continues even when the website is closed.
- **Image Capture:** Automatically captures images when people are detected.
- **Web Interface:** You can still access the web interface to view the camera feed and detection logs.

## How to Enable Background Mode

Background mode is enabled by default when you start the services. To use it:

1. Run the setup script to install dependencies:
   ```
   cd server
   chmod +x install_background_deps.sh
   ./install_background_deps.sh
   ```

2. Start all services:
   ```
   ./start_services.sh
   ```

3. Visit http://localhost:9090 in your browser at least once to:
   - Grant camera permissions for the background service
   - Verify everything is working correctly

4. The system will continue running even after you close the browser.

## How It Works

The background detection uses a camera relay system:

1. **Direct Camera Access:** The system tries to access the camera directly. On macOS, this may require granting permissions first.

2. **Fallback Mode:** If direct camera access isn't available, the system will wait for a browser to connect, then use that connection as a camera source.

3. **Detection Service:** The YOLOv7 detector processes frames in the background and sends notifications when people are detected.

4. **Image Capture:** When a person is detected, the system captures an image and stores it in the database.

## Troubleshooting

- **Camera Access Issues:** If the system can't access your camera directly, visit http://localhost:9090 at least once with your browser to grant camera permissions.

- **Check Logs:** If you're experiencing issues, check the logs at:
  ```
  /Users/dondon/Library/Logs/yolo-detection.log
  ```

- **Restart Services:** If the detection isn't working, try restarting all services:
  ```
  pkill -f 'gunicorn|camera_relay|http.server'
  ./start_services.sh
  ```

## Auto-Start on System Boot

To make the background detection start automatically when your system boots:

1. Install the launchd service:
   ```
   cp yolo-detection-plist.plist ~/Library/LaunchAgents/com.dondon.yolo-detection.plist
   launchctl load ~/Library/LaunchAgents/com.dondon.yolo-detection.plist
   ```

2. The service will now start automatically on system login. 