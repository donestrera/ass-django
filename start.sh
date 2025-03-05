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

# Function to start Django server
start_django_server() {
    echo "Starting Django server..."
    cd server || exit 1
    
    # Check if port 8000 is in use
    if check_port 8000; then
        echo "Port 8000 is in use. Stopping existing process..."
        kill_port 8000
    fi
    
    # Activate virtual environment and start server
    source venv/bin/activate
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

# Start servers
start_django_server
start_vite_server

echo "IP update process completed!"
echo "New IP address ($CURRENT_IP) has been updated in all configuration files"
echo "Services have been restarted"
echo ""
echo "You can now access your application at:"
echo "http://$CURRENT_IP:5173"