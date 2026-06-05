#!/usr/bin/env python3
"""Serve the songtext web app from the public/ folder."""

from __future__ import annotations

import argparse
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


PUBLIC_DIR = Path(__file__).resolve().parent / "public"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    if not PUBLIC_DIR.is_dir():
        raise SystemExit(f"Missing public folder: {PUBLIC_DIR}")

    handler = partial(Handler)
    with ThreadingHTTPServer(("", args.port), handler) as httpd:
        host = socket.gethostbyname(socket.gethostname())
        print(f"Serving {PUBLIC_DIR}")
        print(f"  Local:   http://localhost:{args.port}/viewer.html")
        print(f"  Network: http://{host}:{args.port}/viewer.html")
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
