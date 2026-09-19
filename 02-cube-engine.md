# CubeStudio V2 — Cube Engine Specification

## 1. Purpose
The cube engine is the mathematical and logical foundation. It must be pure, deterministic, testable, and independent of browser/UI/Three.js/Flask.

## 2. CubeState
Support:
- solved state
- clone
- comparison
- serialization/deserialization
- move application
- validation
- solved detection

The representation may be sticker-based, cubie-based, or a documented hybrid.

## 3. Face convention
Use one consistent `U D L R F B` convention. Document face order, color mapping, sticker indexing, orientation, and serialization order.

The same convention must be used by engine, renderer, editor, scanner, and solver.

## 4. Moves
Support:
```text
U U' U2
D D' D2
L L' L2
R R' R2
F F' F2
B B' B2
```

Use structured move data internally rather than strings alone.

## 5. Required APIs
Equivalent APIs should exist:
```text
applyMove(state, move)
applyMoves(state, moves)
inverseMove(move)
inverseSequence(sequence)
parseMove(text)
parseAlgorithm(text)
isSolved(state)
cloneState(state)
serialize(state)
deserialize(data)
validate(state)
scramble(length)
```

## 6. History
Support push, undo, redo, clear, current index, and move count. Keep history separate from mathematical CubeState.

## 7. Scrambling
Scrambles must be legal, avoid immediate same-face repetitions, avoid obvious redundant patterns where practical, support configurable length, and optionally support deterministic seeds.

## 8. Validation
Distinguish malformed data, invalid symbols/counts, invalid centers, impossible edges/corners, invalid orientation/permutation, and unsolvable states. String length alone is insufficient.

## 9. Invariants
```text
move + inverse(move) = identity
four quarter turns = identity
two half turns = identity
sequence + inverse(sequence) = identity
serialize(deserialize(state)) = equivalent state
```

## 10. Property tests
Use generated move sequences where practical to test inverse operations, serialization, scrambles, and restoration.

## 11. Golden rule
If UI/renderer needs a workaround because cube logic is wrong, fix the engine instead.
