"""Python + Flask rendition of `project_20260506_092326/projects` — same UI & data."""

from __future__ import annotations

import json
import os
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from logic import calculate_countdown, get_conference_status, get_next_deadline, header_stats

APP_DIR = Path(__file__).resolve().parent
DEFAULT_DATA = APP_DIR / "data" / "conferences.json"

app = Flask(__name__)


def load_conferences() -> list:
    path = Path(os.environ.get("CONF_DATA_FILE", DEFAULT_DATA)).expanduser()
    if not path.is_file():
        return []
    with path.open(encoding="utf-8") as f:
        return json.load(f)


@app.route("/")
def index():
    conferences = load_conferences()
    total, near = header_stats(conferences)
    return render_template(
        "index.html",
        conferences=conferences,
        total_count=total,
        deadline_count=near,
    )


@app.route("/api/health")
def api_health():
    return jsonify(status="ok")


@app.route("/api/conferences")
def api_conferences():
    conferences = load_conferences()
    return jsonify(success=True, count=len(conferences), conferences=conferences)


@app.route("/api/ccf-remote")
def api_ccf_remote():
    """Optional live fetch — mirrors upstream intent from the Node route (best-effort)."""
    url = (
        os.environ.get("CCF_REMOTE_URL")
        or request.args.get("url")
        or "https://ccfddl.top/api/conferences"
    )
    try:
        import urllib.request

        req = urllib.request.Request(url, headers={"User-Agent": "ccfddl-python-app"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode()
        parsed = json.loads(body)
        if isinstance(parsed, list):
            conferences = parsed
        elif isinstance(parsed, dict) and isinstance(parsed.get("conferences"), list):
            conferences = parsed["conferences"]
        elif isinstance(parsed, dict) and isinstance(parsed.get("data"), list):
            conferences = parsed["data"]
        else:
            conferences = []
        return jsonify(success=True, count=len(conferences), conferences=conferences)
    except Exception as exc:  # noqa: BLE001
        return jsonify(success=False, error=str(exc), conferences=[]), 502


@app.route("/api/preview")
def api_preview():
    """Expose computed fields for debugging or extensions."""
    conferences = load_conferences()
    out = []
    for c in conferences:
        nid = c.get("id")
        evt = get_next_deadline(c)
        tgt = (evt.get("date") if evt else None) or (c.get("dates") or {}).get("submission")
        out.append(
            {
                "id": nid,
                "status": get_conference_status(c),
                "countdownTarget": tgt,
                "countdown": calculate_countdown(str(tgt) if tgt else ""),
                "nextDeadlineTitle": evt.get("title") if evt else None,
            }
        )
    return jsonify(success=True, items=out)


def main():
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "5001"))
    app.run(host=host, debug=os.environ.get("FLASK_DEBUG") == "1", port=port)


if __name__ == "__main__":
    main()
