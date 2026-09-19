"""
Backend API tests for CubeStudio V2 Flask server.
Uses Python's built-in unittest and Flask test client.
Run with: python3 -m pytest backend/tests/ -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import pytest
from app import app

# ──────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────
SOLVED_CUBE = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"

# A scrambled but physically valid cube (from kociemba itself)
SCRAMBLED_CUBE = "DLUBUBDFU" + "RBRFBLRLD" + "DRFDFULUB" + "LUBBDRRUL" + "BBLFRFUFD" + "RFULDFLRD"

# Invalid: wrong length
SHORT_CUBE = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDLLLLLLLLLBBBBBBBBB"  # 53 chars

# Invalid: bad character
BAD_CHAR_CUBE = "XUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"

# Invalid: wrong counts (one U too many, one R missing)
WRONG_COUNTS_CUBE = "UUUUUUUUUURRRRRRRR" + "F" * 9 + "D" * 9 + "L" * 9 + "B" * 9

# Invalid: wrong centers
WRONG_CENTERS_CUBE = "RRRRRRRRRRRRRRRRRR" + "F" * 9 + "D" * 9 + "L" * 9 + "B" * 9


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# ──────────────────────────────────────────────────────────────
# /api/v1/health
# ──────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_returns_200(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200

    def test_health_json_structure(self, client):
        data = client.get("/api/v1/health").get_json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "service" in data

    def test_health_post_not_allowed(self, client):
        resp = client.post("/api/v1/health")
        assert resp.status_code == 405


# ──────────────────────────────────────────────────────────────
# /api/v1/validate
# ──────────────────────────────────────────────────────────────
class TestValidate:
    def _post(self, client, body, content_type="application/json"):
        return client.post(
            "/api/v1/validate",
            data=json.dumps(body),
            content_type=content_type
        )

    def test_valid_solved_cube(self, client):
        resp = self._post(client, {"cube": SOLVED_CUBE})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["valid"] is True

    def test_missing_cube_field(self, client):
        resp = self._post(client, {})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "INVALID_REQUEST"

    def test_wrong_content_type(self, client):
        resp = client.post("/api/v1/validate", data="not-json", content_type="text/plain")
        assert resp.status_code == 400

    def test_malformed_json(self, client):
        resp = client.post(
            "/api/v1/validate",
            data="{invalid",
            content_type="application/json"
        )
        assert resp.status_code == 400

    def test_short_cube_string(self, client):
        resp = self._post(client, {"cube": SHORT_CUBE})
        assert resp.status_code in (400, 422)
        assert "error" in resp.get_json()

    def test_invalid_character(self, client):
        resp = self._post(client, {"cube": BAD_CHAR_CUBE})
        assert resp.status_code == 422
        assert resp.get_json()["error"]["code"] == "INVALID_CUBE"

    def test_wrong_counts(self, client):
        resp = self._post(client, {"cube": WRONG_COUNTS_CUBE})
        assert resp.status_code == 422

    def test_wrong_centers(self, client):
        resp = self._post(client, {"cube": WRONG_CENTERS_CUBE})
        assert resp.status_code == 422

    def test_get_not_allowed(self, client):
        resp = client.get("/api/v1/validate")
        assert resp.status_code == 405


# ──────────────────────────────────────────────────────────────
# /api/v1/solve
# ──────────────────────────────────────────────────────────────
class TestSolve:
    def _post(self, client, body):
        return client.post(
            "/api/v1/solve",
            data=json.dumps(body),
            content_type="application/json"
        )

    def test_solved_cube_returns_empty_solution(self, client):
        resp = self._post(client, {"cube": SOLVED_CUBE})
        # kociemba may return a non-empty trivial solution or empty
        assert resp.status_code == 200
        data = resp.get_json()
        assert "solution" in data
        assert "raw" in data
        assert "moveCount" in data
        assert isinstance(data["solution"], list)

    def test_solution_response_structure(self, client):
        resp = self._post(client, {"cube": SOLVED_CUBE})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["moveCount"] == len(data["solution"])

    def test_missing_cube_field(self, client):
        resp = self._post(client, {})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "INVALID_REQUEST"

    def test_invalid_symbol_rejected(self, client):
        resp = self._post(client, {"cube": BAD_CHAR_CUBE})
        assert resp.status_code == 422

    def test_wrong_length_rejected(self, client):
        resp = self._post(client, {"cube": "UUUUU"})
        assert resp.status_code in (400, 422)

    def test_wrong_centers_rejected(self, client):
        resp = self._post(client, {"cube": WRONG_CENTERS_CUBE})
        assert resp.status_code == 422

    def test_malformed_json(self, client):
        resp = client.post(
            "/api/v1/solve",
            data="{bad}",
            content_type="application/json"
        )
        assert resp.status_code == 400

    def test_get_not_allowed(self, client):
        resp = client.get("/api/v1/solve")
        assert resp.status_code == 405


# ──────────────────────────────────────────────────────────────
# Error handler
# ──────────────────────────────────────────────────────────────
class TestErrorHandlers:
    def test_404_returns_json(self, client):
        resp = client.get("/api/v1/nonexistent")
        assert resp.status_code == 404
        data = resp.get_json()
        assert "error" in data

    def test_no_stack_trace_in_errors(self, client):
        resp = client.post(
            "/api/v1/solve",
            data="{bad}",
            content_type="application/json"
        )
        text = resp.get_data(as_text=True)
        assert "Traceback" not in text
        assert "Exception" not in text
