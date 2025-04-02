#\!/bin/bash

# Deploy script for serving with Nginx
BASE_DIR="$(pwd)"
NGINX_CONF_PATH="$BASE_DIR/nginx-https.conf"
SSL_DIR="$BASE_DIR/ssl"

# Banner
echo "========================================"
echo "     Deploying with Nginx (HTTPS)      "
echo "========================================"
echo ""

# Verify frontend is built
echo "Checking frontend build..."
if [ \! -d "$BASE_DIR/client/dist" ]; then
    echo "Frontend build not found. Building..."
    cd "$BASE_DIR/client"
    npm_path=$(which npm || echo "/opt/homebrew/bin/npm")
    "$npm_path" run build
    
    if [ \! -d "$BASE_DIR/client/dist" ]; then
        echo "Error: Frontend build failed\!"
        exit 1
    fi
    
    echo "Frontend built successfully."
    cd "$BASE_DIR"
else
    echo "Frontend build found."
fi

# Verify SSL certificates
echo "Checking SSL certificates..."
if [ \! -f "$SSL_DIR/nginx-selfsigned.crt" ] || [ \! -f "$SSL_DIR/nginx-selfsigned.key" ]; then
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

# Verify Nginx is installed
echo "Checking Nginx installation..."
if \! command -v nginx &> /dev/null; then
    echo "Nginx not found. Please install Nginx first."
    exit 1
fi
echo "Nginx found."

# Stop existing Nginx
echo "Stopping existing Nginx..."
nginx -s stop 2>/dev/null || true
sleep 2

# Start Nginx with our config
echo "Starting Nginx with custom config..."
nginx -c "$NGINX_CONF_PATH"

# Verify Nginx started
if [ $? -eq 0 ]; then
    echo "Nginx started successfully."
    echo ""
    echo "Your application is now available at:"
    echo "  https://localhost"
    echo ""
    echo "Note: Since we're using self-signed certificates, you'll need to accept the security warning in your browser."
    echo ""
    echo "To stop Nginx, run: nginx -s stop"
else
    echo "Error: Failed to start Nginx."
    echo "Check the configuration file for errors."
    exit 1
fi

echo "========================================"
echo "Now starting the backend services..."
echo "========================================"

# Start Django backend
echo "Starting Django backend..."
cd "$BASE_DIR/server"
source venv/bin/activate
python3 -m gunicorn --workers 3 --bind 127.0.0.1:8000 config.wsgi:application > "/Users/dondon/Library/Logs/django-yolo.log" 2>&1 &
DJANGO_PID=$\!
echo "Django backend started with PID: $DJANGO_PID"
deactivate

# Start Camera Relay if needed
echo "Do you want to start the camera relay service? (y/n)"
read -p "> " start_camera

if [[ "$start_camera" == "y" || "$start_camera" == "Y" ]]; then
    echo "Starting camera relay service..."
    cd "$BASE_DIR/server"
    source venv/bin/activate
    BACKGROUND_MODE=true python3 camera_relay.py > "/Users/dondon/Library/Logs/yolo-detection.log" 2>&1 &
    CAMERA_PID=$\!
    echo "Camera relay started with PID: $CAMERA_PID"
    deactivate
fi

echo ""
echo "All services started\!"
echo "Access your application at: https://localhost"
echo ""
echo "To stop all services, run: pkill -f 'gunicorn|camera_relay|nginx'"
