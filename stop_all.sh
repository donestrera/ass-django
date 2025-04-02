#!/bin/zsh

#===============================================
# Person Detection System Stop Script
# - Stops all running services started by start_all.sh
# - Provides status information
#===============================================

echo ""
echo "================================================"
echo "      Stopping Person Detection System"
echo "================================================"
echo ""

# Initialize counters for statistics
stopped_count=0
not_found_count=0
LOG_DIR="/Users/dondon/Library/Logs"

#-----------------------------------------------
# Function to check if a port is in use
#-----------------------------------------------
check_port() {
    lsof -i ":$1" &>/dev/null
    return $?
}

#-----------------------------------------------
# Function to kill process using a specific port
#-----------------------------------------------
kill_port() {
    local port="$1"
    local service_name="$2"
    
    echo "Checking for $service_name on port $port..."
    
    if check_port "$port"; then
        echo "Found $service_name running on port $port. Stopping..."
        
        # Find PIDs using this port
        local pids=$(lsof -ti ":$port" 2>/dev/null)
        if [[ -n "$pids" ]]; then
            echo "  - Killing process(es) with PID: $pids"
            kill -9 $pids 2>/dev/null
            stopped_count=$((stopped_count + 1))
        fi
        
        # Verify port is closed
        sleep 1
        if check_port "$port"; then
            echo "  - Warning: Failed to stop $service_name completely"
        else
            echo "  - Successfully stopped $service_name"
        fi
    else
        echo "No process found using port $port ($service_name)"
        not_found_count=$((not_found_count + 1))
    fi
}

#-----------------------------------------------
# Function to kill processes by name pattern
#-----------------------------------------------
kill_process() {
    local pattern="$1"
    local service_name="$2"
    
    echo "Checking for $service_name processes ($pattern)..."
    
    # Find PIDs with this pattern
    local pids=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [[ -n "$pids" ]]; then
        echo "  - Found $service_name with PID(s): $pids. Stopping..."
        pkill -9 -f "$pattern" 2>/dev/null
        stopped_count=$((stopped_count + 1))
        echo "  - Successfully stopped $service_name"
    else
        echo "No process found matching pattern: $pattern ($service_name)"
        not_found_count=$((not_found_count + 1))
    fi
}

#-----------------------------------------------
# Stop all services
#-----------------------------------------------

# 1. Django backend
kill_port 8000 "Django backend"

# 2. Camera relay service
kill_port 8765 "Camera relay service"

# 3. Frontend server
kill_port 9090 "Frontend server"

# 4. Find and kill by pattern for processes that might not use fixed ports
kill_process "gunicorn.*config.wsgi" "Django backend (gunicorn)"
kill_process "camera_relay.py" "Camera relay service"
kill_process "simple_capture.py" "OpenCV Simple Capture"
kill_process "python.*serve.py" "Frontend server"
kill_process "python.*9090" "Frontend server (port 9090)"
kill_process "spa_server.py" "SPA server"

# Final verification - double check no processes are still running
echo ""
echo "Performing final verification..."

# Check if any processes are still running
remaining_pids=$(pgrep -f "gunicorn|camera_relay|simple_capture|spa_server\.py|python.*9090" 2>/dev/null)

if [[ -n "$remaining_pids" ]]; then
    echo "Warning: Some processes may still be running:"
    ps -p $remaining_pids -o pid,ppid,command
    echo "Attempting force kill on remaining processes..."
    kill -9 $remaining_pids 2>/dev/null
    stopped_count=$((stopped_count + remaining_pids))
else
    echo "No remaining processes found. System is fully stopped."
fi

#-----------------------------------------------
# Summary
#-----------------------------------------------
echo ""
echo "======================= STOP SUMMARY ======================="
echo "Processes stopped:      $stopped_count"
echo "Processes not found:    $not_found_count"
echo ""
echo "Log files (for reference):"
echo "- Django:           $LOG_DIR/django-yolo.log"
echo "- Camera Relay:     $LOG_DIR/yolo-detection.log"
echo "- OpenCV Detection: $LOG_DIR/opencv-detection.log"
echo "- Frontend:         $LOG_DIR/frontend-yolo.log"
echo ""
echo "The Person Detection System has been stopped."
echo "============================================================"
