#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import socket
import time

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

    def end_headers(self):
        # Add Cache-Control header to prevent caching
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        return super().end_headers()

class ReuseAddressServer(socketserver.TCPServer):
    allow_reuse_address = True

# Get port from environment or use default
port = int(os.environ.get('PORT', 9090))
directory = os.environ.get('DIRECTORY', 'client/dist')

print(f"Starting server on port {port}, serving from {directory}")

# Make sure directory exists
if not os.path.exists(directory):
    print(f"Error: Directory {directory} does not exist")
    sys.exit(1)

# Change to the specified directory
os.chdir(directory)
print(f"Changed to directory: {os.getcwd()}")

# Start the server
try:
    httpd = ReuseAddressServer(("", port), SPAHandler)
    print(f"Server running at http://localhost:{port}")
    httpd.serve_forever()
except OSError as e:
    if e.errno == 48:  # Address already in use
        print(f"Error: Port {port} is already in use")
        sys.exit(1)
    else:
        raise
except KeyboardInterrupt:
    print("Server stopped by user")
