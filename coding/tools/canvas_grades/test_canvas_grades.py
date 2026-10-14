"""Tests for canvas_grades.py. They use a pretend Canvas: no network, no real login."""
import datetime as dt
import io
import json
import tempfile
import unittest
import urllib.error
import urllib.request
from pathlib import Path

import canvas_grades as cg

SECRET = "9999~SUPERSECRETTOKENVALUE1234567890abcdef"
NOW = dt.datetime(2026, 10, 14, 9, 30, tzinfo=dt.timezone.utc)
BASE = "https://canvas.example.edu"


class FakeResponse:
    def __init__(self, payload, link=None):
        self._body = json.dumps(payload).encode("utf-8")
        self.headers = {"Link": link} if link else {}

    def read(self, n=-1):
        return self._body if n < 0 else self._body[:n]

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeOpener:
    """Maps a URL to a response (or an exception) and records every request it was given."""

    def __init__(self, routes, default=None):
        self.routes = routes
        self.default = default
        self.requests = []

    def open(self, request, timeout=None):
        self.requests.append(request)
        if request.full_url not in self.routes and self.default is not None:
            return self.default()
        result = self.routes[request.full_url]
        if isinstance(result, list):  # a sequence of results, one per call
            result = result.pop(0)
        if isinstance(result, Exception):
            raise result
        return result


def http_error(code, body=b""):
    return urllib.error.HTTPError(BASE, code, "x", {}, io.BytesIO(body))


def client_with(routes, credential=None, sleeps=None, default=None):
    cred = credential or cg.Credential("token", SECRET)
    opener = FakeOpener(routes, default)
    sleep = (lambda s: sleeps.append(s)) if sleeps is not None else (lambda s: None)
    return cg.CanvasClient(BASE, cred, opener=opener, sleep=sleep), opener


class CredentialTests(unittest.TestCase):
    def test_token_is_cleaned_and_bearer_prefix_removed(self):
        self.assertEqual(cg.clean_token('  "Bearer 1234~abcdefgh"  '), "1234~abcdefgh")

    def test_rejects_values_with_spaces_or_line_breaks_without_echoing_them(self):
        for bad in ["short", "has space inside1234", "line\nbreak12345678", "a" * 2000, ""]:
            with self.assertRaises(cg.CanvasError) as ctx:
                cg.clean_token(bad)
            self.assertNotIn(bad.strip() or "zzz", str(ctx.exception) if bad.strip() else "")

    def test_cookie_keeps_only_canvas_session_from_a_whole_header(self):
        header = "_csrf_token=AAAA1111; canvas_session=abc123XYZ-_~.value; log_session_id=zzzz9999"
        self.assertEqual(cg.clean_cookie(header), "abc123XYZ-_~.value")
        self.assertEqual(cg.clean_cookie("canvas_session=abc123XYZ-_~.value"), "abc123XYZ-_~.value")

    def test_secret_never_appears_when_the_credential_is_printed(self):
        cred = cg.Credential("token", SECRET)
        self.assertNotIn(SECRET, repr(cred))
        self.assertNotIn(SECRET, str(cred))
        self.assertNotIn(SECRET, f"{cred}")

    def test_reads_from_environment_first_then_prompts(self):
        env = {"CANVAS_ACCESS_TOKEN": SECRET}
        self.assertEqual(cg.read_credential(False, env, prompt=lambda _: self.fail("should not prompt")).value, SECRET)
        asked = []
        cred = cg.read_credential(False, {}, prompt=lambda text: asked.append(text) or SECRET)
        self.assertEqual(cred.value, SECRET)
        self.assertEqual(len(asked), 1)

    def test_headers_match_the_kind(self):
        self.assertEqual(cg.Credential("token", "abc12345").headers(), {"Authorization": "Bearer abc12345"})
        self.assertEqual(cg.Credential("cookie", "abc12345").headers(), {"Cookie": "canvas_session=abc12345"})


class PastedCookieTests(unittest.TestCase):
    VALUE = "abc123XYZ-_~.value=="

    def test_every_way_a_browser_shows_the_cookie_gives_the_same_value(self):
        for raw in [
            self.VALUE,
            f"canvas_session={self.VALUE}",
            f'"{self.VALUE}"',
            f"  {self.VALUE}  \n",
            f"_csrf_token=AAAA1111; canvas_session={self.VALUE}; log_session_id=zzzz9999",
            f"canvas_session\t{self.VALUE}\tcanvas.chaffey.edu\t/\t2026-12-01T00:00:00.000Z\t200\t✓",  # the row from the cookie table
            f"\x1b[200~{self.VALUE}\x1b[201~",  # a terminal's "bracketed paste" markers
        ]:
            self.assertEqual(cg.clean_cookie(raw), self.VALUE, repr(raw))

    def test_a_real_cookie_may_use_more_characters_than_a_token(self):
        self.assertEqual(cg.clean_cookie("abc123:XYZ*value!"), "abc123:XYZ*value!")
        with self.assertRaises(cg.CanvasError):
            cg.clean_token("abc123:XYZ*value!")  # tokens stay strict

    def test_the_message_says_what_is_wrong_without_repeating_what_was_pasted(self):
        secret_part = "ZZtopSecretPiece"
        cases = {
            "nothing came through": "",
            "only 3 characters": "abc",
            "a space": f"{secret_part}1 {secret_part}2",
            "a tab": f"{secret_part}\t{secret_part}",
            "ellipsis": f"{secret_part}\u2026{secret_part}",
        }
        for expected, raw in cases.items():
            with self.assertRaises(cg.CanvasError) as ctx:
                cg.clean_cookie(raw)
            text = str(ctx.exception)
            self.assertIn(expected, text, raw)
            self.assertNotIn(secret_part, text)

    def test_a_cookie_pasted_without_the_cookie_option_says_to_use_it(self):
        with self.assertRaises(cg.CanvasError) as ctx:
            cg.read_credential(False, {}, prompt=lambda _: f"canvas_session={self.VALUE}")
        self.assertIn("--session-cookie", str(ctx.exception))
        self.assertNotIn(self.VALUE, str(ctx.exception))

    def test_a_rejected_login_says_what_to_do_for_each_kind(self):
        for kind, expect in (("cookie", "fresh canvas_session"), ("token", "--session-cookie")):
            client, _ = client_with({f"{BASE}/api/v1/courses": http_error(401)}, credential=cg.Credential(kind, "abc12345xyz"))
            with self.assertRaises(cg.CanvasError) as ctx:
                client.get_all("/api/v1/courses")
            self.assertIn("did not accept", str(ctx.exception))
            self.assertIn(expect, str(ctx.exception))

    def test_the_run_says_how_long_the_pasted_value_was_and_never_the_value(self):
        client, _ = client_with(
            {
                f"{BASE}/api/v1/courses?enrollment_type=student&enrollment_state=active&include%5B%5D=total_scores&include%5B%5D=term&per_page=100": FakeResponse([]),
            }
        )
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as tmp:
            code = cg.run(["--base-url", BASE, "--out", str(Path(tmp) / "g.json"), "--session-cookie"], env={},
                          prompt=lambda _: f"canvas_session={self.VALUE}", client_factory=lambda b, c: client, now=NOW, out=output)
        self.assertEqual(code, 0, output.getvalue())
        self.assertIn(f"Got a cookie of {len(self.VALUE)} characters.", output.getvalue())
        self.assertNotIn(self.VALUE, output.getvalue())

    def test_a_bad_paste_stops_before_any_request_to_canvas(self):
        output = io.StringIO()
        code = cg.run(["--base-url", BASE, "--session-cookie"], env={}, prompt=lambda _: "a b",
                      client_factory=lambda b, c: self.fail("should not connect"), now=NOW, out=output)
        self.assertEqual(code, 1)
        self.assertIn("Why: it is only", output.getvalue())


class AddressTests(unittest.TestCase):
    def test_only_plain_https_site_addresses_are_accepted(self):
        self.assertEqual(cg.validate_base_url("https://Canvas.Chaffey.edu/"), "https://canvas.chaffey.edu")
        for bad in [
            "http://canvas.chaffey.edu",
            "https://user:pw@canvas.chaffey.edu",
            "https://canvas.chaffey.edu:8443",
            "https://canvas.chaffey.edu/api/v1",
            "https://canvas.chaffey.edu?x=1",
            "ftp://canvas.chaffey.edu",
            "canvas.chaffey.edu",
        ]:
            with self.assertRaises(cg.CanvasError, msg=bad):
                cg.validate_base_url(bad)


class SafetyOfRequestsTests(unittest.TestCase):
    def test_sends_only_get_requests_with_the_login_to_the_one_host(self):
        client, opener = client_with({f"{BASE}/api/v1/courses?per_page=100": FakeResponse([{"id": 1}])})
        client.get_all("/api/v1/courses", {"per_page": 100})
        self.assertEqual(len(opener.requests), 1)
        request = opener.requests[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertIsNone(request.data)
        self.assertEqual(request.get_header("Authorization"), f"Bearer {SECRET}")
        self.assertTrue(request.full_url.startswith(BASE + "/"))

    def test_follows_next_page_links_on_the_same_host(self):
        page2 = f"{BASE}/api/v1/courses?page=2"
        client, opener = client_with(
            {
                f"{BASE}/api/v1/courses": FakeResponse([{"id": 1}], link=f'<{page2}>; rel="next", <{BASE}/x>; rel="last"'),
                page2: FakeResponse([{"id": 2}]),
            }
        )
        self.assertEqual([c["id"] for c in client.get_all("/api/v1/courses")], [1, 2])

    def test_refuses_a_next_link_to_another_site_and_never_sends_the_login_there(self):
        evil = "https://evil.example.com/steal"
        client, opener = client_with(
            {f"{BASE}/api/v1/courses": FakeResponse([{"id": 1}], link=f'<{evil}>; rel="next"')}
        )
        with self.assertRaises(cg.CanvasError) as ctx:
            client.get_all("/api/v1/courses")
        self.assertEqual(len(opener.requests), 1)  # the second request was never made
        self.assertNotIn(SECRET, str(ctx.exception))

    def test_refuses_http_next_links_even_on_the_same_host(self):
        client, opener = client_with(
            {f"{BASE}/api/v1/courses": FakeResponse([], link='<http://canvas.example.edu/api/v1/courses?page=2>; rel="next"')}
        )
        with self.assertRaises(cg.CanvasError):
            client.get_all("/api/v1/courses")
        self.assertEqual(len(opener.requests), 1)

    def test_redirect_to_another_host_is_blocked(self):
        handler = cg.SameHostRedirectHandler("canvas.example.edu")
        request = urllib.request.Request(f"{BASE}/a", headers={"Authorization": f"Bearer {SECRET}"})
        with self.assertRaises(cg.CanvasError):
            handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example.com/b")
        with self.assertRaises(cg.CanvasError):
            handler.redirect_request(request, None, 302, "Found", {}, "http://canvas.example.edu/b")
        # Same host over https is fine.
        self.assertIsNotNone(handler.redirect_request(request, None, 302, "Found", {}, f"{BASE}/b"))

    def test_error_messages_never_contain_the_login(self):
        for code in (401, 403, 500):
            client, _ = client_with({f"{BASE}/api/v1/courses": http_error(code)})
            with self.assertRaises(cg.CanvasError) as ctx:
                client.get_all("/api/v1/courses")
            self.assertNotIn(SECRET, str(ctx.exception))

    def test_a_401_says_the_login_was_not_accepted(self):
        client, _ = client_with({f"{BASE}/api/v1/courses": http_error(401)})
        with self.assertRaises(cg.CanvasError) as ctx:
            client.get_all("/api/v1/courses")
        self.assertIn("did not accept", str(ctx.exception))

    def test_backs_off_when_rate_limited_then_succeeds(self):
        sleeps = []
        client, opener = client_with(
            {f"{BASE}/api/v1/courses": [http_error(429), http_error(403, b"403 Forbidden (Rate Limit Exceeded)"), FakeResponse([{"id": 1}])]},
            sleeps=sleeps,
        )
        self.assertEqual(client.get_all("/api/v1/courses"), [{"id": 1}])
        self.assertEqual(sleeps, [1, 2])
        self.assertEqual(len(opener.requests), 3)

    def test_gives_up_politely_if_always_rate_limited(self):
        client, _ = client_with({f"{BASE}/api/v1/courses": [http_error(429)] * 10})
        with self.assertRaises(cg.CanvasError) as ctx:
            client.get_all("/api/v1/courses")
        self.assertIn("slow down", str(ctx.exception))

    def test_a_plain_403_is_reported_as_access_denied_for_that_request_only(self):
        client, _ = client_with({f"{BASE}/api/v1/courses/5/assignments?include%5B%5D=submission&order_by=due_at&per_page=100": http_error(403, b"nope")})
        with self.assertRaises(cg.CanvasAccessDenied):
            cg.fetch_assignments(client, 5)

    def test_cookie_login_sends_only_the_session_cookie(self):
        cred = cg.Credential("cookie", "abc12345")
        client, opener = client_with({f"{BASE}/api/v1/courses": FakeResponse([])}, credential=cred)
        client.get_all("/api/v1/courses")
        request = opener.requests[0]
        self.assertEqual(request.get_header("Cookie"), "canvas_session=abc12345")
        self.assertIsNone(request.get_header("Authorization"))


RAW_COURSE = {
    "id": 11,
    "name": "Introduction to Computer Science",
    "course_code": "CIS-101-4827",
    "term": {"name": "Fall 2026", "id": 3},
    "enrollments": [
        {"type": "student", "computed_current_score": 91.234, "computed_current_grade": "A-", "user_id": 123456, "email": "me@example.edu"}
    ],
}
RAW_ASSIGNMENTS = [
    {"id": 1, "name": "Quiz 1", "due_at": "2026-10-05T06:59:00Z", "points_possible": 20, "grading_type": "points",
     "submission": {"score": 18, "workflow_state": "graded", "excused": False, "user_id": 123456, "submission_comments": [{"comment": "private"}]}},
    {"id": 2, "name": "Lab 2", "due_at": "2026-10-20T06:59:00Z", "points_possible": 50, "submission": {"score": None, "workflow_state": "unsubmitted"}},
    {"id": 3, "name": "Excused thing", "due_at": None, "points_possible": 10, "submission": {"excused": True, "score": None, "workflow_state": "graded"}},
    {"id": 4, "name": "Participation", "points_possible": 5, "omit_from_final_grade": True, "submission": {"score": 5, "workflow_state": "graded"}},
    {"id": 5, "name": "Missed", "points_possible": 10, "submission": {"score": 0, "workflow_state": "unsubmitted", "missing": True}},
    {"id": 6, "name": "Hidden grade", "points_possible": 10, "submission": {"score": 9, "workflow_state": "submitted"}},
    {"id": 7, "name": "   ", "points_possible": 10},
    {"id": 8, "name": "No submission object", "points_possible": 10},
]


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.data = cg.build_export([RAW_COURSE], {11: RAW_ASSIGNMENTS}, "canvas.example.edu", NOW)
        self.course = self.data["courses"][0]
        self.by_id = {a["canvasAssignmentId"]: a for a in self.course["assignments"]}

    def test_course_fields(self):
        self.assertEqual(self.data["format"], cg.FORMAT_NAME)
        self.assertEqual(self.data["formatVersion"], 2)
        self.assertEqual(self.data["fetchedAt"], "2026-10-14T09:30:00Z")
        self.assertEqual(self.data["source"], "canvas.example.edu")
        self.assertEqual(self.course["currentScore"], 91.23)
        self.assertEqual(self.course["currentGrade"], "A-")
        self.assertEqual(self.course["courseCode"], "CIS-101-4827")
        self.assertEqual(self.course["term"], "Fall 2026")

    def test_graded_score_is_kept_and_ungraded_is_not(self):
        self.assertEqual(self.by_id[1]["score"], 18)
        self.assertEqual(self.by_id[1]["state"], "graded")
        self.assertIsNone(self.by_id[2]["score"])
        self.assertEqual(self.by_id[2]["state"], "unsubmitted")
        self.assertEqual(self.by_id[2]["pointsPossible"], 50)

    def test_states_for_excused_missing_submitted(self):
        self.assertEqual(self.by_id[3]["state"], "excused")
        self.assertIsNone(self.by_id[3]["score"])
        self.assertEqual(self.by_id[5]["state"], "missing")
        self.assertIsNone(self.by_id[5]["score"])  # a "missing" 0 is not a graded score
        self.assertEqual(self.by_id[6]["state"], "submitted")
        self.assertIsNone(self.by_id[6]["score"])  # not posted yet

    def test_items_not_counted_in_the_final_grade_are_flagged(self):
        self.assertFalse(self.by_id[4]["countsInFinalGrade"])
        self.assertTrue(self.by_id[1]["countsInFinalGrade"])

    def test_nameless_items_are_dropped_and_missing_submission_is_fine(self):
        self.assertNotIn(7, self.by_id)
        self.assertEqual(self.by_id[8]["state"], "unsubmitted")

    def test_nothing_private_leaks_into_the_file(self):
        text = json.dumps(self.data)
        for private in ["me@example.edu", "123456", "private", "user_id", "submission_comments", "email"]:
            self.assertNotIn(private, text)

    def test_bad_numbers_become_none(self):
        raw = {"id": 9, "name": "Odd", "points_possible": "ten", "submission": {"score": True, "workflow_state": "graded"}}
        item = cg.normalize_assignment(raw)
        self.assertIsNone(item["pointsPossible"])
        self.assertIsNone(item["score"])


class FetchTests(unittest.TestCase):
    def test_fetches_courses_then_each_courses_assignments(self):
        courses_url = (
            f"{BASE}/api/v1/courses?enrollment_type=student&enrollment_state=active"
            "&include%5B%5D=total_scores&include%5B%5D=term&per_page=100"
        )
        assignments_url = f"{BASE}/api/v1/courses/11/assignments?include%5B%5D=submission&order_by=due_at&per_page=100"
        client, opener = client_with(
            {
                courses_url: FakeResponse([RAW_COURSE, {"id": 12, "access_restricted_by_date": True}]),
                assignments_url: FakeResponse(RAW_ASSIGNMENTS),
            }
        )
        courses = cg.fetch_courses(client)
        self.assertEqual([c["id"] for c in courses], [11])  # the restricted one has no name and is skipped
        assignments = cg.fetch_assignments(client, 11)
        self.assertEqual(len(assignments), len(RAW_ASSIGNMENTS))
        self.assertTrue(all(r.get_method() == "GET" for r in opener.requests))


class OutputTests(unittest.TestCase):
    def test_refuses_to_write_inside_a_git_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / ".git").mkdir()
            target = Path(tmp) / "sub" / "grades.json"
            target.parent.mkdir()
            with self.assertRaises(cg.CanvasError):
                cg.write_export({"a": 1}, target)
            self.assertFalse(target.exists())

    def test_can_be_overridden_on_purpose(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / ".git").mkdir()
            target = Path(tmp) / "grades.json"
            cg.write_export({"a": 1}, target, allow_in_repo=True)
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"a": 1})

    def test_never_overwrites_an_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "grades.json"
            target.write_text("keep me", encoding="utf-8")
            with self.assertRaises(cg.CanvasError):
                cg.write_export({"a": 1}, target)
            self.assertEqual(target.read_text(encoding="utf-8"), "keep me")

    def test_default_path_is_in_downloads_when_there_is_one(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "Downloads").mkdir()
            path = cg.default_output_path(NOW, home=Path(tmp))
            self.assertEqual(path.parent, Path(tmp) / "Downloads")
            self.assertTrue(path.name.startswith("canvas-grades-2026-10-14"))


class WholeRunTests(unittest.TestCase):
    def make_client(self):
        courses_url = (
            f"{BASE}/api/v1/courses?enrollment_type=student&enrollment_state=active"
            "&include%5B%5D=total_scores&include%5B%5D=term&per_page=100"
        )
        assignments_url = f"{BASE}/api/v1/courses/11/assignments?include%5B%5D=submission&order_by=due_at&per_page=100"
        client, self.opener = client_with(
            {courses_url: FakeResponse([RAW_COURSE]), assignments_url: FakeResponse(RAW_ASSIGNMENTS)},
            default=lambda: (_ for _ in ()).throw(http_error(404)),
        )
        return client

    def test_full_run_writes_the_file_and_never_prints_the_login(self):
        with tempfile.TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "grades.json"
            output = io.StringIO()
            code = cg.run(
                ["--base-url", BASE, "--out", str(out_path)],
                env={},
                prompt=lambda _: SECRET,
                client_factory=lambda base, cred: self.make_client(),
                now=NOW,
                out=output,
            )
            self.assertEqual(code, 0, output.getvalue())
            self.assertNotIn(SECRET, output.getvalue())
            data = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(data["courses"][0]["name"], "Introduction to Computer Science")
            self.assertNotIn(SECRET, out_path.read_text(encoding="utf-8"))
            self.assertIn("Delete the file", output.getvalue())

    def test_a_bad_folder_is_reported_before_asking_for_a_login(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / ".git").mkdir()
            output = io.StringIO()
            code = cg.run(
                ["--base-url", BASE, "--out", str(Path(tmp) / "g.json")],
                env={},
                prompt=lambda _: self.fail("should not ask for a login"),
                client_factory=lambda base, cred: self.fail("should not connect"),
                now=NOW,
                out=output,
            )
            self.assertEqual(code, 1)
            self.assertIn("git project", output.getvalue())

    def test_unexpected_errors_do_not_print_their_message(self):
        output = io.StringIO()

        def boom(base, cred):
            raise RuntimeError(f"secret detail {SECRET}")

        with tempfile.TemporaryDirectory() as tmp:
            code = cg.run(["--base-url", BASE, "--out", str(Path(tmp) / "g.json")], env={}, prompt=lambda _: SECRET,
                          client_factory=boom, now=NOW, out=output)
        self.assertEqual(code, 2)
        self.assertNotIn(SECRET, output.getvalue())
        self.assertIn("RuntimeError", output.getvalue())

    def test_a_course_that_says_no_is_skipped_and_the_rest_continue(self):
        courses_url = (
            f"{BASE}/api/v1/courses?enrollment_type=student&enrollment_state=active"
            "&include%5B%5D=total_scores&include%5B%5D=term&per_page=100"
        )
        other = dict(RAW_COURSE, id=12, name="Locked course")
        client, _ = client_with(
            {
                courses_url: FakeResponse([RAW_COURSE, other]),
                f"{BASE}/api/v1/courses/11/assignments?include%5B%5D=submission&order_by=due_at&per_page=100": FakeResponse(RAW_ASSIGNMENTS),
                f"{BASE}/api/v1/courses/12/assignments?include%5B%5D=submission&order_by=due_at&per_page=100": http_error(403, b"nope"),
            },
            default=lambda: (_ for _ in ()).throw(http_error(404)),
        )
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "g.json"
            code = cg.run(["--base-url", BASE, "--out", str(out_path)], env={}, prompt=lambda _: SECRET,
                          client_factory=lambda b, c: client, now=NOW, out=output)
            data = json.loads(out_path.read_text(encoding="utf-8"))
        self.assertEqual(code, 0)
        self.assertEqual([c["name"] for c in data["courses"]], ["Introduction to Computer Science"])
        self.assertIn("Skipped Locked course", output.getvalue())


RICH_COURSE = dict(
    RAW_COURSE,
    apply_assignment_group_weights=True,
    hide_final_grades=False,
    grading_standard_id=77,
)
RICH_EXTRAS = {
    "syllabus_body": "<h1>Syllabus</h1><p>Late work: 10% off.</p><script>steal()</script>",
    "course_progress": {"requirement_count": 30, "requirement_completed_count": 12, "next_requirement_url": "https://x"},
}
RICH_COURSE["enrollments"] = [dict(RAW_COURSE["enrollments"][0], computed_final_score=40.5, computed_final_grade="F")]
RICH_ASSIGNMENT = {
    "id": 21, "name": "Lab 3", "due_at": "2026-10-20T06:59:00Z", "lock_at": "2026-10-27T06:59:00Z", "points_possible": 30,
    "assignment_group_id": 501, "html_url": f"{BASE}/courses/11/assignments/21", "grading_type": "points",
    "submission_types": ["online_upload"], "allowed_attempts": 2,
    "description": "<p>Write <b>two</b> pages.</p><img src=x onerror=alert(1)>",
    "rubric": [{"id": "r1", "points": 10, "description": "Clarity", "long_description": "<p>Clear writing</p>"}] * 40,
    "submission": {"score": None, "workflow_state": "unsubmitted", "missing": True, "late": False,
                   "late_policy_status": "missing", "points_deducted": None, "submitted_at": None, "attempt": None,
                   "redo_request": False, "user_id": 123456, "submission_comments": [{"comment": "private"}]},
}
RAW_GROUPS = [
    {"id": 501, "name": "Labs", "group_weight": 40, "rules": {"drop_lowest": 1, "never_drop": [21]}},
    {"id": 502, "name": "Exams", "group_weight": 60, "rules": None},
    {"id": "bad"},
]
RAW_STANDARD = {"title": "College scale", "grading_scheme": [{"name": "A", "value": 0.9}, {"name": "C", "value": 0.7}, {"name": "F", "value": 0}]}
RAW_LATE = {"late_policy": {"late_submission_deduction_enabled": True, "late_submission_deduction": 10, "late_submission_interval": "day",
                            "late_submission_minimum_percent_enabled": True, "late_submission_minimum_percent": 50,
                            "missing_submission_deduction_enabled": False, "missing_submission_deduction": 100}}
RAW_ANNOUNCEMENTS = [
    {"id": 1, "title": "Lab 3 moved", "posted_at": "2026-10-10T10:00:00Z", "context_code": "course_11",
     "message": "<p>Lab 3 is now due Friday.</p>", "author": {"display_name": "Professor Private"}, "user_name": "Professor Private"},
    {"id": 2, "title": "Old news", "posted_at": "2026-10-01T10:00:00Z", "context_code": "course_11", "message": "<p>Hi</p>"},
    {"id": 3, "title": "Other class", "posted_at": "2026-10-11T10:00:00Z", "context_code": "course_99", "message": "x"},
]


def rich_routes():
    return {
        f"{BASE}/api/v1/courses?enrollment_type=student&enrollment_state=active"
        "&include%5B%5D=total_scores&include%5B%5D=term&per_page=100":
            FakeResponse([RICH_COURSE]),
        f"{BASE}/api/v1/courses/11/assignments?include%5B%5D=submission&order_by=due_at&per_page=100": FakeResponse([RICH_ASSIGNMENT]),
        f"{BASE}/api/v1/courses/11?include%5B%5D=syllabus_body&include%5B%5D=course_progress": FakeResponse(RICH_EXTRAS),
        f"{BASE}/api/v1/courses/11/assignment_groups?per_page=100": FakeResponse(RAW_GROUPS),
        f"{BASE}/api/v1/courses/11/grading_standards/77": FakeResponse(RAW_STANDARD),
        f"{BASE}/api/v1/courses/11/late_policy": FakeResponse(RAW_LATE),
        f"{BASE}/api/v1/announcements?context_codes%5B%5D=course_11&start_date=2026-09-14&end_date=2026-10-14&per_page=50":
            FakeResponse(RAW_ANNOUNCEMENTS),
    }


class PlainTextTests(unittest.TestCase):
    def test_keeps_words_and_drops_tags_scripts_and_styles(self):
        text = cg.html_to_text("<p>Hello&nbsp;<b>world</b></p><script>alert(1)</script><style>p{}</style>"
                               "<ul><li>One</li><li>Two &amp; three</li></ul>", 500)
        self.assertEqual(text, "Hello world\n\n- One\n- Two & three")
        self.assertNotIn("alert", text)
        self.assertNotIn("<", text)

    def test_images_and_links_leave_only_their_words(self):
        self.assertEqual(cg.html_to_text('<img src=x onerror=alert(1)><a href="javascript:alert(1)">link</a>', 100), "link")

    def test_cuts_long_text_with_a_mark_and_removes_control_characters(self):
        text = cg.html_to_text("<p>" + "a\x00b" * 100 + "</p>", 20)
        self.assertEqual(len(text), 20)
        self.assertTrue(text.endswith("\u2026"))
        self.assertNotIn("\x00", text)

    def test_nothing_useful_gives_none(self):
        for value in [None, "", "   ", "<p> </p>", 42, "<script>x</script>"]:
            self.assertIsNone(cg.html_to_text(value, 100), value)

    def test_links_back_to_canvas_only_if_https_on_the_same_site(self):
        host = "canvas.example.edu"
        self.assertEqual(cg.same_host_url(f"{BASE}/courses/1/assignments/2", host), f"{BASE}/courses/1/assignments/2")
        for bad in ["javascript:alert(1)", "http://canvas.example.edu/x", "https://evil.example.com/x",
                    "https://user:pw@canvas.example.edu/x", 5, None, f"{BASE}/" + "a" * 600]:
            self.assertIsNone(cg.same_host_url(bad, host), bad)


class RicherDetailsTests(unittest.TestCase):
    def setUp(self):
        client, self.opener = client_with(rich_routes())
        course = cg.fetch_courses(client)[0]
        details = cg.fetch_course_details(client, course, NOW, extras=True)
        assignments = cg.fetch_assignments(client, 11)
        self.data = cg.build_export([course], {11: assignments}, "canvas.example.edu", NOW, {11: details})
        self.course = self.data["courses"][0]
        self.item = self.course["assignments"][0]

    def test_only_get_requests_to_the_one_host(self):
        self.assertTrue(all(r.get_method() == "GET" and r.data is None for r in self.opener.requests))
        self.assertTrue(all(r.full_url.startswith(BASE + "/") for r in self.opener.requests))

    def test_how_the_class_is_graded(self):
        self.assertTrue(self.course["weighted"])
        self.assertEqual(self.course["finalScore"], 40.5)
        self.assertEqual(self.course["finalGrade"], "F")
        self.assertEqual(
            self.course["groups"],
            [
                {"id": 501, "name": "Labs", "weight": 40, "dropLowest": 1, "dropHighest": 0, "neverDrop": [21]},
                {"id": 502, "name": "Exams", "weight": 60, "dropLowest": 0, "dropHighest": 0, "neverDrop": []},
            ],
        )
        self.assertEqual(self.course["gradingScale"]["entries"][1], {"name": "C", "minPercent": 70.0})
        self.assertEqual(self.course["latePolicy"]["lateDeductionPercent"], 10)
        self.assertEqual(self.course["latePolicy"]["lateInterval"], "day")
        self.assertEqual(self.course["moduleProgress"], {"completed": 12, "total": 30})
        self.assertEqual(self.course["unavailable"], [])

    def test_assignment_details_and_flags(self):
        item = self.item
        self.assertEqual(item["groupId"], 501)
        self.assertEqual(item["lockAt"], "2026-10-27T06:59:00Z")
        self.assertEqual(item["htmlUrl"], f"{BASE}/courses/11/assignments/21")
        self.assertTrue(item["missing"])
        self.assertEqual(item["latePolicyStatus"], "missing")
        self.assertEqual(item["allowedAttempts"], 2)
        self.assertEqual(item["description"], "Write two pages.")
        self.assertEqual(len(item["rubric"]), cg.MAX_RUBRIC_ROWS)
        self.assertEqual(item["rubric"][0], {"description": "Clarity", "points": 10, "details": "Clear writing"})

    def test_syllabus_and_announcements_are_plain_text_from_this_class_only(self):
        self.assertEqual(self.course["syllabusText"], "Syllabus\n\nLate work: 10% off.")
        self.assertEqual([a["title"] for a in self.course["announcements"]], ["Lab 3 moved", "Old news"])
        self.assertEqual(self.course["announcements"][0]["text"], "Lab 3 is now due Friday.")

    def test_no_people_comments_or_ids_leak_into_the_file(self):
        text = json.dumps(self.data)
        for private in ["Professor Private", "author", "user_name", "private", "user_id", "123456", "me@example.edu",
                        "submission_comments", "onerror", "steal()", "next_requirement_url"]:
            self.assertNotIn(private, text)


class OptionalPiecesTests(unittest.TestCase):
    def test_pieces_canvas_will_not_share_are_noted_and_the_rest_is_kept(self):
        routes = rich_routes()
        routes[f"{BASE}/api/v1/courses/11/grading_standards/77"] = http_error(401, b'{"errors":[{"message":"user not authorized"}]}')
        routes[f"{BASE}/api/v1/courses/11/late_policy"] = http_error(404)
        routes[f"{BASE}/api/v1/courses/11/assignment_groups?per_page=100"] = http_error(500)
        client, _ = client_with(routes)
        course = cg.fetch_courses(client)[0]
        details = cg.fetch_course_details(client, course, NOW, extras=True)
        self.assertEqual(sorted(details["unavailable"]), ["gradingStandard", "groups", "latePolicy"])
        self.assertEqual(len(details["announcements"]), 3)

    def test_a_401_on_a_required_request_still_means_the_login_failed(self):
        client, _ = client_with({f"{BASE}/api/v1/courses/5/assignments?include%5B%5D=submission&order_by=due_at&per_page=100": http_error(401)})
        with self.assertRaises(cg.CanvasError) as ctx:
            cg.fetch_assignments(client, 5)
        self.assertNotIsInstance(ctx.exception, cg.CanvasUnavailable)
        self.assertIn("did not accept", str(ctx.exception))

    def test_optional_requests_still_refuse_other_sites(self):
        routes = rich_routes()
        routes[f"{BASE}/api/v1/courses/11/late_policy"] = FakeResponse({}, link='<https://evil.example.com/x>; rel="next"')
        client, opener = client_with(routes)
        with self.assertRaises(cg.CanvasError):
            cg.fetch_late_policy(client, 11)
        self.assertTrue(all(r.full_url.startswith(BASE + "/") for r in opener.requests))


class RobustnessTests(unittest.TestCase):
    def test_the_syllabus_request_failing_still_saves_the_grades(self):
        routes = rich_routes()
        routes[f"{BASE}/api/v1/courses/11?include%5B%5D=syllabus_body&include%5B%5D=course_progress"] = http_error(500)
        client, _ = client_with(routes)
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "g.json"
            code = cg.run(["--base-url", BASE, "--out", str(out_path)], env={}, prompt=lambda _: SECRET,
                          client_factory=lambda b, c: client, now=NOW, out=output)
            data = json.loads(out_path.read_text(encoding="utf-8"))
        self.assertEqual(code, 0, output.getvalue())
        self.assertEqual(len(data["courses"][0]["assignments"]), 1)
        self.assertIn("syllabus", data["courses"][0]["unavailable"])
        self.assertIsNone(data["courses"][0]["syllabusText"])

    def test_an_extra_that_cannot_be_reached_is_left_out_not_fatal(self):
        routes = rich_routes()
        routes[f"{BASE}/api/v1/courses/11/late_policy"] = urllib.error.URLError("network blip")
        client, _ = client_with(routes)
        course = cg.fetch_courses(client)[0]
        details = cg.fetch_course_details(client, course, NOW, extras=True)
        self.assertIn("latePolicy", details["unavailable"])

    def test_odd_data_in_an_extra_never_costs_the_grades(self):
        weird = dict(RICH_ASSIGNMENT, submission_types=7, rubric="not a list", lock_at=5, assignment_group_id="x", description=12)
        weird_course = {"id": 11, "name": "Odd", "enrollments": [{"type": "student", "computed_current_score": 80}]}
        details = {"groups": [{"id": 1, "rules": 5}, 7], "latePolicy": {"late_policy": 3}, "announcements": [{"id": 1, "title": "t", "message": 4}],
                   "gradingStandard": {"grading_scheme": 9}, "syllabus": {"syllabus_body": 5, "course_progress": 6}, "unavailable": []}
        data = cg.build_export([weird_course], {11: [weird]}, "canvas.example.edu", NOW, {11: details})
        course = data["courses"][0]
        self.assertEqual(course["currentScore"], 80)
        self.assertEqual(course["assignments"][0]["name"], "Lab 3")
        self.assertEqual(course["assignments"][0]["pointsPossible"], 30)
        json.dumps(data)  # still a valid file

    def test_an_unexpected_error_says_where_but_not_what(self):
        output = io.StringIO()

        def boom(base, cred):
            raise RuntimeError(f"secret detail {SECRET}")

        with tempfile.TemporaryDirectory() as tmp:
            code = cg.run(["--base-url", BASE, "--out", str(Path(tmp) / "g.json")], env={}, prompt=lambda _: SECRET,
                          client_factory=boom, now=NOW, out=output)
        self.assertEqual(code, 2)
        self.assertIn("RuntimeError in boom, line", output.getvalue())
        self.assertNotIn(SECRET, output.getvalue())
        self.assertNotIn("secret detail", output.getvalue())

    def test_progress_lines_count_classes_without_naming_them(self):
        client, _ = client_with(rich_routes())
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as tmp:
            cg.run(["--base-url", BASE, "--out", str(Path(tmp) / "g.json")], env={}, prompt=lambda _: SECRET,
                   client_factory=lambda b, c: client, now=NOW, out=output)
        self.assertIn("Reading class 1 of 1...", output.getvalue())


class GradesOnlyTests(unittest.TestCase):
    def test_grades_only_skips_syllabus_announcements_instructions_and_rubrics(self):
        routes = rich_routes()
        routes[f"{BASE}/api/v1/courses?enrollment_type=student&enrollment_state=active"
               "&include%5B%5D=total_scores&include%5B%5D=term&per_page=100"] = FakeResponse([RICH_COURSE])
        client, opener = client_with(routes)
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "g.json"
            code = cg.run(["--base-url", BASE, "--out", str(out_path), "--grades-only"], env={}, prompt=lambda _: SECRET,
                          client_factory=lambda b, c: client, now=NOW, out=output)
            data = json.loads(out_path.read_text(encoding="utf-8"))
        self.assertEqual(code, 0, output.getvalue())
        course = data["courses"][0]
        self.assertNotIn("syllabusText", course)
        self.assertNotIn("announcements", course)
        self.assertNotIn("description", course["assignments"][0])
        self.assertNotIn("rubric", course["assignments"][0])
        self.assertEqual(course["groups"][0]["weight"], 40)  # still has what the grade math needs
        self.assertFalse(any("announcements" in r.full_url for r in opener.requests))


class SummaryTests(unittest.TestCase):
    def test_the_summary_gives_counts_only(self):
        client, _ = client_with(rich_routes())
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as tmp:
            code = cg.run(["--base-url", BASE, "--out", str(Path(tmp) / "g.json")], env={}, prompt=lambda _: SECRET,
                          client_factory=lambda b, c: client, now=NOW, out=output)
        text = output.getvalue()
        self.assertEqual(code, 0, text)
        self.assertIn("Weights for 1 class(es), letter scales for 1, late policies for 1.", text)
        self.assertIn("Syllabus for 1 class(es), 2 recent announcement(s), instructions for 1 assignment(s).", text)
        for private in ["Lab 3 moved", "Write two pages", "Late work: 10% off", SECRET]:
            self.assertNotIn(private, text)


if __name__ == "__main__":
    unittest.main()
