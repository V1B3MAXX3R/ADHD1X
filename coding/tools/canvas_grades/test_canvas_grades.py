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

    def __init__(self, routes):
        self.routes = routes
        self.requests = []

    def open(self, request, timeout=None):
        self.requests.append(request)
        result = self.routes[request.full_url]
        if isinstance(result, list):  # a sequence of results, one per call
            result = result.pop(0)
        if isinstance(result, Exception):
            raise result
        return result


def http_error(code, body=b""):
    return urllib.error.HTTPError(BASE, code, "x", {}, io.BytesIO(body))


def client_with(routes, credential=None, sleeps=None):
    cred = credential or cg.Credential("token", SECRET)
    opener = FakeOpener(routes)
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
        self.assertEqual(self.data["formatVersion"], 1)
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
            {courses_url: FakeResponse([RAW_COURSE]), assignments_url: FakeResponse(RAW_ASSIGNMENTS)}
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
            }
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


if __name__ == "__main__":
    unittest.main()
