# CubeStudio V2 — Solver Specification

## 1. Purpose
Convert a valid CubeState into a structured legal move sequence. Initial backend solver: Kociemba.

## 2. Pipeline
```text
CubeState
   ↓
validation
   ↓
facelet notation
   ↓
POST /api/v1/solve
   ↓
Kociemba
   ↓
structured solution
   ↓
move parser
   ↓
solution player
```

## 3. Frontend
Obtain state, validate, serialize, call API, parse response, display solution, playback, and errors.

## 4. Backend
Validate request and cube, convert to Kociemba format, invoke solver, normalize moves, and return structured JSON.

## 5. Response
```json
{
  "solution": ["R", "U", "R'", "U'"],
  "raw": "R U R' U'",
  "moveCount": 4
}
```

## 6. Solution player
Support play, pause, resume, next, previous, restart, skip, replay, and reset.

Use the same cube engine and renderer as the simulator. Never create a separate move system.

## 7. Visuals
Show current move, affected face, animation, progress, current index, and remaining moves.

## 8. Hints
Progressively support:
1. next move text
2. affected-face highlight
3. move animation
4. explanation of purpose

## 9. Errors
Handle invalid/impossible cubes, malformed responses, backend unavailable, solver failure, timeout, empty solution, and unexpected notation.

## 10. Tests
Test solved cubes, random scrambles, invalid/impossible cubes, API failure, malformed response, parsing, playback, pause/resume, restart, and reset.

## 11. Abstraction
Frontend feature code should use a solver service rather than directly coupling itself to HTTP.
