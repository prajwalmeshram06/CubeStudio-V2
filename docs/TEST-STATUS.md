# Test Status — CubeStudio V2

## Overview
- **Frontend Runner**: Vitest v2.1.9
- **Backend Runner**: Pytest v9.1.1 (Python 3.14.0)
- **Last Run**: 2026-09-20 (Phase 8 Documentation Reconciliation)
- **Frontend Suites**: 40 (311 tests, 100% passing)
- **Backend Suites**: 1 (22 tests, 100% passing)
- **Total Tests**: 333 (100% passing)
- **Failing Tests**: 0
- **Coverage**: Core cube domain, engine, Three.js renderer presentation, simulator controller, manual editor controller, solver service, solution player, speedcubing timer, WCA statistics, persistence storage, beginner training curriculum/engine/validation, CFOP algorithms, mistake intelligence, camera scanner pipeline, 54-facelet reconstruction, and Flask REST API.

---

## Testing & Hardware Limitations
> [!IMPORTANT]
> **Physical Camera Testing Gap**: All automated scanner, color classification, grid detection, session state machine, and 54-facelet reconstruction tests pass 100% (40 frontend test files, 311 unit and component tests). However, physical verification with a live optical camera and physical Rubik's Cube in a browser runtime remains pending because a physical webcam and cube were unavailable in the development/CI environment.

---

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
| `SimulatorController.test.js` | 8 | Passed | Initial state, move dispatch, undo/redo, scramble, reset, algorithm application, renderer sync, `loadState` |
| `EditorController.test.js` | 13 | Passed | Initial solved state, brush selection, sticker painting, center lock, cycle colors, reset, clear, undo/redo, parity detection, import/export roundtrips, state loading, simulator readiness |
| `solverApi.test.js` | 8 | Passed | Health check, cube validation request, solve request, network error handling, non-JSON parse errors, HTTP error codes, unsolvable cube handling |
| `SolverController.test.js` | 7 | Passed | Initialization with CubeState, local validation before network call, illegal cube rejection, cube reference updates, solve execution and move parsing into Move instances, already-solved handling, health check delegation |
| `SolutionPlayerController.test.js` | 28 | Passed | Normal/empty initialization, step forward to completion, index boundary protection, step backward via `Move.inverse()`, restart, progress metrics & percentages, hint generation, recursive setTimeout autoplay, busy-simulator throttling, dynamic playback speed rescheduling, decoupled animation speed |
| `SolutionPlayerView.test.jsx` | 7 | Passed | Empty solution solved state, move chip track, progress bar & counts, active move chip `aria-current="step"`, accessible playback buttons, speed selector pills, close button & compact layout, mount subscription & unmount pause |
| `SolutionSimulatorIntegration.test.js` | 3 | Passed | End-to-end integration: forward solution execution through simulator controller to solved state, backward solution execution rewinding to scramble, restart restoring both logical and 3D visual state |
| `TimerController.test.js` | 20 | Passed | State machine transitions (`IDLE -> INSPECTION -> READY -> RUNNING -> STOPPED -> SAVED`), monotonic clock injection, 15s WCA inspection warnings (8s, 12s) and automatic penalties (+2 for 15-17s, DNF for >17s), penalty toggling, metadata capture, scramble generation |
| `statistics.test.js` | 24 | Passed | Effective time calculation, WCA formatting, Ao5/Ao12/Ao50/Ao100 trimmed averaging, DNF rules (>1 DNF in Ao5/12 = DNF), best single, session mean, improvement tracking, edge cases |
| `solveStorage.test.js` | 12 | Passed | LocalStorage abstraction, solve record validation & normalization, CRUD operations, corrupted JSON recovery, partial corruption filtering, JSON export, RFC-compliant CSV export with quoting |
| `TimerView.test.jsx` | 3 | Passed | TimerView initial IDLE state with scramble and stats, HistoryView empty state, HistoryView populated table with penalties, dates, scrambles, and export buttons |
| `curriculum.test.js` | 3 | Passed | Nine beginner lessons, unique IDs, required metadata, deterministic start states |
| `lessonValidation.test.js` | 4 | Passed | Start incomplete / demo complete for practical lessons, partial white-cross, reset recreates start |
| `TrainingController.test.js` | 9 | Passed | Phase transitions, locks, hints, correct/wrong-direction/incorrect moves without auto-fix, reset, completion unlock |
| `TrainingSimulatorIntegration.test.js` | 4 | Passed | Moves through SimulatorController, CubeState authority, loadState reset, simulator still works after dispose |
| `TrainingView.test.jsx` | 1 | Passed | Curriculum screen with nine lessons and progress |
| `cfopData.test.js` | 3 | Passed | CFOP catalog structure, Cross, F2L (41 cases), 2-Look OLL, 2-Look PLL, retrieval helpers |
| `mistakeDetection.test.js` | 9 | Passed | Single-move classification (correct, wrong face, wrong direction, incomplete double), sequence divergence, message and tip derivation |
| `MoveTrainerController.test.js` | 4 | Passed | Prompt generation, correct move feedback and streak increment, mistake handling, sequence drill mode |
| `AlgorithmTrainerController.test.js` | 4 | Passed | Case loading, step-by-step move verification, setup move isolation, completion recording |
| `trainingStorage.test.js` | 5 | Passed | Storage initialization, attempt recording, accuracy tracking, mistake count aggregation, corrupt JSON recovery |
| `TrainingMoveIntegration.test.js` | 9 | Passed | Simulator `onMove` stream integration, user move observation, setup move isolation (`source: 'setup'`), prompt skip handling (`MISTAKE_TYPES.SKIPPED`) |
| `ColorClassifier.test.js` | 13 | Passed | RGB to HSL conversion, classification for white, yellow, red, orange, blue, green, ambiguous/grey handling, 9-cell batch classification |
| `ColorSampler.test.js` | 3 | Passed | Center sampling, 5×5 multi-pixel block averaging, bounds boundary safety, 9-cell batch sampling |
| `FaceDetector.test.js` | 6 | Passed | Average brightness computation, null/empty input rejection, uniform-image center crop fallback, high-contrast square region detection |
| `GridDetector.test.js` | 4 | Passed | Coordinate clamp helper, 9-cell descriptor generation, row-major index ordering, center cell at index 4, sample radius bounds |
| `ScanQuality.test.js` | 8 | Passed | Quality state evaluation (`SEARCHING`, `DETECTED`, `ALIGNING`, `READY`, `CAPTURED`, `LOW_LIGHT`, `POOR_ALIGNMENT`, `LOW_CONFIDENCE`), human-readable labels |
| `ScannerView.test.jsx` | 1 | Passed | 6-face progress stepper, target face instructions, orientation guidance, viewfinder viewport |
| `CubeReconstructor.test.js` | 12 | Passed | Normalization of color names, solved cube reconstruction matching `SOLVED_FACELET_STRING`, known scrambles (`R U R' U'`, Checkerboard, T-Perm), missing faces, wrong sticker count, unbalanced colors, corner twist parity rejection |
| `ScannerSessionController.test.js` | 7 | Passed | Initial state (`U` target), capture handling (`REVIEWING_FACE`), center color mismatch warning, sequential 6-face progression, full 6-face `READY` evaluation, individual face rescan, session reset |

---

## Backend Test Suites (Pytest)
| Suite | Tests | Status | Scope |
|---|---|---|---|
| `backend/tests/test_api.py` | 22 | Passed | `TestHealth` (200 OK, JSON structure, method not allowed), `TestValidate` (valid solved cube, missing fields, content types, malformed JSON, bad length, invalid symbols, wrong counts, wrong centers, GET not allowed), `TestSolve` (solved cube, response schema, invalid symbols, wrong length, wrong centers, malformed JSON, GET not allowed), `TestErrorHandlers` (404 JSON, zero stack trace leak) |

---

## Regression & Boundary Tests Recorded
- **Duplicate Pieces Balancing**: Piece validity tests balance color counts to isolate piece checks from frequency checks.
- **Rapid User Input Safety**: AnimationQueue buffers rapid turns without dropping moves or corrupting mesh transforms.
- **Fixed Center Immutability**: Centers at index 4 are locked against accidental manual modification.
- **Backend Error Sanitization**: API errors return standardized JSON envelopes without leaking Python stack traces.
- **Solution Player Animation Guard**: Forward/backward stepping is locked while `SimulatorController.queue.isBusy()` is true.
- **Timer Raw Time Invariance**: Solve duration is frozen on stop; penalties (+2, DNF) are recorded as separate attributes.
- **Move Event Stream & Source Tagging**: Simulator emits discrete `onMove` events with source metadata (`user`, `setup`, `scramble`, `algorithm`), isolating automated setups from trainer accuracy scoring.
- **Training Skip Tracking**: Added `MISTAKE_TYPES.SKIPPED` so learners can skip difficult prompts without falsely inflating drill accuracy.
- **Scanner Uniform Frame Fallback**: `FaceDetector` handles zero/minimal variance gracefully to prevent `NaN` division on uniform/dark camera frames.
- **Deterministic 54-Facelet Assembly**: `CubeReconstructor` maps 6 faces in exact Kociemba order, verified against multiple known move algorithms.
- **Multi-Tier Parity Enforcement**: Reconstructed states are rejected if physical invariants (corner twist, edge flip, permutation parity) fail.
