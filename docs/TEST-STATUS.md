# Test Status — CubeStudio V2

## Overview
- **Frontend Runner**: Vitest v2.1.9
- **Backend Runner**: Pytest v9.1.1 (Python 3.14.0)
- **Last Run**: 2026-09-19 (Phase 5 Speedcubing Timer + Statistics)
- **Frontend Suites**: 21 (196 tests, 100% passing)
- **Backend Suites**: 1 (22 tests, 100% passing)
- **Total Tests**: 218 (100% passing)
- **Failing Tests**: 0
- **Coverage**: 100% across core domain, engine, renderer presentation, simulator controller, editor controller, solver service, solution player, speedcubing timer, statistics, persistence, and Flask REST API

## Frontend Test Suites (Vitest)
| Suite | Tests | Status | Scope |
|---|---|---|---|
| `CubeState.test.js` | 8 | Passed | Solved state creation, cloning, equality check, facelet serialization roundtrips |
| `moves.test.js` | 8 | Passed | Move creation, direction normalization, inverses, same/opposite faces, composition |
| `notation.test.js` | 8 | Passed | 18 moves, alternative primes (' , ’, i), algorithm parser, comment stripping, multipliers, format, inverse |
| `applyMove.test.js` | 9 | Passed | All 18 moves, $M^4 = I$, $(M2)^2 = I$, $M \cdot M^{-1} = I$, Sexy move $(R\ U\ R'\ U')^6 = I$, T-perm, Sune, Checkerboard |
| `scramble.test.js` | 6 | Passed | Length constraints, non-repetition of same-face & axis turns, seed reproducibility, validity preservation |
| `validation.test.js` | 13 | Passed | Solved cube, scrambled cubes, malformed inputs, invalid symbols, bad counts, invalid centers, impossible pieces, duplicate pieces, corner twist parity, edge flip parity, permutation parity |
| `history.test.js` | 5 | Passed | Push, undo, redo, boundaries, history branching upon new move, clear |
| `properties.test.js` | 3 | Passed | 50 random scrambles inverted ($Seq \cdot Seq^{-1} = I$), 50 serialization roundtrips, 50 scrambled validity invariants |
| `CubeRenderer.test.js` | 6 | Passed | 26 cubies created, 9 per face identified, materials synced with CubeState, position resets, disposal |
| `AnimationQueue.test.js` | 3 | Passed | FIFO sequential processing, enqueueAll, queue clear/flush, busy state |
| `SimulatorController.test.js` | 7 | Passed | Initial state, move dispatch, undo/redo, scramble, reset, algorithm application, renderer sync |
| `EditorController.test.js` | 13 | Passed | Initial solved state, brush selection, sticker painting, center lock, cycle colors, reset, clear, undo/redo, parity detection, import/export roundtrips, state loading, simulator readiness |
| `solverApi.test.js` | 8 | Passed | Health check, cube validation request, solve request, network error handling, non-JSON parse errors, HTTP error codes, unsolvable cube handling |
| `SolverController.test.js` | 7 | Passed | Initialization with CubeState, local validation before network call, illegal cube rejection, cube reference updates, solve execution and move parsing into Move instances, already-solved handling, health check delegation |
| `SolutionPlayerController.test.js` | 28 | Passed | Normal/empty initialization, step forward to completion, index boundary protection, step backward via `Move.inverse()`, restart, progress metrics & percentages, hint generation, recursive setTimeout autoplay, busy-simulator throttling, dynamic playback speed rescheduling, decoupled animation speed |
| `SolutionPlayerView.test.jsx` | 7 | Passed | Empty solution solved state, move chip track, progress bar & counts, active move chip `aria-current="step"`, accessible playback buttons, speed selector pills, close button & compact layout, mount subscription & unmount pause |
| `SolutionSimulatorIntegration.test.js` | 3 | Passed | End-to-end integration: forward solution execution through simulator controller to solved state, backward solution execution rewinding to scramble, restart restoring both logical and 3D visual state |
| `TimerController.test.js` | 15 | Passed | State machine transitions (IDLE -> INSPECTION -> READY -> RUNNING -> STOPPED -> SAVED), monotonic clock injection, 15s WCA inspection warnings (8s, 12s) and automatic penalties (+2 for 15-17s, DNF for >17s), penalty toggling, metadata capture, scramble generation |
| `statistics.test.js` | 24 | Passed | Effective time calculation, WCA formatting, Ao5/Ao12/Ao50/Ao100 trimmed averaging, DNF rules (>1 DNF in Ao5/12 = DNF), best single, session mean, improvement tracking, edge cases |
| `solveStorage.test.js` | 12 | Passed | LocalStorage abstraction, solve record validation & normalization, CRUD operations, corrupted JSON recovery, partial corruption filtering, JSON export, RFC-compliant CSV export with quoting |
| `TimerView.test.jsx` | 3 | Passed | TimerView initial IDLE state with scramble and stats, HistoryView empty state, HistoryView populated table with penalties, dates, scrambles, and export buttons |

## Backend Test Suites (Pytest)
| Suite | Tests | Status | Scope |
|---|---|---|---|
| `backend/tests/test_api.py` | 22 | Passed | `TestHealth` (200 OK, JSON structure, method not allowed), `TestValidate` (valid solved cube, missing fields, content types, malformed JSON, bad length, invalid symbols, wrong counts, wrong centers, GET not allowed), `TestSolve` (solved cube, response schema, invalid symbols, wrong length, wrong centers, malformed JSON, GET not allowed), `TestErrorHandlers` (404 JSON, zero stack trace leak) |

## Regression & Boundary Tests Recorded
- Duplicate pieces test requires exact color count balancing to test piece validity independently from frequency checks.
- Rapid user input buffer prevents race conditions and corrupted mesh rotations.
- Instant speed mode (0ms) bypasses animation delay while keeping exact state transitions and visual synchronization.
- Fixed center pieces (index 4) protected from arbitrary editing in editor to maintain canonical face definitions.
- Backend errors guaranteed to return standardized JSON error objects without leaking Python execution stack traces or internal exception details.
- Solution Player strictly disallows forward/backward steps when SimulatorController queue is busy, eliminating animation race conditions.
- Inverse moves during backward stepping utilize `Move.inverse()` without recreating CubeState or re-running full permutation walks.
