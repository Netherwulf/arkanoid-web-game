import sys
import socketserver
import http.server

PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f'Serving at port {PORT}')
    print(f'Open your browser at: 127.0.0.1:{PORT}')
    httpd.serve_forever()