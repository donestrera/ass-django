#\!/bin/bash

# Nginx Debug Helper Script
echo "========================================"
echo "        Nginx Debug Helper              "
echo "========================================"

# Check if Nginx is installed
if \! command -v nginx &> /dev/null; then
    echo "Error: Nginx not found. Please install Nginx first."
    exit 1
fi

echo "1. Checking Nginx status..."
ps aux | grep nginx

echo ""
echo "2. Checking ports in use..."
echo "Port 80:"
lsof -i :80
echo "Port 443:"
lsof -i :443
echo "Port 8000 (Django):"
lsof -i :8000
echo "Port 8765 (Camera relay):"
lsof -i :8765

echo ""
echo "3. Testing Nginx configuration..."
nginx -t

echo ""
echo "4. Checking Nginx error log..."
tail -n 30 /opt/homebrew/var/log/nginx/error.log

echo ""
echo "5. Checking Django log..."
tail -n 30 "/Users/dondon/Library/Logs/django-yolo.log"

echo ""
echo "6. Quick frontend build test..."
if [ -d "client/dist" ]; then
    echo "Frontend build directory exists."
    ls -la client/dist
else
    echo "Frontend build directory does not exist\!"
fi

echo ""
echo "7. Checking SSL certificates..."
if [ -f "ssl/nginx-selfsigned.crt" ] && [ -f "ssl/nginx-selfsigned.key" ]; then
    echo "SSL certificates exist."
    ls -la ssl/
else
    echo "SSL certificates missing\!"
fi

echo ""
echo "8. Manual restart commands:"
echo "To stop Nginx: nginx -s stop"
echo "To start Nginx: nginx -c $(pwd)/nginx-https.conf"
echo "To restart all: ./run_system_nginx.sh"

echo ""
echo "9. Fix permissions script:"
cat > fix_permissions.sh << 'EOFIX'
#\!/bin/bash
# Fix common permission issues
echo "Fixing permissions..."
chmod -R 755 client/dist
chmod 644 client/dist/*.html
chmod 644 client/dist/*.js
chmod 644 client/dist/*.css
chmod 644 ssl/nginx-selfsigned.*
echo "Done"
EOFIX

chmod +x fix_permissions.sh
echo "Created fix_permissions.sh - run this if you suspect permission issues"

echo ""
echo "========================================"
