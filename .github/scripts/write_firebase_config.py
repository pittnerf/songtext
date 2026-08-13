#!/usr/bin/env python3
"""Write public/js/config.js from environment variables (GitHub Actions secrets)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

REQUIRED = [
    "FIREBASE_API_KEY",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_DATABASE_URL",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_APP_ID",
]


def main() -> None:
    missing = [name for name in REQUIRED if not os.environ.get(name, "").strip()]
    if missing:
        sys.exit(
            "Missing GitHub Actions secrets: "
            + ", ".join(missing)
            + "\n\nIn your repository: Settings → Secrets and variables → Actions "
            + "→ New repository secret. Add each name exactly as listed above."
        )

    config = {
        "songsUrl": "data/songs.json",
        "pollIntervalMs": int(os.environ.get("SONGTEXT_POLL_INTERVAL_MS") or "1000"),
        "firebase": {
            "apiKey": os.environ["FIREBASE_API_KEY"].strip(),
            "authDomain": os.environ["FIREBASE_AUTH_DOMAIN"].strip(),
            "databaseURL": os.environ["FIREBASE_DATABASE_URL"].strip(),
            "projectId": os.environ["FIREBASE_PROJECT_ID"].strip(),
            "storageBucket": os.environ["FIREBASE_STORAGE_BUCKET"].strip(),
            "messagingSenderId": os.environ["FIREBASE_MESSAGING_SENDER_ID"].strip(),
            "appId": os.environ["FIREBASE_APP_ID"].strip(),
        },
        "statePath": (os.environ.get("FIREBASE_STATE_PATH") or "songtext/currentSongNumber").strip(),
        "externalUrlMode": (os.environ.get("FIREBASE_EXTERNAL_URL_MODE") or "open").strip(),
    }

    output = Path("public/js/config.js")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        "window.SONGTEXT_CONFIG = " + json.dumps(config, indent=2, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {output} (values come from GitHub secrets, not from git).")


if __name__ == "__main__":
    main()
