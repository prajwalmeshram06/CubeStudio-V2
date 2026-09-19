# CubeStudio V2 — Backend and API Specification

## 1. Technology
Initial stack:
- Python
- Flask
- Kociemba
- controlled CORS implementation

Use a production WSGI server in deployment.

## 2. API version
All public endpoints use `/api/v1/`.

## 3. Endpoints
```text
GET  /api/v1/health
POST /api/v1/validate
POST /api/v1/solve
```

Future:
```text
POST /api/v1/analyze
POST /api/v1/optimize
```

Request:
```json
{
  "cube": "..."
}
```

## 4. Validation
Check request structure, allowed symbols, exact facelet count, color counts, centers, legal cubie combinations, orientation/permutation constraints, and solver compatibility.

## 5. Solve response
```json
{
  "solution": ["R", "U", "R'", "U'"],
  "raw": "R U R' U'",
  "moveCount": 4
}
```

## 6. Error schema
```json
{
  "error": {
    "code": "INVALID_CUBE",
    "message": "The supplied cube configuration is invalid."
  }
}
```

Codes:
`INVALID_REQUEST`, `INVALID_CUBE`, `UNSOLVABLE_CUBE`, `SOLVER_ERROR`, `INTERNAL_ERROR`.

Never expose production stack traces.

## 7. Security
Use input validation, request-size limits, deliberate CORS, safe errors, environment variables, no committed secrets, and rate limiting when appropriate.

## 8. Environment
Configuration comes from environment variables. Secrets are never committed.

## 9. Tests
Test health, valid solve, solved cube, invalid length/characters/state, malformed JSON, solver failures, and unexpected internal errors.

## 10. Separation
Backend contains no frontend rendering logic and exposes stable domain-oriented APIs.
