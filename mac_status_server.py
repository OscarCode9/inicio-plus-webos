#!/usr/bin/env python3
"""Read-only Mac summary for Inicio+, restricted to explicitly allowed clients."""
import argparse
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import time

ROOT = Path.home()

def is_video_render(command):
    """Classify local render workers, never send command lines to the TV."""
    try:
        args = shlex.split(command)
    except ValueError:
        return False
    if not args:
        return False
    executable = Path(args[0]).name.lower()
    if executable in ('node', 'nodejs'):
        return any(re.fullmatch(r'render-remotion[^/]*\.[cm]?js', Path(a).name) for a in args[1:]) or any(
            'remotion' in a and i + 1 < len(args) and args[i + 1] == 'render'
            for i, a in enumerate(args))
    if executable not in ('ffmpeg', 'remotion-ffmpeg'):
        return False
    return '-vn' not in args and bool(re.search(r'\.(mp4|mov|mkv|webm|avi)$', args[-1], re.I)) and any(
        a in args for a in ('-c:v', '-codec:v', '-vcodec', '-filter_complex', '-vf'))


def mac_status(channels):
    try:
        disk = shutil.disk_usage(ROOT)
        storage = {'freeBytes': disk.free, 'totalBytes': disk.total}
    except OSError:
        storage = None
    try:
        result = subprocess.run(['ps', '-axo', 'command='], capture_output=True, text=True, timeout=3)
        rendering = any(is_video_render(line) for line in result.stdout.splitlines()) if result.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        rendering = None
    producing = [c['name'] for c in channels if any(j.get('state') == 'running' for j in c['jobs'])]
    return {'storage': storage, 'rendering': rendering, 'producing': producing}



def snapshot():
    now = datetime.now().astimezone()
    return {'generatedAt': now.isoformat(), 'servedAt': now.isoformat(),
            'utcOffsetMinutes': int(now.utcoffset().total_seconds() / 60),
            'channels': [], 'mac': mac_status([])}


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, allowed_tv):
        self.allowed = {'127.0.0.1', '::1', allowed_tv}
        super().__init__(address, Handler)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.client_address[0] not in self.server.allowed:
            self.send_error(403)
            return
        if self.path.split('?')[0] != '/status':
            self.send_error(404)
            return
        payload = json.dumps(snapshot(), ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_args):
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tv', required=True, help='Allowed TV address, supplied locally')
    parser.add_argument('--storage', type=Path, default=Path.home(), help='Volume to monitor')
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    ROOT = args.storage.expanduser().resolve()
    Server(('0.0.0.0', args.port), args.tv).serve_forever()
