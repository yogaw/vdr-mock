#!/usr/bin/env python3
"""Local document -> PDF conversion service for office-test.html.

Requires LibreOffice (brew install --cask libreoffice).
Converts office documents to PDF with soffice headless, pixel-accurate.

Endpoints:
  GET  /health          -> {"ok": true, "soffice": "..."}
  POST /convert?name=F  -> raw file bytes in body, application/pdf out

Run:  python3 tools/convert-server.py     (listens on 127.0.0.1:8767)
"""
import http.server
import json
import os
import subprocess
import tempfile
import threading
import urllib.parse

SOFFICE = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
HOST, PORT = '127.0.0.1', 8767
ALLOWED = {'.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt',
           '.odt', '.ods', '.odp', '.rtf', '.csv', '.txt'}
MAX_BYTES = 200 * 1024 * 1024  # 200 MB

# soffice must not run concurrently (profile contention)
CONVERT_LOCK = threading.Lock()


def run_soffice(args, timeout=180):
    return subprocess.run([SOFFICE] + args, capture_output=True, text=True, timeout=timeout)


def convert_to_pdf(src, outdir):
    with CONVERT_LOCK:
        run_soffice(['--headless', '--norestore', '--convert-to', 'pdf',
                     '--outdir', outdir, src])
    pdf = os.path.join(outdir, os.path.splitext(os.path.basename(src))[0] + '.pdf')
    return pdf if os.path.exists(pdf) else None


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):
        print('[convert] ' + fmt % args, flush=True)

    # ---------- helpers ----------
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')

    def _json(self, code, obj):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header('Content-Length', '0')
        self.end_headers()

    # ---------- endpoints ----------
    def do_GET(self):
        if self.path.split('?')[0] == '/health':
            if not os.path.exists(SOFFICE):
                return self._json(200, {'ok': False, 'error': 'soffice not found at ' + SOFFICE})
            try:
                v = run_soffice(['--version'], timeout=30).stdout.strip()
                return self._json(200, {'ok': bool(v), 'soffice': v})
            except Exception as e:
                return self._json(200, {'ok': False, 'error': str(e)})
        return self._json(404, {'error': 'not found'})

    def do_POST(self):
        if self.path.split('?')[0] != '/convert':
            return self._json(404, {'error': 'not found'})

        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename((qs.get('name') or ['document'])[0]) or 'document'
        ext = os.path.splitext(name)[1].lower()
        if ext not in ALLOWED:
            return self._json(400, {'error': 'unsupported format ' + ext})

        try:
            length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BYTES:
            return self._json(400, {'error': 'bad or missing body size'})

        data = self.rfile.read(length)
        with tempfile.TemporaryDirectory() as td:
            src = os.path.join(td, name)
            with open(src, 'wb') as f:
                f.write(data)
            try:
                pdf = convert_to_pdf(src, td)
            except subprocess.TimeoutExpired:
                return self._json(504, {'error': 'conversion timed out'})
            except Exception as e:
                return self._json(500, {'error': 'conversion failed: ' + str(e)})
            if not pdf:
                return self._json(422, {'error': 'soffice produced no PDF for ' + name})
            with open(pdf, 'rb') as f:
                out = f.read()

        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/pdf')
        self.send_header('Content-Disposition', 'inline; filename="' + name + '.pdf"')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True


if __name__ == '__main__':
    if not os.path.exists(SOFFICE):
        print('WARNING: soffice not found at ' + SOFFICE)
        print('Install LibreOffice first: brew install --cask libreoffice')
    print('convert-server listening on http://%s:%d' % (HOST, PORT))
    Server((HOST, PORT), Handler).serve_forever()
