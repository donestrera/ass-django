#\!/usr/bin/env python3
import os
import subprocess
import sys
import time
import signal

# Configuration
PORT = int(os.environ.get("PORT", 9090))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIR = os.path.join(BASE_DIR, "client")

def run_npm_dev_server():
    """Run the npm development server directly"""
    print(f"Starting development server on port {PORT}")
    
    # Find npm path
    try:
        npm_path = subprocess.check_output("which npm", shell=True).decode().strip()
    except:
        npm_path = "/opt/homebrew/bin/npm"
    
    print(f"Using npm at: {npm_path}")
    
    # Check if client directory exists
    if not os.path.exists(CLIENT_DIR):
        print(f"Error: Client directory {CLIENT_DIR} not found")
        sys.exit(1)
        
    # Navigate to client directory
    os.chdir(CLIENT_DIR)
    print(f"Changed directory to: {os.getcwd()}")
    
    # Setup environment with PORT
    env = os.environ.copy()
    env["PORT"] = str(PORT)
    
    # Start the dev server detached
    print(f"Starting npm dev server on port {PORT}...")
    
    dev_process = subprocess.Popen(
        [npm_path, "run", "dev", "--", "--port", str(PORT), "--host"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env
    )
    
    # Set up signal handler to terminate child processes properly
    def handle_exit(sig, frame):
        print("\nReceived exit signal, shutting down...")
        if dev_process:
            dev_process.terminate()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    
    # Wait a bit for the server to start
    time.sleep(2)
    
    # Print access URL
    print(f"Server should be accessible at: http://localhost:{PORT}")
    print("If the server doesn't respond, check the logs for errors")
    
    # Monitor the process and keep script running
    try:
        while True:
            # Check if process is still running
            if dev_process.poll() is not None:
                output = dev_process.stdout.read().decode()
                print(f"Development server exited with code {dev_process.returncode}")
                print(f"Output: {output}")
                break
            
            # Wait a bit before checking again
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
        if dev_process:
            dev_process.terminate()

    return dev_process.returncode
    
if __name__ == "__main__":
    sys.exit(run_npm_dev_server())
