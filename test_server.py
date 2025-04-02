#!/usr/bin/env python3
import http.server
import socketserver

PORT = 9090

class SimpleHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b"<html><body><h1>Test Server Working!</h1></body></html>")

print(f"Starting test server on port {PORT}...")
with socketserver.TCPServer(("", PORT), SimpleHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    httpd.serve_forever() 