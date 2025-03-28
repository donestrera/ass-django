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
    
    # Update server_name and proxy_pass
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS version of sed
        sed -i '' "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    else
        # Linux version of sed
        sed -i "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    fi
    
    echo "Updated Nginx configuration with new IP: $CURRENT_IP"
}

# Update Vite configuration
update_vite_config() {
    local file="client/vite.config.js"
    if [ ! -f "$file" ]; then
        echo "Error: Vite config file not found at $file"
        return 1
    fi

    backup_file "$file"
    
    # Update server.host
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
    # Update .env files if they exist
    for env_file in ".env" "client/.env" "server/.env"; do
        if [ -f "$env_file" ]; then
            backup_file "$env_file"
            
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS version of sed
                sed -i '' "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$env_file"
            else
                # Linux version of sed
                sed -i "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$env_file"
            fi
            
            echo "Updated $env_file with new IP: $CURRENT_IP"
        fi
    done
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

# Kill any existing processes on these ports (optional, can be removed if not needed)
kill_port 8000
kill_port 5173

echo "IP update process completed!"
echo "New IP address ($CURRENT_IP) has been updated in all configuration files"
echo ""
echo "You can now access your application at:"
echo "http://$CURRENT_IP:5173 (after manually starting the servers)"
echo ""
echo "To start the Django server: cd server && source venv/bin/activate && python3 manage.py runserver 0.0.0.0:8000"
echo "To start the Vite server: cd client && npm run dev -- --host $CURRENT_IP"