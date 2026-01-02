#!/usr/bin/env python3
"""
Simple static server with a few mock API endpoints for local testing.
Run this from the `WebUi` folder or `python serve.py` and it will open
http://localhost:8000 in your default browser.

Provides:
 - static files from the current directory
 - GET /api/status -> JSON status
 - GET /api/live   -> JSON live-data sample
 - POST /api/event -> accepts JSON event, returns {ok: true}

No external dependencies.
"""

import http.server
import socketserver
import json
import os
import urllib.parse
import threading
import webbrowser
import sys
import time

PORT = 8000
DATA_FILE = 'mock_data.json'

# persisted state: events + optional config
EVENTS = []
CONFIG = {}

def load_data():
    global EVENTS, CONFIG
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                d = json.load(f)
                EVENTS = d.get('events', []) or []
                CONFIG = d.get('config', {}) or {}
        else:
            EVENTS = []
            CONFIG = {}
    except Exception:
        EVENTS = []
        CONFIG = {}

def save_data():
    # atomic write
    tmp = DATA_FILE + '.tmp'
    try:
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump({'events': EVENTS, 'config': CONFIG}, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DATA_FILE)
    except Exception:
        try:
            if os.path.exists(tmp): os.remove(tmp)
        except Exception:
            pass
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump({'events': EVENTS, 'config': CONFIG}, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DATA_FILE)
    except Exception:
        try:
            if os.path.exists(tmp): os.remove(tmp)
        except Exception:
            pass

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for convenience during local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/'):
            if path == '/api/status':
                payload = {
                    'status': 'idle',
                    'session': 'mock-session',
                    'env': 'python',
                    'firmware': 'serve-mock v0.1',
                    'message': 'Mock server running (python)'
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(payload).encode())
                return

            if path == '/api/live':
                payload = {
                    'live': [
                        {'t': 0, 'fl': 12.3, 'fr': 12.4, 'rl': 12.1, 'rr': 12.0}
                    ]
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(payload).encode())
                return

            if path == '/api/events':
                # return events in newest-first order
                evs = list(reversed(EVENTS))
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'events': evs}).encode())
                return
            if path == '/api/config':
                # return current configuration
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'config': CONFIG}).encode())
                return

        # Fallback to default static file handler
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/event':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length) if length else b''
            try:
                data = json.loads(body.decode('utf-8') or '{}')
            except Exception:
                data = {'raw': body.decode('utf-8', errors='replace')}

            # persist event in memory with timestamp
            evt = {
                'ts': int(time.time()),
                'data': data
            }
            EVENTS.append(evt)
            try:
                save_data()
            except Exception:
                pass

            print('Received event:', data)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'event': EVENTS[-1]}).encode())
            return

        if path == '/api/event/comment':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length) if length else b''
            try:
                data = json.loads(body.decode('utf-8') or '{}')
            except Exception:
                data = {'raw': body.decode('utf-8', errors='replace')}

            event_ts = data.get('event_ts')
            comment = data.get('comment')
            if event_ts is None or comment is None:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'missing event_ts or comment'}).encode())
                return

            # find event by timestamp
            ev = None
            for e in EVENTS:
                if int(e.get('ts')) == int(event_ts):
                    ev = e
                    break

            if ev is None:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'event not found'}).encode())
                return

            ev.setdefault('comments', []).append({'ts': int(time.time()), 'text': str(comment)})
            try:
                save_data()
            except Exception:
                pass

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'event': ev}).encode())
            return

        # config endpoint: get/set persistent test configuration
        if path == '/api/config':
            if self.command == 'GET':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'config': CONFIG}).encode())
                return
            # POST handled below

        if path == '/api/config' and self.command == 'POST':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length) if length else b''
            try:
                data = json.loads(body.decode('utf-8') or '{}')
            except Exception:
                data = {}

            # Accept either {config: {...}} or a raw config object
            cfg = data.get('config') or data
            if not isinstance(cfg, dict):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'invalid config'}).encode())
                return

            # merge shallowly into CONFIG
            for k, v in cfg.items():
                if isinstance(v, dict):
                    CONFIG[k] = CONFIG.get(k, {})
                    CONFIG[k].update(v)
                else:
                    CONFIG[k] = v

            try:
                save_data()
            except Exception:
                pass

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'config': CONFIG}).encode())
            return

        return super().do_POST()


def main(port=PORT):
    # Ensure working directory is this script's folder so relative paths work
    base = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base)
    # load persisted events if available
    load_data()

    with socketserver.ThreadingTCPServer(('', port), Handler) as httpd:
        url = f'http://localhost:{port}'
        print('Serving', base)
        print('Open in browser at', url)

        # Try to open browser in a separate thread to avoid blocking
        try:
            threading.Thread(target=webbrowser.open, args=(url,), daemon=True).start()
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nStopping server')
            httpd.shutdown()


if __name__ == '__main__':
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except Exception:
            pass
    main(port)
