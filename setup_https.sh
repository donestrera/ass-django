#!/bin/bash

# Script to set up HTTPS with Nginx using a self-signed certificate
echo "Setting up HTTPS with Nginx using a self-signed certificate..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Warning: This script is optimized for macOS. Some commands may not work on other systems."
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Nginx is not installed. Please install Nginx first."
    echo "For macOS with Apple Silicon: brew install nginx"
    exit 1
fi

# Get the current IP address (macOS specific approach)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS specific IP detection
    CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
else
    # Fallback for other systems
    if command -v ip >/dev/null 2>&1; then
        CURRENT_IP=$(ip addr show | grep -w inet | grep -v 127.0.0.1 | awk '{print $2}' | cut -d'/' -f1 | head -n 1)
    elif command -v ifconfig >/dev/null 2>&1; then
        CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    else
        echo "Error: Could not detect IP address"
        exit 1
    fi
fi

if [ -z "$CURRENT_IP" ]; then
    echo "Error: Could not detect IP address"
    exit 1
fi

echo "Detected IP address: $CURRENT_IP"

# Create directory for SSL certificates
SSL_DIR="./ssl"
mkdir -p $SSL_DIR

# Generate self-signed certificate
echo "Generating self-signed SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout $SSL_DIR/nginx-selfsigned.key \
    -out $SSL_DIR/nginx-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$CURRENT_IP" \
    -addext "subjectAltName=IP:$CURRENT_IP,DNS:localhost"

if [ $? -ne 0 ]; then
    echo "Failed to generate SSL certificate."
    exit 1
fi

echo "SSL certificate generated successfully."

# Determine Nginx paths for macOS with Apple Silicon
NGINX_CONF_DIR=""
NGINX_SITES_DIR=""

if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check if using Homebrew on Apple Silicon
    if [ -d "/opt/homebrew/etc/nginx" ]; then
        NGINX_CONF_DIR="/opt/homebrew/etc/nginx"
        NGINX_SITES_DIR="/opt/homebrew/etc/nginx/servers"
    # Check if using Homebrew on Intel Mac
    elif [ -d "/usr/local/etc/nginx" ]; then
        NGINX_CONF_DIR="/usr/local/etc/nginx"
        NGINX_SITES_DIR="/usr/local/etc/nginx/servers"
    else
        echo "Warning: Could not determine Nginx configuration directory."
        echo "Will create configuration file locally only."
    fi
else
    # Linux default paths
    NGINX_CONF_DIR="/etc/nginx"
    NGINX_SITES_DIR="/etc/nginx/sites-available"
fi

# Create Nginx configuration for HTTPS
NGINX_CONF="nginx-https.conf"

cat > $NGINX_CONF << EOF
# Nginx configuration for HTTPS
server {
    listen 80;
    server_name $CURRENT_IP localhost;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $CURRENT_IP localhost;
    
    ssl_certificate $PWD/ssl/nginx-selfsigned.crt;
    ssl_certificate_key $PWD/ssl/nginx-selfsigned.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    
    # Proxy settings for Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Proxy settings for WebSocket connections to Django
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
    
    # Proxy settings for Camera Relay WebSocket
    location /camera-relay/ {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;  # 24 hours
        proxy_send_timeout 86400;  # 24 hours
    }
    
    # Proxy settings for Vite development server
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "Nginx HTTPS configuration created: $NGINX_CONF"

# Instructions for using the configuration
echo ""
echo "To use this configuration with Nginx on macOS with Apple Silicon:"

if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ ! -z "$NGINX_CONF_DIR" ] && [ ! -z "$NGINX_SITES_DIR" ]; then
        echo "1. Copy the configuration file to Nginx servers directory:"
        echo "   sudo cp $NGINX_CONF $NGINX_SITES_DIR/ass-django-https.conf"
        echo ""
        echo "2. Test the Nginx configuration:"
        echo "   sudo nginx -t"
        echo ""
        echo "3. If the test is successful, reload Nginx:"
        echo "   sudo brew services restart nginx"
        echo "   or"
        echo "   sudo nginx -s reload"
    else
        echo "1. Locate your Nginx configuration directory. It's typically:"
        echo "   - For Apple Silicon: /opt/homebrew/etc/nginx"
        echo "   - For Intel Macs: /usr/local/etc/nginx"
        echo ""
        echo "2. Copy the configuration file to Nginx servers directory:"
        echo "   sudo cp $NGINX_CONF /path/to/nginx/servers/ass-django-https.conf"
        echo ""
        echo "3. Test the Nginx configuration:"
        echo "   sudo nginx -t"
        echo ""
        echo "4. If the test is successful, reload Nginx:"
        echo "   sudo brew services restart nginx"
        echo "   or"
        echo "   sudo nginx -s reload"
    fi
else
    echo "1. Copy the configuration file to Nginx sites directory:"
    echo "   sudo cp $NGINX_CONF /etc/nginx/sites-available/ass-django-https"
    echo ""
    echo "2. Create a symbolic link to enable the site:"
    echo "   sudo ln -s /etc/nginx/sites-available/ass-django-https /etc/nginx/sites-enabled/"
    echo ""
    echo "3. Test the Nginx configuration:"
    echo "   sudo nginx -t"
    echo ""
    echo "4. If the test is successful, reload Nginx:"
    echo "   sudo nginx -s reload"
fi

echo ""
echo "5. Access your application via HTTPS:"
echo "   https://$CURRENT_IP"
echo ""
echo "Note: Since this is a self-signed certificate, browsers will show a security warning."
echo "You'll need to accept the risk to proceed to the site."
echo ""
echo "For local development without HTTPS, you can still access the application via:"
echo "   http://localhost:8000 (Django backend)"
echo "   http://localhost:5173 (Vite frontend)"
echo ""
echo "Remember: Camera access requires HTTPS or localhost."

# Make the configuration file executable
chmod +x $NGINX_CONF 