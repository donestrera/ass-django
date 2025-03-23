#!/bin/bash

# Script to check if the research database exists and create it if it doesn't
echo "Checking if the research database exists..."

# MySQL credentials from Django settings
DB_NAME="research"
DB_USER="group5"
DB_PASSWORD="@Group555"
DB_HOST="localhost"

# Check if the database exists
if mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME" 2>/dev/null; then
    echo "Database '$DB_NAME' exists."
else
    echo "Database '$DB_NAME' does not exist. Attempting to create it..."
    
    # Try to create the database
    if mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null; then
        echo "Database '$DB_NAME' created successfully."
    else
        echo "Failed to create database as user '$DB_USER'."
        echo "Attempting to create database as root user..."
        
        # Prompt for root password
        echo "Please enter MySQL root password:"
        read -s ROOT_PASSWORD
        
        if mysql -h $DB_HOST -u root -p$ROOT_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null; then
            echo "Database '$DB_NAME' created successfully as root."
            
            # Grant privileges to the user
            mysql -h $DB_HOST -u root -p$ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'$DB_HOST';" 2>/dev/null
            mysql -h $DB_HOST -u root -p$ROOT_PASSWORD -e "FLUSH PRIVILEGES;" 2>/dev/null
            
            echo "Privileges granted to user '$DB_USER'."
        else
            echo "ERROR: Failed to create database. Please create it manually:"
            echo "  1. Log in to MySQL as root: mysql -u root -p"
            echo "  2. Create the database: CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            echo "  3. Grant privileges: GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'$DB_HOST';"
            echo "  4. Apply changes: FLUSH PRIVILEGES;"
            exit 1
        fi
    fi
fi

echo "Database check completed." 