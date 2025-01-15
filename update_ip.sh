#!/bin/bash

# Get the IP address (works on both Linux and macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$IP" ]; then
    echo "Could not detect IP address"
    exit 1
fi

echo "Detected IP: $IP"

# Update vite.config.js
sed -i.bak "s/host: '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}'/host: '$IP'/" client/vite.config.js

# Update .env
echo "VITE_API_URL=http://$IP" > client/.env

# Update Django settings.py
# First, check if IP is already in ALLOWED_HOSTS
if ! grep -q "$IP" server/config/settings.py; then
    # Add the IP to ALLOWED_HOSTS
    sed -i.bak "/ALLOWED_HOSTS = \[/a\    '$IP'," server/config/settings.py
fi

echo "Configuration files updated with IP: $IP" 