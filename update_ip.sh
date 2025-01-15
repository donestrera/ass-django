#!/bin/bash

# Get the current IP address
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo "Current IP address: $CURRENT_IP"

# Function to backup a file before modifying it
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "${file}.backup"
        echo "Created backup of $file"
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
    backup_file "$file"
    
    # Use sed to replace IP addresses in ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS
    sed -i '' "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    
    echo "Updated Django settings with new IP: $CURRENT_IP"
}

# Update Nginx configuration
update_nginx_conf() {
    local file="nginx.conf"
    backup_file "$file"
    
    # Use sed to replace IP addresses in the Nginx configuration
    sed -i '' "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    
    echo "Updated Nginx configuration with new IP: $CURRENT_IP"
    
    # Test Nginx configuration
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
}

# Update Vite configuration
update_vite_config() {
    local file="client/vite.config.js"
    backup_file "$file"
    
    # Use sed to replace IP addresses in the Vite configuration
    sed -i '' "s/192\.168\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$CURRENT_IP/g" "$file"
    
    echo "Updated Vite configuration with new IP: $CURRENT_IP"
}

# Update environment files
update_env_files() {
    local file="client/.env"
    backup_file "$file"
    
    # Update the API URL in .env file
    echo "VITE_API_URL=http://$CURRENT_IP" > "$file"
    echo "VITE_WS_URL=ws://$CURRENT_IP" >> "$file"
    
    echo "Updated .env file with new IP: $CURRENT_IP"
}

# Main execution
echo "Starting IP update process..."

# Update all configuration files
update_django_settings
update_nginx_conf
update_vite_config
update_env_files

echo "Restarting services..."

# Kill existing Django and Vite processes
pkill -f "python manage.py runserver"
pkill -f "vite"

# Start Django server
cd server
python manage.py runserver 0.0.0.0:8000 &
cd ..

# Start Vite development server
cd client
npm run dev &
cd ..

echo "IP update process completed!"
echo "New IP address ($CURRENT_IP) has been updated in all configuration files"
echo "Services have been restarted"
echo ""
echo "You can now access your application at:"
echo "http://$CURRENT_IP" 