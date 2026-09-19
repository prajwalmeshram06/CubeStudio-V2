# CubeStudio V2 — Speedcubing Timer Specification

## 1. Purpose
Provide reliable speedcubing timing with WCA-style concepts and persistent statistics. Timer state is separate from CubeState.

## 2. States
```text
IDLE → INSPECTION → READY → RUNNING → STOPPED → SAVED
```

Transitions must be explicit and testable.

## 3. Features
- scramble
- inspection
- start/stop
- keyboard/spacebar controls
- solve recording
- reset/delete
- move count
- optional solution capture

## 4. WCA-style
Support 15-second inspection, inspection warning, +2, and DNF. Store penalty separately from raw time.

## 5. Solve record
```json
{
  "id": "...",
  "timeMs": 15320,
  "penalty": null,
  "scramble": "R U R' ...",
  "moveCount": 48,
  "date": "...",
  "solution": "..."
}
```

## 6. Timing accuracy
Use a monotonic/high-resolution timing API. Do not derive elapsed time from render frames.

## 7. Statistics
Support best single, average, count, Ao5, Ao12, Ao50, Ao100, and improvement. Define penalty/DNF handling explicitly.

## 8. History
Allow viewing, inspecting scramble/time/penalty, deleting, and exporting solves.

## 9. Graphs
Future views may include solve trends, rolling averages, best progression, and session comparisons.

## 10. Tests
Test start/stop/reset, inspection, +2, DNF, history, deletion, statistics, export, and keyboard controls. Avoid brittle exact-clock tests.
