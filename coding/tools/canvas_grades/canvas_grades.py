#!/usr/bin/env python3
"""Fetch YOUR OWN grades from Canvas and write a file the ADHD1X app can import.

How it keeps your login safe
  * Only the Python standard library is used. Nothing to install, no extra code to trust.
  * Your token is typed into a hidden prompt (or read from an environment variable). It is never
    saved, never printed, and never put on the command line, where shell history could keep it.
  * It only sends requests to ONE website (https only) and refuses to follow a redirect or a
    "next page" link to any other site, so a bad link cannot collect your token.
  * It only reads (GET). It never changes anything in Canvas.
  * It reads only YOUR OWN things, and only what the app uses: grades, assignment details, how each class is
    graded (weights, letter scale, late policy), the syllabus and recent announcements.
  * It never reads your inbox, other students' work or posts, files, quiz questions or answers, feedback
    comments, or your profile. The file has no emails, no student IDs and no names of people.
  * Text from Canvas (instructions, syllabus, announcements) is turned into plain text and cut to a set length.
  * It refuses to save the file inside a git project folder, so grades cannot be committed by accident.

The website itself never sees your token. It only imports the file this tool writes.
"""
from __future__ import annotations

import argparse
import datetime as dt
import getpass
import html.parser
import json
import os
import re
import ssl
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Tuple

DEFAULT_BASE_URL = "https://canvas.chaffey.edu"
FORMAT_NAME = "ADHD1X-canvas-grades"
FORMAT_VERSION = 2
MAX_RESPONSE_BYTES = 20 * 1024 * 1024
MAX_PAGES = 200
TIMEOUT_SECONDS = 30
MAX_RETRIES = 3
USER_AGENT = "adhd1x-canvas-grades/2.0 (personal use, read-only)"

# Limits on what goes in the file, so it stays small and holds no more than the app uses.
MAX_DESCRIPTION = 4000
MAX_SYLLABUS = 20000
MAX_ANNOUNCEMENT_TEXT = 1500
MAX_ANNOUNCEMENTS = 15
ANNOUNCEMENT_DAYS = 30
MAX_RUBRIC_ROWS = 30
MAX_GROUPS = 100
MAX_SCALE_ROWS = 40


class CanvasError(Exception):
    """A problem we expect and can explain in plain words. Messages never contain secrets."""


# ---------------------------------------------------------------- credentials

_SECRET_CHARS = re.compile(r"^[A-Za-z0-9~._\-+/=%]{8,1024}$")
_TOKEN_CHAR = re.compile(r"[A-Za-z0-9~._\-+/=%]")
# A cookie value may use any visible character except space, quote, comma, semicolon and backslash (RFC 6265).
_COOKIE_CHAR = re.compile(r"[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]")
_COOKIE_VALUE = re.compile(r"^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]{8,4096}$")
# What a terminal can add when text is pasted: colour codes and "bracketed paste" markers.
_ANSI = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)")
_CHAR_NAMES = {
    " ": "a space", "\t": "a tab", "\n": "a line break", "\r": "a line break", ";": "a semicolon",
    '"': "a quote mark", ",": "a comma", "\\": "a backslash", "\u00a0": "a space",
}


@dataclass(frozen=True)
class Credential:
    """A token or a cookie value. Printing it, or showing it in an error, shows nothing secret."""

    kind: str  # "token" or "cookie"
    value: str

    def __repr__(self) -> str:  # keeps the secret out of logs and tracebacks
        return f"Credential(kind={self.kind!r}, value=<hidden>)"

    __str__ = __repr__

    def headers(self) -> Dict[str, str]:
        if self.kind == "cookie":
            return {"Cookie": f"canvas_session={self.value}"}
        return {"Authorization": f"Bearer {self.value}"}


def _bad_character_names(text: str, allowed: "re.Pattern[str]") -> List[str]:
    """Names the KINDS of characters that are not allowed. It never repeats the text itself."""
    names: List[str] = []
    for ch in text:
        if allowed.fullmatch(ch):
            continue
        if ch in _CHAR_NAMES:
            name = _CHAR_NAMES[ch]
        elif ord(ch) < 32 or ord(ch) == 127:
            name = "a hidden control character"
        elif ord(ch) > 126:
            name = "a character that is not a plain letter or digit (such as a curly quote or an ellipsis)"
        else:
            name = f"the character {ch}"
        if name not in names:
            names.append(name)
    return names[:4]


def _check_secret(candidate: str, kind: str = "token") -> str:
    cookie = kind == "cookie"
    pattern = _COOKIE_VALUE if cookie else _SECRET_CHARS
    if pattern.match(candidate):
        return candidate
    # Say what is wrong, without repeating what was pasted.
    longest = 4096 if cookie else 1024
    size = len(candidate)
    reasons: List[str] = []
    if size == 0:
        reasons.append(
            "nothing came through. The prompt is hidden, so nothing shows as you paste. In Windows terminals, "
            "right-click to paste (Ctrl+V does not always work there), then press Enter"
        )
    elif size < 8:
        reasons.append(f"it is only {size} character{'s' if size != 1 else ''} long, and a real one is much longer")
    elif size > longest:
        reasons.append(f"it is {size} characters long, which is too long to be a real one")
    bad = _bad_character_names(candidate, _COOKIE_CHAR if cookie else _TOKEN_CHAR)
    if bad:
        reasons.append("it contains " + ", ".join(bad))
    detail = ("Why: " + "; ".join(reasons) + ". ") if reasons else ""
    raise CanvasError(
        f"That does not look like a valid {kind} value. {detail}"
        "Copy only the value itself (the long text in the Value column), with no spaces or line breaks."
    )


def _tidy(raw: str) -> str:
    """Removes what a terminal can add around pasted text, then the outer spaces and quote marks."""
    return _ANSI.sub("", raw).strip().strip("\"'").strip()


def clean_token(raw: str) -> str:
    value = _tidy(raw)
    value = re.sub(r"^Bearer\s+", "", value, flags=re.IGNORECASE)
    return _check_secret(value, "token")


def clean_cookie(raw: str) -> str:
    """Accepts the bare value, 'canvas_session=value', a whole Cookie header, or the row copied from the browser's
    cookie table (name, a tab, then the value). Keeps only the canvas_session value."""
    text = _tidy(raw)
    match = re.search(r"(?:^|;\s*)canvas_session=([^;\s]+)", text)
    if match:
        return _check_secret(match.group(1), "cookie")
    parts = text.split()
    if len(parts) >= 2 and parts[0] == "canvas_session":  # a row copied from the cookie table
        return _check_secret(parts[1].strip("\"'"), "cookie")
    return _check_secret(text.split(";")[0].strip(), "cookie")


def read_credential(
    use_cookie: bool,
    env: Mapping[str, str] = os.environ,
    prompt: Callable[[str], str] = getpass.getpass,
) -> Credential:
    if use_cookie:
        raw = env.get("CANVAS_SESSION_COOKIE") or prompt("Paste your canvas_session cookie value (hidden): ")
        return Credential("cookie", clean_cookie(raw))
    raw = env.get("CANVAS_ACCESS_TOKEN") or prompt("Paste your Canvas access token (hidden): ")
    if re.search(r"canvas_session|;", _tidy(raw)):
        raise CanvasError(
            "That looks like a browser cookie, not an access token. Run the tool again with --session-cookie."
        )
    return Credential("token", clean_token(raw))


# ------------------------------------------------------------------- network


def validate_base_url(url: str) -> str:
    parts = urllib.parse.urlsplit(url.strip())
    if parts.scheme != "https":
        raise CanvasError("The Canvas address must start with https:// so your login is encrypted on the way.")
    if (
        not parts.hostname
        or parts.username
        or parts.password
        or parts.port not in (None, 443)
        or parts.path not in ("", "/")
        or parts.query
        or parts.fragment
    ):
        raise CanvasError("Use just the website address, for example https://canvas.chaffey.edu")
    return f"https://{parts.hostname.lower()}"


class SameHostRedirectHandler(urllib.request.HTTPRedirectHandler):
    """urllib would copy your Authorization header to wherever a redirect points. This does not."""

    def __init__(self, host: str) -> None:
        super().__init__()
        self._host = host

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D401
        parts = urllib.parse.urlsplit(newurl)
        if parts.scheme != "https" or (parts.hostname or "").lower() != self._host:
            raise CanvasError(
                "Canvas tried to send the request to a different website, so it was stopped to keep your login safe."
            )
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def build_opener(host: str) -> urllib.request.OpenerDirector:
    context = ssl.create_default_context()  # certificate checking stays on
    return urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=context),
        SameHostRedirectHandler(host),
    )


_NEXT_LINK = re.compile(r'<([^>]+)>\s*;\s*rel="next"')


def parse_next_link(header: Optional[str]) -> Optional[str]:
    if not header:
        return None
    match = _NEXT_LINK.search(header)
    return match.group(1) if match else None


class CanvasClient:
    """Read-only. Talks to one host. Never sends the credential anywhere else."""

    def __init__(
        self,
        base_url: str,
        credential: Credential,
        opener: Optional[urllib.request.OpenerDirector] = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.base = validate_base_url(base_url)
        self.host = urllib.parse.urlsplit(self.base).hostname or ""
        self._credential = credential
        self._opener = opener or build_opener(self.host)
        self._sleep = sleep

    def _check_url(self, url: str) -> None:
        parts = urllib.parse.urlsplit(url)
        if parts.scheme != "https" or (parts.hostname or "").lower() != self.host:
            raise CanvasError(
                "Canvas gave a link to a different website, so it was not followed. Your login was not sent there."
            )

    def _get(self, url: str, optional: bool = False) -> Tuple[Any, Optional[str]]:
        self._check_url(url)
        headers = {**self._credential.headers(), "Accept": "application/json", "User-Agent": USER_AGENT}
        request = urllib.request.Request(url, method="GET", headers=headers)
        for attempt in range(MAX_RETRIES + 1):
            try:
                with self._opener.open(request, timeout=TIMEOUT_SECONDS) as response:
                    body = response.read(MAX_RESPONSE_BYTES + 1)
                    if len(body) > MAX_RESPONSE_BYTES:
                        raise CanvasError("Canvas sent more data than expected, so it was stopped.")
                    next_url = parse_next_link(response.headers.get("Link"))
                try:
                    return json.loads(body.decode("utf-8")), next_url
                except (UnicodeDecodeError, ValueError):
                    raise CanvasError("Canvas sent something this tool could not read.") from None
            except urllib.error.HTTPError as error:
                limited = error.code == 429
                if error.code == 403:
                    snippet = error.read(2048).decode("utf-8", "replace").lower()
                    limited = "rate limit" in snippet
                error.close()  # the error's body is not needed past this point
                if limited:
                    if attempt < MAX_RETRIES:
                        self._sleep(2**attempt)
                        continue
                    break
                if optional and (error.code in (401, 403, 404) or error.code >= 500):
                    # Canvas answers 401 when a student may not see something; the login itself already worked.
                    # An optional piece that fails is left out, and the run goes on.
                    raise CanvasUnavailable("Canvas did not share this.") from None
                if error.code == 401:
                    if self._credential.kind == "cookie":
                        raise CanvasError(
                            "Canvas did not accept that cookie. It has most likely expired (Canvas logs you out after a "
                            "while), or it is from a different Canvas site. Open Canvas in your browser, make sure you are "
                            "logged in, copy a fresh canvas_session value and try again."
                        ) from None
                    raise CanvasError(
                        "Canvas did not accept that token. It may be wrong, expired or deleted. If you pasted a browser "
                        "cookie instead, run the tool again with --session-cookie."
                    ) from None
                if error.code == 403:
                    raise CanvasAccessDenied("Canvas said no to that request (403).") from None
                raise CanvasError(f"Canvas answered with an error (HTTP {error.code}).") from None
            except (urllib.error.URLError, TimeoutError, ConnectionError):
                if optional:  # an extra piece that cannot be reached is left out; the grades still matter more
                    raise CanvasUnavailable("Canvas did not answer this.") from None
                raise CanvasError("Could not reach Canvas. Check your internet connection and the address.") from None
        raise CanvasError("Canvas is asking this tool to slow down. Wait a few minutes and try again.")

    def get_all(self, path: str, params: Optional[Mapping[str, Any]] = None, optional: bool = False) -> List[Any]:
        query = urllib.parse.urlencode(params or {}, doseq=True)
        url = f"{self.base}{path}" + (f"?{query}" if query else "")
        items: List[Any] = []
        for _ in range(MAX_PAGES):
            data, next_url = self._get(url, optional)
            if isinstance(data, list):
                items.extend(data)
            else:
                items.append(data)
            if not next_url:
                return items
            url = next_url  # checked against the host inside _get
        raise CanvasError("Too many pages came back, so it was stopped.")


class CanvasAccessDenied(CanvasError):
    """One course said no. Other courses may still work."""


class CanvasUnavailable(CanvasError):
    """An optional piece (like a late policy) that Canvas does not show to students. The run goes on without it."""


# --------------------------------------------------------------------- fetch


def fetch_courses(client: CanvasClient, include_concluded: bool = False) -> List[Dict[str, Any]]:
    # Deliberately the plain request: the grades must work even if Canvas refuses any of the extras below.
    states = ["active"] + (["completed"] if include_concluded else [])
    include = ["total_scores", "term"]
    found: Dict[int, Dict[str, Any]] = {}
    for state in states:
        courses = client.get_all(
            "/api/v1/courses",
            {
                "enrollment_type": "student",
                "enrollment_state": state,
                "include[]": include,
                "per_page": 100,
            },
        )
        for course in courses:
            if isinstance(course, dict) and isinstance(course.get("id"), int) and course.get("name"):
                found[course["id"]] = course
    return list(found.values())


def fetch_assignments(client: CanvasClient, course_id: int) -> List[Dict[str, Any]]:
    items = client.get_all(
        f"/api/v1/courses/{int(course_id)}/assignments",
        {"include[]": ["submission"], "order_by": "due_at", "per_page": 100},
    )
    return [a for a in items if isinstance(a, dict) and isinstance(a.get("id"), int)]


def fetch_course_extras(client: CanvasClient, course_id: int) -> Dict[str, Any]:
    """The syllabus and module progress, from the single-course request. Optional."""
    items = client.get_all(
        f"/api/v1/courses/{int(course_id)}",
        {"include[]": ["syllabus_body", "course_progress"]},
        optional=True,
    )
    course = items[0] if items and isinstance(items[0], dict) else {}
    return {"syllabus_body": course.get("syllabus_body"), "course_progress": course.get("course_progress")}


def fetch_groups(client: CanvasClient, course_id: int) -> List[Dict[str, Any]]:
    """Assignment groups: their weights and drop rules. Optional."""
    items = client.get_all(f"/api/v1/courses/{int(course_id)}/assignment_groups", {"per_page": 100}, optional=True)
    return [g for g in items if isinstance(g, dict) and isinstance(g.get("id"), int)]


def fetch_grading_standard(client: CanvasClient, course_id: int, standard_id: int) -> Optional[Dict[str, Any]]:
    """The class's letter-grade scale. Optional: some schools do not show it to students."""
    items = client.get_all(f"/api/v1/courses/{int(course_id)}/grading_standards/{int(standard_id)}", optional=True)
    return items[0] if items and isinstance(items[0], dict) else None


def fetch_late_policy(client: CanvasClient, course_id: int) -> Optional[Dict[str, Any]]:
    """The class's automatic late and missing deductions. Optional."""
    items = client.get_all(f"/api/v1/courses/{int(course_id)}/late_policy", optional=True)
    if not items or not isinstance(items[0], dict):
        return None
    policy = items[0].get("late_policy", items[0])
    return policy if isinstance(policy, dict) else None


def fetch_announcements(client: CanvasClient, course_id: int, now: dt.datetime) -> List[Dict[str, Any]]:
    """Announcements from the last few weeks. Optional."""
    start = (now - dt.timedelta(days=ANNOUNCEMENT_DAYS)).date().isoformat()
    end = now.date().isoformat()
    items = client.get_all(
        "/api/v1/announcements",
        {"context_codes[]": [f"course_{int(course_id)}"], "start_date": start, "end_date": end, "per_page": 50},
        optional=True,
    )
    return [a for a in items if isinstance(a, dict) and isinstance(a.get("id"), int)]


# ----------------------------------------------------------------- normalize

_CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
_SPACES = re.compile(r"[ \t\u00a0]+")


class _TextOnly(html.parser.HTMLParser):
    """Keeps the words from Canvas HTML and drops everything else (scripts, styles, images, links' targets)."""

    BLOCKS = {"p", "div", "br", "li", "tr", "ul", "ol", "table", "section", "article", "blockquote", "pre",
              "h1", "h2", "h3", "h4", "h5", "h6", "hr"}
    SKIP = {"script", "style", "noscript", "iframe", "object", "embed", "svg", "template", "head"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: List[str] = []
        self.skipping = 0

    def handle_starttag(self, tag, attrs):  # noqa: D401
        if tag in self.SKIP:
            self.skipping += 1
        elif not self.skipping and tag in self.BLOCKS:
            self.parts.append("\n- " if tag == "li" else "\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self.skipping = max(0, self.skipping - 1)
        elif not self.skipping and tag in self.BLOCKS and tag != "li":  # the next item starts its own line
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skipping:
            self.parts.append(data)


def html_to_text(value: Any, limit: int) -> Optional[str]:
    """Plain text from Canvas HTML: no tags, no scripts, short lines, at most `limit` characters."""
    if not isinstance(value, str) or not value.strip():
        return None
    parser = _TextOnly()
    try:
        parser.feed(value)
        parser.close()
    except Exception:  # odd HTML: keep nothing rather than something broken
        return None
    lines: List[str] = []
    for line in _CONTROL.sub("", "".join(parser.parts)).splitlines():
        line = _SPACES.sub(" ", line).strip()
        if line or (lines and lines[-1]):
            lines.append(line)
    text = "\n".join(lines).strip()
    if not text:
        return None
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "\u2026"


def _int(value: Any) -> Optional[int]:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def same_host_url(value: Any, host: Optional[str]) -> Optional[str]:
    """A link back to Canvas, only if it is https on the same site. Anything else is dropped."""
    if not host or not isinstance(value, str) or len(value) > 500:
        return None
    parts = urllib.parse.urlsplit(value)
    if parts.scheme != "https" or (parts.hostname or "").lower() != host or parts.username or parts.password:
        return None
    return value


def _number(value: Any) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return round(float(value), 2)


def _text(value: Any, limit: int) -> Optional[str]:
    return value.strip()[:limit] if isinstance(value, str) and value.strip() else None


def normalize_assignment(raw: Mapping[str, Any], host: Optional[str] = None, extras: bool = True) -> Optional[Dict[str, Any]]:
    """Keeps only what the app needs. Returns None for items without a name."""
    name = _text(raw.get("name"), 200)
    if not name:
        return None
    submission = raw.get("submission") if isinstance(raw.get("submission"), dict) else {}
    excused = bool(submission.get("excused"))
    graded = submission.get("workflow_state") == "graded" and _number(submission.get("score")) is not None
    if excused:
        state = "excused"
    elif graded:
        state = "graded"
    elif submission.get("missing"):
        state = "missing"
    elif submission.get("workflow_state") in ("submitted", "pending_review"):
        state = "submitted"
    else:
        state = "unsubmitted"
    counts = not raw.get("omit_from_final_grade") and raw.get("grading_type") != "not_graded"
    item: Dict[str, Any] = {
        "canvasAssignmentId": raw["id"],
        "name": name,
        "dueAt": _text(raw.get("due_at"), 40),  # your own due date: Canvas applies any extension you were given
        "pointsPossible": _number(raw.get("points_possible")),
        "score": _number(submission.get("score")) if graded else None,
        "state": state,
        "countsInFinalGrade": bool(counts),
    }
    # Everything below is extra. Odd data in it must never cost the grades above.
    try:
        item.update(_assignment_details(raw, submission, host))
        if extras:
            item.update(_assignment_text(raw))
    except Exception:
        pass
    return item


def _assignment_details(raw: Mapping[str, Any], submission: Mapping[str, Any], host: Optional[str]) -> Dict[str, Any]:
    types = raw.get("submission_types")
    return {
        "groupId": _int(raw.get("assignment_group_id")),
        "lockAt": _text(raw.get("lock_at"), 40),
        "unlockAt": _text(raw.get("unlock_at"), 40),
        "htmlUrl": same_host_url(raw.get("html_url"), host),
        "gradingType": _text(raw.get("grading_type"), 20),
        "submissionTypes": [t[:40] for t in types if isinstance(t, str)][:10] if isinstance(types, list) else [],
        "allowedAttempts": _int(raw.get("allowed_attempts")),
        "attempt": _int(submission.get("attempt")),
        "missing": bool(submission.get("missing")),
        "late": bool(submission.get("late")),
        "latePolicyStatus": _text(submission.get("late_policy_status"), 20),
        "pointsDeducted": _number(submission.get("points_deducted")),
        "submittedAt": _text(submission.get("submitted_at"), 40),
        "redoRequest": bool(submission.get("redo_request")),
    }


def _assignment_text(raw: Mapping[str, Any]) -> Dict[str, Any]:
    rubric = []
    rows = raw.get("rubric")
    for row in (rows if isinstance(rows, list) else [])[:MAX_RUBRIC_ROWS]:
        if isinstance(row, dict) and _text(row.get("description"), 200):
            rubric.append(
                {
                    "description": _text(row.get("description"), 200),
                    "points": _number(row.get("points")),
                    "details": html_to_text(row.get("long_description"), 500),
                }
            )
    return {"description": html_to_text(raw.get("description"), MAX_DESCRIPTION), "rubric": rubric}


def normalize_group(raw: Mapping[str, Any]) -> Optional[Dict[str, Any]]:
    if not isinstance(raw.get("id"), int):
        return None
    rules = raw.get("rules") if isinstance(raw.get("rules"), dict) else {}
    never = [x for x in (rules.get("never_drop") or []) if isinstance(x, int) and not isinstance(x, bool)][:500]
    weight = _number(raw.get("group_weight"))
    return {
        "id": raw["id"],
        "name": _text(raw.get("name"), 120) or "Group",
        "weight": weight if weight is not None and 0 <= weight <= 1000 else 0,
        "dropLowest": max(0, min(100, _int(rules.get("drop_lowest")) or 0)),
        "dropHighest": max(0, min(100, _int(rules.get("drop_highest")) or 0)),
        "neverDrop": never,
    }


def normalize_scale(raw: Optional[Mapping[str, Any]]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    entries = []
    for row in (raw.get("grading_scheme") or [])[:MAX_SCALE_ROWS]:
        if not isinstance(row, dict):
            continue
        name, value = _text(row.get("name"), 20), _number(row.get("value"))
        if name and value is not None and value >= 0:
            percent = value * 100 if value <= 1 else value
            entries.append({"name": name, "minPercent": round(min(100.0, percent), 2)})
    return {"title": _text(raw.get("title"), 120), "entries": entries} if entries else None


def normalize_late_policy(raw: Optional[Mapping[str, Any]]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    return {
        "lateDeductionEnabled": bool(raw.get("late_submission_deduction_enabled")),
        "lateDeductionPercent": _number(raw.get("late_submission_deduction")),
        "lateInterval": _text(raw.get("late_submission_interval"), 10),
        "lateMinimumEnabled": bool(raw.get("late_submission_minimum_percent_enabled")),
        "lateMinimumPercent": _number(raw.get("late_submission_minimum_percent")),
        "missingDeductionEnabled": bool(raw.get("missing_submission_deduction_enabled")),
        "missingDeductionPercent": _number(raw.get("missing_submission_deduction")),
    }


def normalize_announcements(items: List[Mapping[str, Any]], course_id: int) -> List[Dict[str, Any]]:
    kept = []
    for a in items:
        if a.get("context_code") not in (None, f"course_{course_id}"):
            continue
        title = _text(a.get("title"), 200)
        if not title:
            continue
        kept.append(
            {
                "id": a["id"],
                "title": title,
                "postedAt": _text(a.get("posted_at"), 40),
                "text": html_to_text(a.get("message"), MAX_ANNOUNCEMENT_TEXT) or "",
            }
        )
    kept.sort(key=lambda x: x["postedAt"] or "", reverse=True)
    return kept[:MAX_ANNOUNCEMENTS]


def normalize_progress(raw: Any) -> Optional[Dict[str, int]]:
    if not isinstance(raw, dict):
        return None
    total, done = _int(raw.get("requirement_count")), _int(raw.get("requirement_completed_count"))
    if total is None or done is None or total <= 0:
        return None
    return {"completed": max(0, min(done, total)), "total": total}


def normalize_course(
    raw: Mapping[str, Any],
    assignments: List[Mapping[str, Any]],
    details: Optional[Mapping[str, Any]] = None,
    host: Optional[str] = None,
    extras: bool = True,
) -> Dict[str, Any]:
    details = details or {}
    enrollment: Mapping[str, Any] = {}
    for item in raw.get("enrollments") or []:
        if isinstance(item, dict) and item.get("type") in ("student", "StudentEnrollment"):
            enrollment = item
            break
    term = raw.get("term") if isinstance(raw.get("term"), dict) else {}
    cleaned = [a for a in (normalize_assignment(x, host, extras) for x in assignments) if a]
    problems = set(details.get("unavailable") or [])

    def safe(label: str, build: Callable[[], Any], default: Any) -> Any:
        """Odd data in one extra piece is left out and noted. It never stops the run or costs the grades."""
        try:
            return build()
        except Exception:
            problems.add(label)
            return default

    groups = safe(
        "groups", lambda: [g for g in (normalize_group(x) for x in (details.get("groups") or [])[:MAX_GROUPS]) if g], []
    )
    scale = safe("gradingStandard", lambda: normalize_scale(details.get("gradingStandard")), None)
    late_policy = safe("latePolicy", lambda: normalize_late_policy(details.get("latePolicy")), None)
    syllabus = details.get("syllabus") if isinstance(details.get("syllabus"), dict) else {}
    syllabus_text = safe("syllabus", lambda: html_to_text(syllabus.get("syllabus_body", raw.get("syllabus_body")), MAX_SYLLABUS), None)
    progress = safe("syllabus", lambda: normalize_progress(syllabus.get("course_progress", raw.get("course_progress"))), None)
    notes = safe("announcements", lambda: normalize_announcements(details.get("announcements") or [], raw["id"]), [])
    course: Dict[str, Any] = {
        "canvasCourseId": raw["id"],
        "name": _text(raw.get("name"), 120) or "Course",
        "courseCode": _text(raw.get("course_code"), 120),
        "term": _text(term.get("name"), 80),
        "currentScore": _number(enrollment.get("computed_current_score")),
        "currentGrade": _text(enrollment.get("computed_current_grade"), 10),
        "finalScore": _number(enrollment.get("computed_final_score")),
        "finalGrade": _text(enrollment.get("computed_final_grade"), 10),
        "weighted": bool(raw.get("apply_assignment_group_weights")),
        "hideFinalGrades": bool(raw.get("hide_final_grades")),
        "groups": groups,
        "gradingScale": scale,
        "latePolicy": late_policy,
        "unavailable": sorted(problems),
        "assignments": cleaned,
    }
    if extras:
        course["syllabusText"] = syllabus_text
        course["moduleProgress"] = progress
        course["announcements"] = notes
    return course


def build_export(
    courses: List[Mapping[str, Any]],
    assignments_by_course: Mapping[int, List[Mapping[str, Any]]],
    host: str,
    now: dt.datetime,
    details_by_course: Optional[Mapping[int, Mapping[str, Any]]] = None,
    extras: bool = True,
) -> Dict[str, Any]:
    details_by_course = details_by_course or {}
    return {
        "format": FORMAT_NAME,
        "formatVersion": FORMAT_VERSION,
        "fetchedAt": now.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": host,
        "courses": [
            normalize_course(c, assignments_by_course.get(c["id"], []), details_by_course.get(c["id"]), host, extras)
            for c in courses
        ],
    }


def fetch_course_details(client: CanvasClient, course: Mapping[str, Any], now: dt.datetime, extras: bool) -> Dict[str, Any]:
    """The optional pieces for one class. Each one Canvas will not share is noted and skipped."""
    details: Dict[str, Any] = {"unavailable": []}
    course_id = course["id"]

    def attempt(name: str, fetch: Callable[[], Any]) -> None:
        try:
            details[name] = fetch()
        except CanvasUnavailable:
            details["unavailable"].append(name)

    attempt("groups", lambda: fetch_groups(client, course_id))
    standard_id = _int(course.get("grading_standard_id"))
    if standard_id is not None:
        attempt("gradingStandard", lambda: fetch_grading_standard(client, course_id, standard_id))
    attempt("latePolicy", lambda: fetch_late_policy(client, course_id))
    if extras:
        attempt("syllabus", lambda: fetch_course_extras(client, course_id))
        attempt("announcements", lambda: fetch_announcements(client, course_id, now))
    return details


# -------------------------------------------------------------------- output


def inside_git_repo(path: Path) -> bool:
    start = path.expanduser().resolve().parent
    return any((folder / ".git").exists() for folder in [start, *start.parents])


def default_output_path(now: dt.datetime, home: Optional[Path] = None) -> Path:
    downloads = (home or Path.home()) / "Downloads"
    folder = downloads if downloads.is_dir() else Path.cwd()
    return folder / f"canvas-grades-{now:%Y-%m-%d-%H%M}.json"


def check_output_location(path: Path, allow_in_repo: bool = False) -> None:
    if inside_git_repo(Path(path)) and not allow_in_repo:
        raise CanvasError(
            "That folder is inside a git project, so the file will not be written (your grades could be committed "
            "by accident). Pick a folder outside the project, such as Downloads, with --out."
        )


def write_export(data: Mapping[str, Any], path: Path, allow_in_repo: bool = False) -> Path:
    target = Path(path).expanduser()
    check_output_location(target, allow_in_repo)
    try:
        descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)  # never overwrites
    except FileExistsError:
        raise CanvasError("A file with that name already exists, so it was not overwritten.") from None
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
    return target


def summary_lines(data: Mapping[str, Any]) -> List[str]:
    """What else was saved, in counts only. Never prints any grades or text."""
    courses = data["courses"]

    def count(test: Callable[[Mapping[str, Any]], bool]) -> int:
        return sum(1 for c in courses if test(c))

    lines = [
        f"  Weights for {count(lambda c: c['weighted'] and bool(c['groups']))} class(es), "
        f"letter scales for {count(lambda c: bool(c['gradingScale']))}, late policies for {count(lambda c: bool(c['latePolicy']))}.",
    ]
    if any("syllabusText" in c for c in courses):
        notes = sum(len(c.get("announcements") or []) for c in courses)
        lines.append(
            f"  Syllabus for {count(lambda c: bool(c.get('syllabusText')))} class(es), {notes} recent announcement(s), "
            f"instructions for {sum(1 for c in courses for a in c['assignments'] if a.get('description'))} assignment(s)."
        )
    hidden = sorted({part for c in courses for part in c["unavailable"]})
    if hidden:
        lines.append(f"  Not available (normal for many schools): {', '.join(hidden)}.")
    return lines


# ---------------------------------------------------------------------- main


def run(
    argv: Optional[List[str]] = None,
    env: Mapping[str, str] = os.environ,
    prompt: Callable[[str], str] = getpass.getpass,
    client_factory: Callable[[str, Credential], CanvasClient] = lambda base, cred: CanvasClient(base, cred),
    now: Optional[dt.datetime] = None,
    out=sys.stdout,
) -> int:
    parser = argparse.ArgumentParser(description="Save your Canvas grades to a file the ADHD1X app can import.")
    parser.add_argument("--base-url", default=env.get("CANVAS_BASE_URL", DEFAULT_BASE_URL), help="Canvas website address")
    parser.add_argument("--out", type=Path, help="Where to save the file (default: your Downloads folder)")
    parser.add_argument("--session-cookie", action="store_true", help="Use a canvas_session cookie instead of an access token")
    parser.add_argument("--include-concluded", action="store_true", help="Also include finished courses")
    parser.add_argument("--allow-output-in-repo", action="store_true", help="Allow saving inside a git project (not recommended)")
    parser.add_argument(
        "--grades-only",
        action="store_true",
        help="Only grades and how classes are graded: no syllabus, announcements, instructions or rubrics",
    )
    args = parser.parse_args(argv)

    def say(text: str) -> None:
        print(text, file=out)

    try:
        base = validate_base_url(args.base_url)
        moment = now or dt.datetime.now().astimezone()
        target = args.out or default_output_path(moment)
        # Check the destination BEFORE asking for any secret, so a bad folder never costs a login.
        check_output_location(Path(target), args.allow_output_in_repo)
        credential = read_credential(args.session_cookie, env, prompt)
        say(f"Talking only to {base}. Read-only. Your {credential.kind} stays in memory and is never saved.")
        say(f"  Got a {credential.kind} of {len(credential.value)} characters.")  # the length only, so a cut-off paste is easy to spot
        client = client_factory(base, credential)

        extras = not args.grades_only
        courses = fetch_courses(client, args.include_concluded)
        say(f"Found {len(courses)} course{'s' if len(courses) != 1 else ''}.")
        assignments_by_course: Dict[int, List[Mapping[str, Any]]] = {}
        details_by_course: Dict[int, Dict[str, Any]] = {}
        usable: List[Mapping[str, Any]] = []
        for position, course in enumerate(courses, start=1):
            say(f"  Reading class {position} of {len(courses)}...")
            try:
                assignments_by_course[course["id"]] = fetch_assignments(client, course["id"])
                usable.append(course)
            except CanvasAccessDenied:
                say(f"  Skipped {course.get('name', 'a course')}: Canvas would not show its assignments.")
                continue
            details_by_course[course["id"]] = fetch_course_details(client, course, moment, extras)

        data = build_export(usable, assignments_by_course, client.host, moment, details_by_course, extras)
        saved = write_export(data, Path(target), allow_in_repo=args.allow_output_in_repo)
        graded = sum(1 for c in data["courses"] for a in c["assignments"] if a["state"] == "graded")
        total = sum(len(c["assignments"]) for c in data["courses"])
        say(f"Saved {total} assignments ({graded} graded) from {len(data['courses'])} courses to:")
        say(f"  {saved}")
        for line in summary_lines(data):
            say(line)
        say("Next: in ADHD1X open Catch Up, then Bring in grades, and choose that file. Delete the file afterwards.")
        return 0
    except CanvasError as error:
        say(f"Stopped: {error}")
        return 1
    except KeyboardInterrupt:
        say("Cancelled.")
        return 130
    except Exception as error:  # never show the message: it could contain something private
        frames = traceback.extract_tb(error.__traceback__)
        where = f" in {frames[-1].name}, line {frames[-1].lineno}" if frames else ""  # where, never what
        say(f"Something unexpected went wrong ({type(error).__name__}{where}). Nothing was saved.")
        return 2


if __name__ == "__main__":
    raise SystemExit(run())
