#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import socket
import subprocess
import time

# Kill any existing processes using port 9090
try:
    print("Checking for existing processes using port 9090...")
    subprocess.run(["pkill", "-f", "http.server.*9090"], check=False)
    subprocess.run(["pkill", "-f", "python.*serve.py"], check=False)
    # Give it a moment to release the port
    time.sleep(1)
    print("Cleaned up existing processes")
except Exception as e:
    print(f"Warning: Error cleaning up processes: {e}")

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Print request info for debugging
        print(f"GET request for: {self.path}")
        
        # For SPA routes, always serve index.html
        if self.path.startswith('/dashboard/') or self.path == '/dashboard':
            print(f"SPA route detected: {self.path}, serving index.html")
            self.path = '/index.html'
        
        # Check if file exists
        file_path = self.translate_path(self.path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            print(f"File exists: {file_path}")
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        
        # Default to index.html for non-existent paths (SPA routing)
        print(f"File not found: {file_path}, serving index.html")
        self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

class ReuseAddressServer(socketserver.TCPServer):
    allow_reuse_address = True
    
PORT = 9090
HOST = "0.0.0.0"  # Listen on all interfaces
DIRECTORY = "client/dist"

# Make sure the directory exists
if not os.path.exists(DIRECTORY):
    print(f"Error: Directory {DIRECTORY} does not exist.")
    print(f"Current working directory: {os.getcwd()}")
    print("Please run this script from the project root directory.")
    sys.exit(1)

# Change to the specified directory
os.chdir(DIRECTORY)
print(f"Changed to directory: {os.getcwd()}")

# Try to close any existing connections first
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT))
    s.close()
    print(f"Successfully verified port {PORT} is available")
except Exception as e:
    print(f"Warning: Could not verify port {PORT} is available: {e}")
    # Try again with a delay
    print("Waiting 5 seconds and trying again...")
    time.sleep(5)

# Create server with address reuse
try:
    Handler = SPAHandler
    httpd = ReuseAddressServer((HOST, PORT), Handler)

    print(f"Serving {DIRECTORY} at http://{HOST}:{PORT}")
    print(f"You can access the server at http://localhost:{PORT}")
    print(f"Press Ctrl+C to stop the server")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Server stopped by user")
    finally:
        httpd.server_close()
        print("Server closed")
except OSError as e:
    if e.errno == 48:  # Address already in use
        print("Error: Port 9090 is already in use.")
        print("Try running these commands manually to free the port:")
        print("  pkill -f 'http.server.*9090'")
        print("  pkill -f 'python.*serve.py'")
        sys.exit(1)
    else:
        raise 