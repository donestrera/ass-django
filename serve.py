#!/usr/bin/env python3
"""
Simple development server launcher for React frontend.
This script launches the npm dev server directly, which is more reliable than
serving static files. It handles all the routing and hot reloading.
"""
import os
import sys
import subprocess
import time
import signal

# Configuration
PORT = int(os.environ.get("PORT", 9090))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIR = os.path.join(BASE_DIR, "client")

def cleanup_processes():
    """Kill any existing processes on the port"""
    print(f"Cleaning up existing processes on port {PORT}...")
    try:
        # Find processes using the port
        lsof_output = subprocess.check_output(
            f"lsof -ti :{PORT}", shell=True
        ).decode().strip()
        
        if lsof_output:
            pids = lsof_output.split('\n')
            print(f"Found processes: {pids}")
            for pid in pids:
                print(f"Killing process {pid}")
                os.kill(int(pid), signal.SIGKILL)
        
        # Give it a moment to release the port
        time.sleep(1)
        print("Cleaned up existing processes")
    except subprocess.CalledProcessError:
        # No processes found
        print("No processes found using the port")
    except Exception as e:
        print(f"Warning: Error cleaning up processes: {e}")

def check_client_directory():
    """Verify client directory exists"""
    if not os.path.exists(CLIENT_DIR):
        print(f"Error: Client directory not found at {CLIENT_DIR}")
        sys.exit(1)
    
    print(f"Client directory found at {CLIENT_DIR}")

def start_dev_server():
    """Start the npm development server"""
    try:
        # Find npm
        try:
            npm_path = subprocess.check_output("which npm", shell=True).decode().strip()
        except:
            npm_path = "/opt/homebrew/bin/npm"
        
        print(f"Using npm at: {npm_path}")
        
        # Change to client directory
        os.chdir(CLIENT_DIR)
        
        # Set the PORT environment variable
        env = os.environ.copy()
        env["PORT"] = str(PORT)
        
        # Run npm dev server
        print(f"Starting development server on port {PORT}...")
        process = subprocess.Popen(
            [npm_path, "run", "dev", "--", "--port", str(PORT), "--host"],
            env=env
        )
        
        # Wait for server to start
        time.sleep(5)
        
        # Check if process is still running
        if process.poll() is None:
            print(f"Development server started successfully on port {PORT}")
            print(f"You can access the application at: http://localhost:{PORT}")
            process.wait()  # Wait for process to complete
        else:
            print("Error: Development server failed to start")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Error starting development server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("=== Frontend Development Server ===")
    cleanup_processes()
    check_client_directory()
    start_dev_server()