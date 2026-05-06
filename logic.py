"""Conference deadline helpers (aligned with TS `conferences.ts` semantics)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional, Tuple

from dateutil import parser as date_parser

Status = Literal["deadline", "upcoming", "ongoing", "past"]


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value or value == "TBD":
        return None
    text = value.replace("/", "-").strip()
    try:
        return date_parser.parse(text, fuzzy=False, dayfirst=False)
    except (ValueError, TypeError):
        pass
    try:
        return date_parser.parse(text, fuzzy=True, dayfirst=False)
    except (ValueError, TypeError, OverflowError):
        return None


def get_next_deadline(conference: dict[str, Any]) -> Optional[dict[str, Any]]:
    now = datetime.now()
    timeline = conference.get("timeline") or []
    for event in timeline:
        d = event.get("date") if isinstance(event, dict) else None
        if not d or d == "TBD":
            continue
        event_dt = _parse_dt(str(d))
        if event_dt and event_dt > now:
            return event
    return None


def get_conference_status(conference: dict[str, Any]) -> Status:
    now = datetime.now()
    dates = conference.get("dates") or {}
    submission = _parse_dt(dates.get("submission"))
    conference_dt = (
        None
        if not dates.get("conference") or dates.get("conference") == "TBD"
        else _parse_dt(str(dates.get("conference")))
    )

    if submission:
        delta_days = (submission - now).total_seconds() / 86400.0
        if now < submission:
            if delta_days <= 7:
                return "deadline"
            return "upcoming"
        if conference_dt is not None and now >= submission and now < conference_dt:
            return "ongoing"

    return "past"


def calculate_countdown(target_date: Optional[str]) -> dict[str, Any]:
    """Return countdown fields consumed by `static/app.js`."""
    empty = {"days": 0, "hours": 0, "minutes": 0, "seconds": 0, "isOver": True, "label": "已截止"}
    if not target_date or target_date == "TBD":
        return {**empty, "label": "日期无效"}

    target = _parse_dt(str(target_date))
    if target is None:
        return {**empty, "label": "日期无效"}

    diff = target.timestamp() - datetime.now().timestamp()
    if diff <= 0:
        return empty

    days = int(diff // 86400)
    rem = diff - days * 86400
    hours = int(rem // 3600)
    rem -= hours * 3600
    minutes = int(rem // 60)
    seconds = int(rem - minutes * 60)
    return {
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "isOver": False,
        "label": "",
    }


def header_stats(conferences: list[dict[str, Any]]) -> Tuple[int, int]:
    total = len(conferences)
    near = sum(1 for c in conferences if get_conference_status(c) == "deadline")
    return total, near
