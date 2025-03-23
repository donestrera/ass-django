#!/bin/bash

# Script to ensure MySQL is running on macOS
echo "Checking MySQL service status..."

# Check if MySQL is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo "MySQL service is not running. Starting MySQL..."
    
    # Try different methods to start MySQL based on installation type
    if command -v brew &> /dev/null && brew services list | grep -q mysql; then
        # If MySQL was installed via Homebrew
        echo "Starting MySQL via Homebrew..."
        brew services start mysql
    elif [ -d "/usr/local/mysql/bin" ]; then
        # If MySQL was installed from the official package
        echo "Starting MySQL via mysql.server..."
        sudo /usr/local/mysql/support-files/mysql.server start
    elif [ -d "/opt/homebrew/opt/mysql" ]; then
        # For Apple Silicon Macs with Homebrew
        echo "Starting MySQL via Homebrew (Apple Silicon)..."
        brew services start mysql
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
            echo "  - sudo /usr/local/mysql/support-files/mysql.server start (official package)"
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

echo "MySQL is running. You can now start your Django application." 