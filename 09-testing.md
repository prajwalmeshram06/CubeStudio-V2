# CubeStudio V2 — Testing Specification

## 1. Philosophy
Testing is part of implementation. A feature is not complete because one happy-path manual test works.

Layers:
```text
Unit → Integration → End-to-End → Regression
```

## 2. Cube Engine
Test solved state, every move, move/inverse, double turns, four turns, arbitrary sequences, inverse sequences, scrambles, validation, serialization, solved detection, history, undo/redo.

## 3. Properties
Where practical:
```text
apply(move, inverse(move)) = identity
four quarter turns = identity
sequence + inverse(sequence) = identity
serialize(deserialize(state)) = equivalent state
```

## 4. Renderer
Test initial cube, sticker colors, synchronization, visualization, reset, animation, queue, camera reset.

## 5. Simulator
Test keyboard, mouse, touch, rapid input, animation queue, undo/redo, scramble, reset.

## 6. Editor
Test sticker selection, color changes, clearing, reset, valid/invalid/impossible states, CubeState conversion, import/export.

## 7. Solver
Test solved cube, valid scramble, invalid/impossible cube, backend unavailable, malformed response, parser, playback, pause/resume, restart, reset.

## 8. Timer
Test start/stop/reset, inspection, +2, DNF, history, deletion, statistics, export, keyboard controls. Avoid brittle exact wall-clock assertions.

## 9. Scanner
Test lighting, glare, angles, tilt, partial visibility, uncertain colors, face order, incomplete scans.

## 10. Training
Test lesson loading, expected states, correct/incorrect moves, algorithms, completion, persistence, mistake classification.

## 11. Critical E2E flows

### Simulator
Open → scramble → manually solve → solved.

### Editor
Open → construct/import → validate → solve.

### Solver
Scramble → request solution → play → solved.

### Timer
Scramble → solve → stop → save → statistics update.

### Scanner
Scan six faces → validate → CubeState → solve.

## 12. Regression
Every significant fixed bug should receive a regression test when practical.

## 13. Definition of done
A feature is complete only when implementation works, appropriate tests pass, build passes, errors are handled, documentation is updated, no critical regression exists, and a Git checkpoint is created.
