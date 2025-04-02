#!/bin/zsh

# Check if all required services are running
echo "===== Checking YOLOv7 Background Detection Services ====="

# Check Django backend
echo -n "Django backend (port 8000): "
if lsof -ti :8000 > /dev/null; then
    echo "✅ Running"
    PID=$(lsof -ti :8000)
    echo "  PID: $PID"
else
    echo "❌ Not running"
fi

# Check WebSocket camera relay
echo -n "Camera relay (port 8765): "
if lsof -ti :8765 > /dev/null; then
    echo "✅ Running"
    PID=$(lsof -ti :8765)
    echo "  PID: $PID"
else
    echo "❌ Not running"
fi

# Check frontend server
echo -n "Frontend server (port 9090): "
if lsof -ti :9090 > /dev/null; then
    echo "✅ Running"
    PID=$(lsof -ti :9090)
    echo "  PID: $PID"
else
    echo "❌ Not running"
fi

# Check Nginx
echo -n "Nginx server: "
if pgrep -x nginx > /dev/null; then
    echo "✅ Running"
    PID=$(pgrep -x nginx)
    echo "  PID: $PID"
else
    echo "❌ Not running"
fi

# Check YOLOv7 detection process
echo -n "YOLOv7 detector: "
if pgrep -f "python.*detect.py" > /dev/null; then
    echo "✅ Running"
    PID=$(pgrep -f "python.*detect.py")
    echo "  PID: $PID"
else
    echo "❌ Not running"
fi

# Display recent logs
echo "\n===== Recent Logs ====="

echo "\nYOLOv7 Detection Log (last 10 lines):"
if [ -f "/Users/dondon/Library/Logs/yolo-detection.log" ]; then
    tail -n 10 "/Users/dondon/Library/Logs/yolo-detection.log"
else
    echo "Log file not found"
fi

echo "\nFrontend Server Log (last 10 lines):"
if [ -f "/Users/dondon/Library/Logs/frontend-yolo.log" ]; then
    tail -n 10 "/Users/dondon/Library/Logs/frontend-yolo.log"
else
    echo "Log file not found"
fi

echo "\n===== Background Mode Status ====="
echo -n "YOLO_AUTO_START: "
if env | grep -q "YOLO_AUTO_START=1"; then
    echo "✅ Enabled"
else
    echo "❌ Disabled"
fi

echo -n "YOLO_BACKGROUND_MODE: "
if env | grep -q "YOLO_BACKGROUND_MODE=1"; then
    echo "✅ Enabled"
else
    echo "❌ Disabled"
fi

echo -n "NO_CAMERA_BUTTON: "
if env | grep -q "NO_CAMERA_BUTTON=1"; then
    echo "✅ Enabled"
else
    echo "❌ Disabled"
fi

echo "\n===== How to Fix Issues ====="
echo "If any service is not running, try restarting the system:"
echo "./restart_background_detection.sh"
echo "\nTo manually start a specific service:"
echo "- Django backend: cd server && gunicorn..."
echo "- Camera relay: cd server && python camera_relay.py"
echo "- Frontend: cd client/dist && python serve.py"
echo "- Nginx: sudo nginx -c /Users/dondon/Code/ass-django/nginx-https.conf" 