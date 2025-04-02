#!/bin/bash

# ========================================================
# Complete System Deployment Script with Nginx
# ========================================================

# Set the base directory to the script location
cd "$(dirname "$0")"
BASE_DIR="$(pwd)"
LOG_DIR="/Users/dondon/Library/Logs"
CAPTURE_DIR="$BASE_DIR/captured_images"
NGINX_CONF_PATH="$BASE_DIR/nginx-https.conf"

# Create needed directories
mkdir -p "$LOG_DIR"
mkdir -p "$CAPTURE_DIR"

# Print banner
echo ""
echo "========================================================="
echo "      Starting Person Detection System with Nginx        "
echo "========================================================="
echo "Base directory: $BASE_DIR"
echo ""

# Function to check if a port is in use
check_port() {
    lsof -i ":$1" &>/dev/null
    return $?
}

# Function to kill all processes
kill_all_processes() {
    echo "Stopping any existing processes..."
    
    # Stop nginx first
    nginx -s stop 2>/dev/null || true
    
    # Kill django and related processes
    pkill -f "gunicorn.*config.wsgi" || true
    pkill -f "camera_relay.py" || true
    pkill -f "simple_capture.py" || true
    
    # Kill anything on specific ports
    for port in 80 443 8000 8765 9090; do
        if check_port $port; then
            echo "Killing processes on port $port..."
            lsof -ti :$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    echo "Waiting for system to settle..."
    sleep 2
}

# Stop all running processes
kill_all_processes

# Verify directories
echo "Verifying system directories..."
for dir in server client yolov7; do
    if [ ! -d "$BASE_DIR/$dir" ]; then
        echo "Error: $dir directory not found at: $BASE_DIR/$dir"
        exit 1
    fi
done

# Verify SSL certificates
echo "Checking SSL certificates..."
SSL_DIR="$BASE_DIR/ssl"
if [ ! -f "$SSL_DIR/nginx-selfsigned.crt" ] || [ ! -f "$SSL_DIR/nginx-selfsigned.key" ]; then
    echo "SSL certificates not found. Generating self-signed certificates..."
    mkdir -p "$SSL_DIR"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/nginx-selfsigned.key" \
        -out "$SSL_DIR/nginx-selfsigned.crt" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    echo "Self-signed certificates generated."
else
    echo "SSL certificates found."
fi

# Build frontend
echo "Building client application..."
cd "$BASE_DIR/client"

# Find npm path
NPM_PATH=$(which npm 2>/dev/null || echo "/opt/homebrew/bin/npm")
if [ ! -x "$NPM_PATH" ]; then
    echo "Error: npm not found at $NPM_PATH. Please install npm."
    exit 1
fi

echo "Using npm at: $NPM_PATH"

# Clean and rebuild
if [ -d "$BASE_DIR/client/dist" ]; then
    echo "Removing previous build..."
    rm -rf "$BASE_DIR/client/dist"
fi

# Build the application
"$NPM_PATH" run build

# Verify build was successful
if [ ! -d "$BASE_DIR/client/dist" ]; then
    echo "Error: Failed to build client application"
    exit 1
fi

echo "Client application built successfully"
cd "$BASE_DIR"

# Start Django backend
echo "Starting Django backend on port 8000..."
cd "$BASE_DIR/server"

if [ ! -d "venv" ]; then
    echo "Error: Python virtual environment not found at: $BASE_DIR/server/venv"
    echo "Please set up the server environment first"
    exit 1
fi

source venv/bin/activate
python3 -m gunicorn --workers 3 --bind 127.0.0.1:8000 config.wsgi:application > "$LOG_DIR/django-yolo.log" 2>&1 &
DJANGO_PID=$\!
echo "Django backend started with PID: $DJANGO_PID"
deactivate

# Wait for Django to initialize
echo "Waiting for Django to initialize..."
for i in {1..30}; do
    if check_port 8000; then
        echo "Django is ready on port 8000\!"
        break
    fi
    echo "  Waiting for Django ($i/30)..."
    sleep 1
done

if \! check_port 8000; then
    echo "Error: Django server failed to start on port 8000"
    cat "$LOG_DIR/django-yolo.log" | tail -20
    exit 1
fi

# Start OpenCV Simple Capture
echo "Starting OpenCV Simple Capture service..."
cd "$BASE_DIR/yolov7"

CONFIDENCE=0.35
INTERVAL=2.0

# Make sure the script is executable
chmod +x "$BASE_DIR/yolov7/simple_capture.py"

# Start with proper parameters
python3 simple_capture.py --output "$CAPTURE_DIR" --confidence $CONFIDENCE --interval $INTERVAL > "$LOG_DIR/opencv-detection.log" 2>&1 &
SIMPLE_CAPTURE_PID=$\!
echo "OpenCV Simple Capture started with PID: $SIMPLE_CAPTURE_PID"

# Wait for service to initialize
sleep 2
echo "OpenCV Simple Capture service initialized"

# Camera relay service (optional)
CAMERA_PID=-1
read -p "Do you want to start the camera relay service? (y/n) " start_camera
if [[ "$start_camera" == "y" || "$start_camera" == "Y" ]]; then
    echo "Starting camera relay service on port 8765..."
    cd "$BASE_DIR/server"
    source venv/bin/activate
    BACKGROUND_MODE=true python3 camera_relay.py > "$LOG_DIR/yolo-detection.log" 2>&1 &
    CAMERA_PID=$\!
    echo "Camera relay started with PID: $CAMERA_PID"
    deactivate
    
    # Wait for camera relay to initialize
    sleep 2
    if \! check_port 8765; then
        echo "Warning: Camera relay service may not be fully initialized. Check logs at: $LOG_DIR/yolo-detection.log"
        tail -n 20 "$LOG_DIR/yolo-detection.log"
    else
        echo "Camera relay service initialized and running on port 8765"
    fi
fi

# Start Nginx with our configuration
echo "Starting Nginx with custom configuration..."
cd "$BASE_DIR"

# Check if Nginx is installed
if \! command -v nginx &> /dev/null; then
    echo "Error: Nginx not found. Please install Nginx first."
    exit 1
fi

# Make sure Nginx is stopped before starting
nginx -s stop 2>/dev/null || true
sleep 2

# Update nginx config if needed to fix any paths
# macOS requires an extension with sed -i
sed -i '.bak' "s|root .*client/dist|root $BASE_DIR/client/dist|g" "$NGINX_CONF_PATH"

# Start Nginx with our config
echo "Starting Nginx with custom config at $NGINX_CONF_PATH..."
nginx -c "$NGINX_CONF_PATH"

if [ $? -ne 0 ]; then
    echo "Error: Failed to start Nginx. Check configuration."
    exit 1
fi

echo "Nginx started successfully"

# Verify Nginx is running on ports 80 and 443
for port in 80 443; do
    if \! check_port $port; then
        echo "Warning: Nginx may not be running on port $port"
    else
        echo "Nginx is listening on port $port"
    fi
done

# Print system summary
echo ""
echo "======================= SYSTEM STATUS ======================="
echo "Django backend:     http://localhost:8000     PID: $DJANGO_PID"
echo "OpenCV Detection:   Saving to $CAPTURE_DIR    PID: $SIMPLE_CAPTURE_PID"

if [[ $CAMERA_PID -ne -1 ]]; then
    echo "Camera relay:       WebSocket port 8765       PID: $CAMERA_PID"
fi

echo "Nginx:              Running on ports 80/443"
echo ""
echo "Main application URL: https://localhost"
echo ""
echo "Note: Since we're using self-signed certificates, you'll need to"
echo "      accept the security warning in your browser the first time."
echo ""
echo "Log files:"
echo "- Django:           $LOG_DIR/django-yolo.log"
echo "- OpenCV Detection: $LOG_DIR/opencv-detection.log"
if [[ $CAMERA_PID -ne -1 ]]; then
    echo "- Camera Relay:     $LOG_DIR/yolo-detection.log"
fi
echo "- Nginx:            /opt/homebrew/var/log/nginx/error.log"
echo ""
echo "To view detection logs, check the Motion History tab in the Dashboard"
echo ""
echo "To stop all services, run:"
echo "pkill -f 'gunicorn|camera_relay|simple_capture|python' && nginx -s stop"
echo "============================================================"

# Open browser automatically
echo "Opening application in browser..."
open "https://localhost/dashboard/camera"
