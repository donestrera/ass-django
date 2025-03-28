#!/bin/bash

# Get the current IP address (updated to work with both ip and ifconfig)
get_current_ip() {
    if command -v ip >/dev/null 2>&1; then
        # Try ip command first
        CURRENT_IP=$(ip addr show | grep -w inet | grep -v 127.0.0.1 | awk '{print $2}' | cut -d'/' -f1 | head -n 1)
    elif command -v ifconfig >/dev/null 2>&1; then
        # Fallback to ifconfig
        CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    else
        echo "Error: Neither 'ip' nor 'ifconfig' command found"
        exit 1
    fi

    if [ -z "$CURRENT_IP" ]; then
        echo "Error: Could not detect IP address"
        exit 1
    fi

    echo "Detected IP address: $CURRENT_IP"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -i :$port >/dev/null 2>&1
        return $?
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tuln | grep ":$port " >/dev/null 2>&1
        return $?
    else
        echo "Warning: Cannot check port status (neither lsof nor netstat available)"
        return 0
    fi
}

# Function to kill process using a specific port
kill_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        local pid=$(lsof -t -i:$port)
        if [ ! -z "$pid" ]; then
            echo "Killing process using port $port (PID: $pid)..."
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
            sleep 2
        fi
    fi
}

# Function to backup a file before modifying it
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "${file}.backup"
        echo "Created backup of $file"
    else
        echo "Warning: File $file not found"
        return 1
    fi
}

# Function to restore from backup if something goes wrong
restore_backup() {
    local file=$1
    if [ -f "${file}.backup" ]; then
        mv "${file}.backup" "$file"
        echo "Restored backup of $file"
    fi
}

# Update Django settings.py
update_django_settings() {
    local file="server/config/settings.py"
    if [ ! -f "$file" ]; then
        echo "Error: Django settings file not found at $file"
        return 1
    fi

    backup_file "$file"
    
    # Update ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS version of sed
        sed -i '' "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    else
        # Linux version of sed
        sed -i "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    fi
    
    echo "Updated Django settings with new IP: $CURRENT_IP"
}

# Update Nginx configuration if it exists
update_nginx_conf() {
    local file="nginx.conf"
    if [ ! -f "$file" ]; then
        echo "Note: Nginx configuration file not found, skipping..."
        return 0
    fi

    backup_file "$file"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS version of sed
        sed -i '' "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    else
        # Linux version of sed
        sed -i "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    fi
    
    echo "Updated Nginx configuration with new IP: $CURRENT_IP"
    
    # Test Nginx configuration if nginx is installed
    if command -v nginx >/dev/null 2>&1; then
        nginx -t
        if [ $? -eq 0 ]; then
            echo "Nginx configuration test successful"
            sudo nginx -s reload
            echo "Nginx reloaded successfully"
        else
            echo "Error in Nginx configuration. Restoring backup..."
            restore_backup "$file"
            return 1
        fi
    else
        echo "Note: Nginx not installed, skipping configuration test"
    fi
}

# Update Vite configuration
update_vite_config() {
    local file="client/vite.config.js"
    if [ ! -f "$file" ]; then
        echo "Error: Vite config file not found at $file"
        return 1
    fi

    backup_file "$file"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS version of sed
        sed -i '' "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    else
        # Linux version of sed
        sed -i "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    fi
    
    echo "Updated Vite configuration with new IP: $CURRENT_IP"
}

# Update environment files
update_env_files() {
    local file="client/.env"
    if [ ! -f "$file" ]; then
        echo "Error: Environment file not found at $file"
        return 1
    fi

    backup_file "$file"
    
    # Update the API URL in .env file while preserving port numbers
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS version of sed
        sed -i '' "s|http://192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}:[0-9]\{1,5\}|http://$CURRENT_IP:8000|g" "$file"
        sed -i '' "s|ws://192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}:[0-9]\{1,5\}|ws://$CURRENT_IP:8000|g" "$file"
    else
        # Linux version of sed
        sed -i "s|http://192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}:[0-9]\{1,5\}|http://$CURRENT_IP:8000|g" "$file"
        sed -i "s|ws://192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}:[0-9]\{1,5\}|ws://$CURRENT_IP:8000|g" "$file"
    fi
    
    echo "Updated .env file with new IP: $CURRENT_IP"
}

# Function to start camera relay server
start_camera_relay() {
    echo "Starting camera relay server..."
    cd server || exit 1
    
    # Check if port 8765 is in use
    if check_port 8765; then
        echo "Port 8765 is in use. Stopping existing process..."
        kill_port 8765
    fi
    
    # Activate virtual environment and start camera relay server
    source venv/bin/activate
    
    # Start camera relay server in background
    echo "Starting camera relay server on port 8765..."
    python3 camera_relay.py &
    local relay_pid=$!
    
    # Store PID for potential cleanup
    echo $relay_pid > camera_relay.pid
    
    # Wait for camera relay server to start
    echo "Waiting for camera relay server to start..."
    sleep 3
    
    # Check if process is still running
    if ps -p $relay_pid > /dev/null; then
        echo "Camera relay server started successfully (PID: $relay_pid)"
    else
        echo "Warning: Camera relay server may not have started properly"
    fi
    
    deactivate
    cd ..
}

# Function to start Django server
start_django_server() {
    echo "Starting Django server..."
    cd server || exit 1
    
    # Check if port 8000 is in use
    if check_port 8000; then
        echo "Port 8000 is in use. Stopping existing process..."
        kill_port 8000
    fi
    
    # Check if MySQL service is running and start it if not
    echo "Checking MySQL service status..."
    if command -v systemctl &> /dev/null; then
        # For systems using systemd
        if ! systemctl is-active --quiet mysql; then
            echo "MySQL service is not running. Starting MySQL..."
            sudo systemctl start mysql
            # Wait for MySQL to fully start
            sleep 5
        else
            echo "MySQL service is already running."
        fi
    elif command -v service &> /dev/null; then
        # For systems using service command
        if ! service mysql status &> /dev/null; then
            echo "MySQL service is not running. Starting MySQL..."
            sudo service mysql start
            # Wait for MySQL to fully start
            sleep 5
        else
            echo "MySQL service is already running."
        fi
    else
        echo "Warning: Could not check MySQL service status. Make sure MySQL is running."
    fi
    
    # Activate virtual environment and start server
    source venv/bin/activate
    
    # Check database connection
    echo "Checking database connection..."
    if python3 -c "
import sys
try:
    import django
    django.setup()
    from django.db import connections
    connections['default'].cursor()
    print('Database connection successful')
    sys.exit(0)
except Exception as e:
    print(f'Database connection failed: {e}')
    sys.exit(1)
" 2>/dev/null; then
        echo "Database connection verified."
    else
        echo "Warning: Could not connect to the database. Check MySQL configuration and credentials."
        echo "Attempting to start Django server anyway..."
    fi
    
    # Start Django server on 0.0.0.0 to allow both localhost and IP access
    # Note: For camera access, users should use localhost or HTTPS
    echo "Note: For camera access, use http://localhost:8000 or set up HTTPS with Nginx"
    python3 manage.py runserver 0.0.0.0:8000 &
    local django_pid=$!
    deactivate
    cd ..
    
    # Wait for Django server to start
    echo "Waiting for Django server to start..."
    for i in {1..10}; do
        if curl -s http://$CURRENT_IP:8000/api/auth/login/ >/dev/null; then
            echo "Django server started successfully"
            return 0
        fi
        sleep 1
    done
    
    echo "Warning: Django server may not have started properly"
    return 1
}

# Function to start Vite server
start_vite_server() {
    echo "Starting Vite development server..."
    cd client || exit 1
    
    # Check if port 5173 is in use
    if check_port 5173; then
        echo "Port 5173 is in use. Stopping existing process..."
        kill_port 5173
    fi
    
    # Start Vite with explicit host binding
    npm run dev -- --host $CURRENT_IP &
    local vite_pid=$!
    cd ..
    
    # Wait for Vite server to start
    echo "Waiting for Vite server to start..."
    for i in {1..10}; do
        if curl -s http://$CURRENT_IP:5173 >/dev/null; then
            echo "Vite server started successfully"
            return 0
        fi
        sleep 1
    done
    
    echo "Warning: Vite server may not have started properly"
    return 1
}

# Main execution
echo "Starting IP update process..."

# Get the current IP address
get_current_ip

# Update all configuration files
update_django_settings || echo "Warning: Failed to update Django settings"
update_nginx_conf || echo "Warning: Failed to update Nginx configuration"
update_vite_config || echo "Warning: Failed to update Vite configuration"
update_env_files || echo "Warning: Failed to update environment files"

echo "Restarting services..."

# Kill any existing processes
kill_port 8000
kill_port 5173

# Ensure MySQL is running (macOS specific)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Running MySQL startup script for macOS..."
    
    # Check if MySQL is running
    if ! pgrep -x "mysqld" > /dev/null; then
        echo "MySQL service is not running. Starting MySQL..."
        
        # Try different methods to start MySQL based on installation type
        if [ -d "/opt/homebrew/opt/mysql" ]; then
            # Apple Silicon Mac with Homebrew
            echo "Detected MySQL installed via Homebrew on Apple Silicon"
            brew services start mysql
        elif [ -d "/usr/local/opt/mysql" ]; then
            # Intel Mac with Homebrew
            echo "Detected MySQL installed via Homebrew on Intel Mac"
            brew services start mysql
        elif [ -d "/usr/local/mysql/bin" ]; then
            # MySQL installed from official package
            echo "Detected MySQL installed from official package"
            sudo /usr/local/mysql/support-files/mysql.server start
        else
            echo "Could not determine MySQL installation method."
            echo "Trying common startup methods..."
            
            # Try mysql.server if it exists in PATH
            if command -v mysql.server &> /dev/null; then
                echo "Starting MySQL via mysql.server in PATH..."
                sudo mysql.server start
            else
                echo "ERROR: Could not start MySQL. Please start it manually before running the application."
                echo "Common commands to start MySQL:"
                echo "  - brew services start mysql (if installed via Homebrew)"
                echo "  - sudo mysql.server start (if installed via package)"
                exit 1
            fi
        fi
        
        # Wait for MySQL to start
        echo "Waiting for MySQL to start..."
        sleep 5
        
        # Verify MySQL is running
        if ! pgrep -x "mysqld" > /dev/null; then
            echo "ERROR: MySQL failed to start. Please check MySQL logs and configuration."
            exit 1
        fi
    else
        echo "MySQL service is already running."
    fi
    
    # Check if the database exists and create it if needed
    echo "Checking database..."
    ./check_database.sh
    if [ $? -ne 0 ]; then
        echo "Error: Database check failed. Please check the database configuration."
        exit 1
    fi
fi

# Start servers
start_django_server
start_camera_relay
start_vite_server

echo "IP update process completed!"
echo "New IP address ($CURRENT_IP) has been updated in all configuration files"
echo "Services have been restarted"
echo ""
echo "You can access your application in two ways:"
echo ""
echo "1. Via IP address (Note: Camera access will require HTTPS setup):"
echo "   http://$CURRENT_IP:5173"
echo ""
echo "2. Via localhost (Camera access will work without HTTPS):"
echo "   http://localhost:5173"
echo ""
echo "For camera access via IP address, run the HTTPS setup script:"
echo "   ./setup_https.sh"
echo ""
echo "Then access your application via HTTPS:"
echo "   https://$CURRENT_IP"