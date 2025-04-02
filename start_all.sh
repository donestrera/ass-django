#!/bin/zsh

#===============================================
# Comprehensive System Start Script
# - Checks for errors
# - Kills existing processes
# - Starts all services (Django, Camera, Simple Capture, Frontend)
#===============================================

# Set the base directory to the script location
cd "$(dirname "$0")"
BASE_DIR="$(pwd)"
LOG_DIR="/Users/dondon/Library/Logs"
FRONTEND_PORT=9090
FORCE_REBUILD=true  # Set to true to always rebuild frontend
CAPTURE_DIR="$BASE_DIR/captured_images"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"
mkdir -p "$CAPTURE_DIR"

# Print banner
echo ""
echo "================================================"
echo "      Starting Person Detection System"
echo "================================================"
echo "Base directory: $BASE_DIR"
echo ""

#-----------------------------------------------
# Function to check if a port is in use
#-----------------------------------------------
check_port() {
    lsof -i ":$1" &>/dev/null
    return $?
}

#-----------------------------------------------
# Function to kill process using a specific port
#-----------------------------------------------
kill_port() {
    local port="$1"
    echo "Killing processes on port $port..."
    
    # Try multiple methods to ensure the port is released
    # 1. Find PID using lsof and kill it
    local pids=$(lsof -ti ":$port" 2>/dev/null)
    if [[ -n "$pids" ]]; then
        echo "Found PIDs: $pids using port $port"
        kill -9 $pids 2>/dev/null || true
    fi
    
    # 2. Use pkill to find any matching processes by port
    pkill -f ".*:$port" 2>/dev/null || true
    
    # Wait for the port to be released
    local counter=0
    while check_port "$port" && [[ $counter -lt 5 ]]; do
        echo "Waiting for port $port to be released... ($counter/5)"
        sleep 1
        counter=$((counter + 1))
    done
    
    if check_port "$port"; then
        echo "Warning: Port $port is still in use after kill attempts"
        return 1
    else
        echo "Port $port successfully released"
        return 0
    fi
}

#-----------------------------------------------
# Function to wait for a service to be ready
#-----------------------------------------------
wait_for_service() {
    local port="$1"
    local service_name="$2"
    local max_attempts="${3:-30}"  # Default to 30 attempts
    local wait_seconds="${4:-1}"   # Default to 1 second between attempts
    
    echo "Waiting for $service_name to be ready on port $port..."
    local counter=0
    while ! check_port "$port" && [[ $counter -lt $max_attempts ]]; do
        echo "  Waiting for $service_name ($counter/$max_attempts)..."
        sleep $wait_seconds
        counter=$((counter + 1))
    done
    
    if check_port "$port"; then
        echo "$service_name is ready on port $port!"
        return 0
    else
        echo "Error: $service_name did not start on port $port after $max_attempts attempts"
        return 1
    fi
}

#-----------------------------------------------
# Stop all running processes
#-----------------------------------------------
echo "Stopping any existing processes..."
pkill -f "gunicorn.*config.wsgi" || true
pkill -f "camera_relay.py" || true
pkill -f "simple_capture.py" || true
pkill -f "python.*serve.py" || true
pkill -f "python.*9090" || true
kill_port 8000
kill_port 8765
kill_port $FRONTEND_PORT

echo "Waiting for system to settle..."
sleep 2

#-----------------------------------------------
# Check if required directories exist
#-----------------------------------------------
echo "Verifying system directories..."

if [[ ! -d "$BASE_DIR/server" ]]; then
    echo "Error: Server directory not found at: $BASE_DIR/server"
    exit 1
fi

if [[ ! -d "$BASE_DIR/client" ]]; then
    echo "Error: Client directory not found at: $BASE_DIR/client"
    exit 1
fi

if [[ ! -d "$BASE_DIR/yolov7" ]]; then
    echo "Error: YOLOv7 directory not found at: $BASE_DIR/yolov7"
w    exit 1
fi

if [[ ! -f "$BASE_DIR/yolov7/simple_capture.py" ]]; then
    echo "Error: simple_capture.py not found at: $BASE_DIR/yolov7/simple_capture.py"
    exit 1
fi

# Ensure simple_capture.py is executable
chmod +x "$BASE_DIR/yolov7/simple_capture.py"

#-----------------------------------------------
# Build/rebuild frontend application
#-----------------------------------------------
# Always rebuild the client application to ensure latest changes are included
if [ "$FORCE_REBUILD" = true ] || [ ! -d "$BASE_DIR/client/dist" ]; then
    echo "Building client application..."
    
    # Clean any existing build to ensure fresh build
    if [ -d "$BASE_DIR/client/dist" ]; then
        echo "Removing previous build..."
        rm -rf "$BASE_DIR/client/dist"
    fi
    
    # Find npm path
    NPM_PATH=$(which npm)
    if [ -z "$NPM_PATH" ]; then
        echo "Error: npm not found. Please ensure npm is installed."
        exit 1
    fi
    
    echo "Using npm at: $NPM_PATH"
    
    # Build the application
    cd "$BASE_DIR/client" && "$NPM_PATH" run build
    
    # Verify build was successful
    if [[ ! -d "$BASE_DIR/client/dist" ]]; then
        echo "Error: Failed to build client application"
        echo "Checking for dist directory..."
        ls -la "$BASE_DIR/client"
        exit 1
    fi
    
    echo "Client application built successfully"
    
    # Verify build contents
    echo "Verifying build contents..."
    ls -la "$BASE_DIR/client/dist"
    
    cd "$BASE_DIR"
else
    echo "Using existing client build (set FORCE_REBUILD=true to rebuild)"
fi

# Check for stale files in the client build directory
echo "Checking for stale files..."
find "$BASE_DIR/client/dist" -name "*.js" -o -name "*.css" | wc -l
echo "Assets in dist directory verified"

#-----------------------------------------------
# Start Django backend
#-----------------------------------------------
echo "Starting Django backend on port 8000..."
cd "$BASE_DIR/server"

if [[ ! -d "venv" ]]; then
    echo "Error: Python virtual environment not found at: $BASE_DIR/server/venv"
    echo "Please set up the server environment first"
    exit 1
fi

source venv/bin/activate
python3 -m gunicorn --workers 3 --bind 127.0.0.1:8000 config.wsgi:application > "$LOG_DIR/django-yolo.log" 2>&1 &
DJANGO_PID=$!
echo "Django backend started with PID: $DJANGO_PID"
deactivate

# Wait for Django to initialize
echo "Waiting for Django to initialize..."
if ! wait_for_service 8000 "Django backend" 30 1; then
    echo "Error: Django server failed to start on port 8000"
    cat "$LOG_DIR/django-yolo.log" | tail -20
    exit 1
fi
echo "Django server running on port 8000"

#-----------------------------------------------
# Choose Detection Method
#-----------------------------------------------
echo ""
echo "Detection Mode Selection"
echo "1) Start OpenCV Simple Capture (Recommended)"
echo "2) Start legacy Camera Relay Service"
echo "3) Start both detection methods"
read -p "Choose a detection method (1-3) [1]: " detection_choice
detection_choice=${detection_choice:-1}  # Default to 1 if no input

# Default PIDs to -1 to indicate not started
CAMERA_PID=-1
SIMPLE_CAPTURE_PID=-1

#-----------------------------------------------
# Start OpenCV Simple Capture (if selected)
#-----------------------------------------------
if [[ $detection_choice == 1 || $detection_choice == 3 ]]; then
    echo "Starting OpenCV Simple Capture service..."
    cd "$BASE_DIR/yolov7"
    
    # Configure capture settings
    CONFIDENCE=0.35
    INTERVAL=2.0
    
    # Start with proper parameters
    # Use --display flag if you want to see the camera feed
    python3 simple_capture.py --output "$CAPTURE_DIR" --confidence $CONFIDENCE --interval $INTERVAL > "$LOG_DIR/opencv-detection.log" 2>&1 &
    SIMPLE_CAPTURE_PID=$!
    echo "OpenCV Simple Capture started with PID: $SIMPLE_CAPTURE_PID"
    
    # Wait for service to initialize
    sleep 2
    echo "OpenCV Simple Capture service initialized"
    
    # Verify the process is still running
    if ! ps -p $SIMPLE_CAPTURE_PID > /dev/null; then
        echo "Warning: OpenCV Simple Capture may have crashed. Check logs at: $LOG_DIR/opencv-detection.log"
        tail -n 20 "$LOG_DIR/opencv-detection.log"
    else
        echo "OpenCV Simple Capture is running properly"
    fi
    
    cd "$BASE_DIR"
fi

#-----------------------------------------------
# Start camera relay service (if selected)
#-----------------------------------------------
if [[ $detection_choice == 2 || $detection_choice == 3 ]]; then
    echo "Starting camera relay service on port 8765..."
    cd "$BASE_DIR/server"
    source venv/bin/activate
    BACKGROUND_MODE=true python3 camera_relay.py > "$LOG_DIR/yolo-detection.log" 2>&1 &
    CAMERA_PID=$!
    echo "Camera relay started with PID: $CAMERA_PID"
    deactivate

    # Wait for camera relay to initialize
    sleep 2
    if ! wait_for_service 8765 "Camera relay" 10 1; then
        echo "Warning: Camera relay service may not be fully initialized. Check logs at: $LOG_DIR/yolo-detection.log"
        tail -n 20 "$LOG_DIR/yolo-detection.log"
    else
        echo "Camera relay service initialized and running on port 8765"
    fi
    
    cd "$BASE_DIR"
fi

#-----------------------------------------------
# Create and start frontend server
#-----------------------------------------------
echo "Creating frontend server script..."
cd "$BASE_DIR"

# Create a robust server script
cat > spa_server.py << 'EOL'
#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import socket
import time

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Print request info for debugging
        print(f"GET request for: {self.path}")
        
        # For SPA routes, always serve index.html
        if self.path.startswith('/dashboard/') or self.path == '/dashboard':
            print(f"SPA route detected: {self.path}, serving index.html")
            self.path = '/index.html'
        
        # Check if file exists
        file_path = self.translate_path(self.path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            print(f"File exists: {file_path}")
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        
        # Default to index.html for non-existent paths (SPA routing)
        print(f"File not found: {file_path}, serving index.html")
        self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def end_headers(self):
        # Add Cache-Control header to prevent caching
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        return super().end_headers()

class ReuseAddressServer(socketserver.TCPServer):
    allow_reuse_address = True

def main():
    # Get port from environment or use default
    port = int(os.environ.get('PORT', 9090))
    directory = os.environ.get('DIRECTORY', '')
    
    print(f"Starting server on port {port}, serving from {directory}")
    
    # Make sure directory exists
    if not os.path.exists(directory):
        print(f"Error: Directory {directory} does not exist")
        sys.exit(1)
    
    # List directory contents to verify
    print(f"Directory contents: {os.listdir(directory)}")
    
    # Change to the specified directory
    os.chdir(directory)
    print(f"Changed to directory: {os.getcwd()}")
    
    # Start the server
    try:
        httpd = ReuseAddressServer(("", port), SPAHandler)
        print(f"Server running at http://localhost:{port}")
        httpd.serve_forever()
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Error: Port {port} is already in use")
            sys.exit(1)
        else:
            raise e
    except KeyboardInterrupt:
        print("Server stopped by user")
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOL

chmod +x spa_server.py

# Start the frontend server
echo "Starting frontend server on port $FRONTEND_PORT..."

# Make sure the dist directory exists before trying to serve it
if [ ! -d "$BASE_DIR/client/dist" ]; then
    echo "Error: client/dist directory not found. Rebuilding..."
    
    # Find npm path
    NPM_PATH=$(which npm)
    echo "Using npm at: $NPM_PATH"
    
    # Build the application as a last resort
    cd "$BASE_DIR/client" && "$NPM_PATH" run build
    cd "$BASE_DIR"
    
    if [ ! -d "$BASE_DIR/client/dist" ]; then
        echo "Fatal error: Still cannot find client/dist directory after rebuild attempt"
        echo "Current directory contains:"
        ls -la "$BASE_DIR/client"
        exit 1
    fi
fi

# Start the frontend directly using npm dev
cd "$BASE_DIR/client"
echo "Starting frontend directly using npm dev server..."

# Clean up any existing processes
echo "Cleaning up existing processes on port $FRONTEND_PORT..."
lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
sleep 2

# Run the development server
echo "Running npm dev server on port $FRONTEND_PORT..."
PORT=$FRONTEND_PORT "$NPM_PATH" run dev -- --port $FRONTEND_PORT --host > "$LOG_DIR/frontend-yolo.log" 2>&1 &
FRONTEND_PID=$!

# Wait for server to start
echo "Waiting for frontend server to initialize..."
sleep 5

# Keep checking for availability
for i in {1..10}; do
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null; then
        echo "Frontend server is running on port $FRONTEND_PORT with PID $FRONTEND_PID"
        break
    fi
    
    if [ $i -eq 10 ]; then
        echo "Error: Cannot connect to frontend server after 10 attempts"
        echo "Checking logs:"
        cat "$LOG_DIR/frontend-yolo.log"
        
        # Last resort - check if server is actually running but not responding to curl
        if lsof -i :$FRONTEND_PORT > /dev/null 2>&1; then
            echo "Note: A process is listening on port $FRONTEND_PORT but not responding to HTTP requests"
            echo "Try accessing http://localhost:$FRONTEND_PORT directly in your browser"
        else
            echo "No process is listening on port $FRONTEND_PORT"
            exit 1
        fi
    fi
    
    echo "  Waiting for server to be ready ($i/10)..."
    sleep 2
done
echo "Frontend server running on port $FRONTEND_PORT"

#-----------------------------------------------
# Summary
#-----------------------------------------------
echo ""
echo "======================= SYSTEM STATUS ======================="
echo "Django backend:     http://localhost:8000     PID: $DJANGO_PID"

if [[ $CAMERA_PID -ne -1 ]]; then
    echo "Camera relay:       WebSocket port 8765       PID: $CAMERA_PID"
fi

if [[ $SIMPLE_CAPTURE_PID -ne -1 ]]; then
    echo "OpenCV Detection:   Saving to $CAPTURE_DIR    PID: $SIMPLE_CAPTURE_PID"
fi

echo "Frontend:           http://localhost:$FRONTEND_PORT       PID: $FRONTEND_PID"
echo ""
echo "Main application URL: http://localhost:$FRONTEND_PORT"
echo ""

if [[ $detection_choice == 1 ]]; then
    echo "OpenCV Simple Capture is enabled!"
    echo "- Detecting people using OpenCV's HOG detector"
    echo "- Images saved to: $CAPTURE_DIR"
elif [[ $detection_choice == 2 ]]; then
    echo "Camera relay with automatic detection is enabled!"
    echo "- Camera will start automatically when you visit the camera page"
    echo "- Detection starts automatically, no buttons needed"
elif [[ $detection_choice == 3 ]]; then
    echo "Both detection methods are running:"
    echo "1. OpenCV Simple Capture (saving to $CAPTURE_DIR)"
    echo "2. Camera relay with web interface"
fi

echo ""
echo "Log files:"
echo "- Django:           $LOG_DIR/django-yolo.log"
if [[ $CAMERA_PID -ne -1 ]]; then
    echo "- Camera Relay:     $LOG_DIR/yolo-detection.log"
fi
if [[ $SIMPLE_CAPTURE_PID -ne -1 ]]; then
    echo "- OpenCV Detection: $LOG_DIR/opencv-detection.log"
fi
echo "- Frontend:         $LOG_DIR/frontend-yolo.log"
echo ""
echo "To view detection logs, check the Motion History tab in the Dashboard"
echo ""
echo "To stop all services, run:"
echo "pkill -f 'gunicorn|camera_relay|simple_capture|python'"
echo "============================================================"

# Open browser automatically to the application
echo "Opening application in browser..."
open "http://localhost:$FRONTEND_PORT/dashboard/camera" 