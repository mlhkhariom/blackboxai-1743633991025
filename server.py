from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

def run_server(port=8000):
    try:
        server_address = ('', port)
        httpd = HTTPServer(server_address, CORSRequestHandler)
        print(f'Starting server on port {port}...')
        print(f'Open http://localhost:{port} in your browser')
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server...')
        httpd.socket.close()
        sys.exit(0)
    except Exception as e:
        print(f'Error starting server: {e}')
        sys.exit(1)

if __name__ == '__main__':
    run_server()