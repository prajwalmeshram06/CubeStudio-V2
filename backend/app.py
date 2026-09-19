"""
CubeStudio V2 — Flask Backend
Provides versioned API endpoints for cube validation and Kociemba solving.

Endpoints:
  GET  /api/v1/health
  POST /api/v1/validate
  POST /api/v1/solve
"""

import os
import re
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import kociemba

# ──────────────────────────────────────────────────────────────
# App setup
# ──────────────────────────────────────────────────────────────
app = Flask(__name__)

# CORS: restrict to configured origins in production; default open for dev
ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})

# Never leak debug info in production
app.config["DEBUG"] = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
app.config["PROPAGATE_EXCEPTIONS"] = False

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cubestudio-api")

# ──────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────
FACELET_COUNT = 54
VALID_FACE_CHARS = set("URFDLB")
FACES = ["U", "R", "F", "D", "L", "B"]
STICKERS_PER_FACE = 9
# Index 4 of each face is the fixed center
CENTER_INDICES = [4, 13, 22, 31, 40, 49]
EXPECTED_CENTERS = {"U": 4, "R": 13, "F": 22, "D": 31, "L": 40, "B": 49}

# ──────────────────────────────────────────────────────────────
# Cube validation (mirrors front-end validation.js logic)
# ──────────────────────────────────────────────────────────────

def _error(code, message):
    return {"error": {"code": code, "message": message}}


def validate_cube_string(cube: str):
    """
    Multi-tier validation matching the specification.
    Returns (is_valid: bool, error_dict_or_None)
    """
    # 1. Type & length
    if not isinstance(cube, str):
        return False, _error("INVALID_REQUEST", "cube must be a string")
    if len(cube) != FACELET_COUNT:
        return False, _error("INVALID_REQUEST",
                              f"cube must be exactly {FACELET_COUNT} characters, got {len(cube)}")

    # 2. Allowed symbols
    for i, ch in enumerate(cube):
        if ch not in VALID_FACE_CHARS:
            return False, _error("INVALID_CUBE",
                                 f"Invalid symbol '{ch}' at index {i}")

    # 3. Exactly 9 of each face
    counts = {f: cube.count(f) for f in FACES}
    for face, count in counts.items():
        if count != STICKERS_PER_FACE:
            return False, _error("INVALID_CUBE",
                                 f"Face '{face}' has {count} stickers; expected {STICKERS_PER_FACE}")

    # 4. Centers
    for face, idx in EXPECTED_CENTERS.items():
        if cube[idx] != face:
            return False, _error("INVALID_CUBE",
                                 f"Center of face {face} at index {idx} is '{cube[idx]}', expected '{face}'")

    return True, None


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _parse_solution(raw: str) -> list[str]:
    """
    Parses a kociemba solution string into a list of individual move tokens.
    e.g. "R U R' U'" -> ["R", "U", "R'", "U'"]
    """
    return [m for m in raw.strip().split() if m]


def _require_json():
    """Returns (data, error_response). error_response is None on success."""
    if not request.is_json:
        return None, (jsonify(_error("INVALID_REQUEST", "Content-Type must be application/json")), 400)
    data = request.get_json(silent=True)
    if data is None:
        return None, (jsonify(_error("INVALID_REQUEST", "Request body is not valid JSON")), 400)
    return data, None


# ──────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────

@app.route("/api/v1/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": "1.0.0", "service": "cubestudio-api"}), 200


@app.route("/api/v1/validate", methods=["POST"])
def validate():
    data, err = _require_json()
    if err:
        return err

    cube = data.get("cube")
    if cube is None:
        return jsonify(_error("INVALID_REQUEST", "Missing required field: 'cube'")), 400

    is_valid, error_obj = validate_cube_string(cube)
    if not is_valid:
        return jsonify(error_obj), 422

    # Attempt a Kociemba solve to confirm the cube is physically solvable
    try:
        kociemba.solve(cube)
    except Exception:
        return jsonify(_error("INVALID_CUBE", "Cube is not physically solvable (Kociemba rejected it)")), 422

    return jsonify({"valid": True, "message": "Cube configuration is valid and solvable"}), 200


@app.route("/api/v1/solve", methods=["POST"])
def solve():
    data, err = _require_json()
    if err:
        return err

    cube = data.get("cube")
    if cube is None:
        return jsonify(_error("INVALID_REQUEST", "Missing required field: 'cube'")), 400

    # Validate first
    is_valid, error_obj = validate_cube_string(cube)
    if not is_valid:
        return jsonify(error_obj), 422

    # Invoke Kociemba
    try:
        raw = kociemba.solve(cube)
    except ValueError as exc:
        log.warning("Kociemba rejected cube: %s — %s", cube, exc)
        return jsonify(_error("UNSOLVABLE_CUBE",
                              "The cube configuration is not solvable. "
                              "Check for physically impossible states.")), 422
    except Exception as exc:
        log.error("Solver internal error: %s", exc)
        return jsonify(_error("SOLVER_ERROR", "Solver encountered an unexpected error")), 500

    # Handle already-solved cube
    raw = raw.strip()
    if not raw:
        return jsonify({"solution": [], "raw": "", "moveCount": 0}), 200

    solution = _parse_solution(raw)
    return jsonify({
        "solution": solution,
        "raw": raw,
        "moveCount": len(solution)
    }), 200


# ──────────────────────────────────────────────────────────────
# Error handlers — never leak stack traces
# ──────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify(_error("NOT_FOUND", "The requested endpoint does not exist")), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify(_error("METHOD_NOT_ALLOWED", "HTTP method not allowed on this endpoint")), 405


@app.errorhandler(413)
def payload_too_large(e):
    return jsonify(_error("INVALID_REQUEST", "Request payload is too large")), 413


@app.errorhandler(Exception)
def internal_error(e):
    log.exception("Unhandled exception")
    return jsonify(_error("INTERNAL_ERROR", "An internal error occurred")), 500


# ──────────────────────────────────────────────────────────────
# Entry point (dev only — production uses gunicorn/waitress)
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=app.config["DEBUG"])
