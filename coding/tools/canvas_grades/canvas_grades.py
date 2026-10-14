#!/usr/bin/env python3
"""Fetch YOUR OWN grades from Canvas and write a file the ADHD1X app can import.

How it keeps your login safe
  * Only the Python standard library is used. Nothing to install, no extra code to trust.
  * Your token is typed into a hidden prompt (or read from an environment variable). It is never
    saved, never printed, and never put on the command line, where shell history could keep it.
  * It only sends requests to ONE website (https only) and refuses to follow a redirect or a
    "next page" link to any other site, so a bad link cannot collect your token.
  * It only reads (GET). It never changes anything in Canvas.
  * The output file has just the grade fields the app needs: no emails, no student IDs, no comments.
  * It refuses to save the file inside a git project folder, so grades cannot be committed by accident.

The website itself never sees your token. It only imports the file this tool writes.
"""
from __future__ import annotations

import argparse
import datetime as dt
import getpass
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Tuple

DEFAULT_BASE_URL = "https://canvas.chaffey.edu"
FORMAT_NAME = "ADHD1X-canvas-grades"
FORMAT_VERSION = 1
MAX_RESPONSE_BYTES = 20 * 1024 * 1024
MAX_PAGES = 200
TIMEOUT_SECONDS = 30
MAX_RETRIES = 3
USER_AGENT = "adhd1x-canvas-grades/1.0 (personal use, read-only)"


class CanvasError(Exception):
    """A problem we expect and can explain in plain words. Messages never contain secrets."""


# ---------------------------------------------------------------- credentials

_SECRET_CHARS = re.compile(r"^[A-Za-z0-9~._\-+/=%]{8,1024}$")


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


def _check_secret(candidate: str) -> str:
    if not _SECRET_CHARS.match(candidate):
        # Deliberately does not repeat what was typed.
        raise CanvasError(
            "That does not look like a valid token or cookie value. "
            "Copy only the value itself, with no spaces or line breaks."
        )
    return candidate


def clean_token(raw: str) -> str:
    value = raw.strip().strip("\"'")
    value = re.sub(r"^Bearer\s+", "", value, flags=re.IGNORECASE)
    return _check_secret(value)


def clean_cookie(raw: str) -> str:
    """Accepts the bare value, 'canvas_session=value', or a whole Cookie header. Keeps only canvas_session."""
    text = raw.strip().strip("\"'")
    match = re.search(r"(?:^|;\s*)canvas_session=([^;\s]+)", text)
    value = match.group(1) if match else text.split(";")[0].strip()
    return _check_secret(value)


def read_credential(
    use_cookie: bool,
    env: Mapping[str, str] = os.environ,
    prompt: Callable[[str], str] = getpass.getpass,
) -> Credential:
    if use_cookie:
        raw = env.get("CANVAS_SESSION_COOKIE") or prompt("Paste your canvas_session cookie value (hidden): ")
        return Credential("cookie", clean_cookie(raw))
    raw = env.get("CANVAS_ACCESS_TOKEN") or prompt("Paste your Canvas access token (hidden): ")
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

    def _get(self, url: str) -> Tuple[Any, Optional[str]]:
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
                if limited:
                    if attempt < MAX_RETRIES:
                        self._sleep(2**attempt)
                        continue
                    break
                if error.code == 401:
                    raise CanvasError(
                        "Canvas did not accept that login. The token may be wrong, expired or revoked "
                        "(or the cookie may have expired). Make a new one and try again."
                    ) from None
                if error.code == 403:
                    raise CanvasAccessDenied("Canvas said no to that request (403).") from None
                raise CanvasError(f"Canvas answered with an error (HTTP {error.code}).") from None
            except (urllib.error.URLError, TimeoutError, ConnectionError):
                raise CanvasError("Could not reach Canvas. Check your internet connection and the address.") from None
        raise CanvasError("Canvas is asking this tool to slow down. Wait a few minutes and try again.")

    def get_all(self, path: str, params: Optional[Mapping[str, Any]] = None) -> List[Any]:
        query = urllib.parse.urlencode(params or {}, doseq=True)
        url = f"{self.base}{path}" + (f"?{query}" if query else "")
        items: List[Any] = []
        for _ in range(MAX_PAGES):
            data, next_url = self._get(url)
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


# --------------------------------------------------------------------- fetch


def fetch_courses(client: CanvasClient, include_concluded: bool = False) -> List[Dict[str, Any]]:
    states = ["active"] + (["completed"] if include_concluded else [])
    found: Dict[int, Dict[str, Any]] = {}
    for state in states:
        courses = client.get_all(
            "/api/v1/courses",
            {
                "enrollment_type": "student",
                "enrollment_state": state,
                "include[]": ["total_scores", "term"],
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


# ----------------------------------------------------------------- normalize


def _number(value: Any) -> Optional[float]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return round(float(value), 2)


def _text(value: Any, limit: int) -> Optional[str]:
    return value.strip()[:limit] if isinstance(value, str) and value.strip() else None


def normalize_assignment(raw: Mapping[str, Any]) -> Optional[Dict[str, Any]]:
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
    return {
        "canvasAssignmentId": raw["id"],
        "name": name,
        "dueAt": _text(raw.get("due_at"), 40),
        "pointsPossible": _number(raw.get("points_possible")),
        "score": _number(submission.get("score")) if graded else None,
        "state": state,
        "countsInFinalGrade": bool(counts),
    }


def normalize_course(raw: Mapping[str, Any], assignments: List[Mapping[str, Any]]) -> Dict[str, Any]:
    enrollment: Mapping[str, Any] = {}
    for item in raw.get("enrollments") or []:
        if isinstance(item, dict) and item.get("type") in ("student", "StudentEnrollment"):
            enrollment = item
            break
    term = raw.get("term") if isinstance(raw.get("term"), dict) else {}
    cleaned = [a for a in (normalize_assignment(x) for x in assignments) if a]
    return {
        "canvasCourseId": raw["id"],
        "name": _text(raw.get("name"), 120) or "Course",
        "courseCode": _text(raw.get("course_code"), 120),
        "term": _text(term.get("name"), 80),
        "currentScore": _number(enrollment.get("computed_current_score")),
        "currentGrade": _text(enrollment.get("computed_current_grade"), 10),
        "assignments": cleaned,
    }


def build_export(
    courses: List[Mapping[str, Any]],
    assignments_by_course: Mapping[int, List[Mapping[str, Any]]],
    host: str,
    now: dt.datetime,
) -> Dict[str, Any]:
    return {
        "format": FORMAT_NAME,
        "formatVersion": FORMAT_VERSION,
        "fetchedAt": now.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": host,
        "courses": [normalize_course(c, assignments_by_course.get(c["id"], [])) for c in courses],
    }


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
        client = client_factory(base, credential)

        courses = fetch_courses(client, args.include_concluded)
        say(f"Found {len(courses)} course{'s' if len(courses) != 1 else ''}.")
        assignments_by_course: Dict[int, List[Mapping[str, Any]]] = {}
        usable: List[Mapping[str, Any]] = []
        for course in courses:
            try:
                assignments_by_course[course["id"]] = fetch_assignments(client, course["id"])
                usable.append(course)
            except CanvasAccessDenied:
                say(f"  Skipped {course.get('name', 'a course')}: Canvas would not show its assignments.")

        data = build_export(usable, assignments_by_course, client.host, moment)
        saved = write_export(data, Path(target), allow_in_repo=args.allow_output_in_repo)
        graded = sum(1 for c in data["courses"] for a in c["assignments"] if a["state"] == "graded")
        total = sum(len(c["assignments"]) for c in data["courses"])
        say(f"Saved {total} assignments ({graded} graded) from {len(data['courses'])} courses to:")
        say(f"  {saved}")
        say("Next: in ADHD1X open Catch Up, then Bring in grades, and choose that file. Delete the file afterwards.")
        return 0
    except CanvasError as error:
        say(f"Stopped: {error}")
        return 1
    except KeyboardInterrupt:
        say("Cancelled.")
        return 130
    except Exception as error:  # never show the message: it could contain something private
        say(f"Something unexpected went wrong ({type(error).__name__}). Nothing was saved.")
        return 2


if __name__ == "__main__":
    raise SystemExit(run())
