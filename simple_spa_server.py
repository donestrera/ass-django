#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Print request info
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

# Configuration
PORT = 9090
DIRECTORY = "client/dist"

# Change to the specified directory
os.chdir(DIRECTORY)
print(f"Changed to directory: {os.getcwd()}")

# Create server
Handler = SPAHandler
httpd = socketserver.TCPServer(("", PORT), Handler)

print(f"Serving {DIRECTORY} at http://localhost:{PORT}")
httpd.serve_forever() 