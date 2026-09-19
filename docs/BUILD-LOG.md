# Build Log — CubeStudio V2

## Milestones & Entries

### 2026-09-19 — Project Initialization & Phase 0 Completion
- **Author**: Lead Architect
- **Context**: Complete initialization of CubeStudio V2 starting strictly with Phase 0.
- **Specification Audit**: Reviewed all 11 specification documents (`00-project-spec.md` through `10-deployment.md`).
- **Architectural Clarifications & Decisions**:
  - Recorded ADR-0001 (Western color scheme & Kociemba standard facelet layout).
  - Recorded ADR-0002 (CubeState as single authoritative mutable source of truth; cubies strictly derived).
  - Recorded ADR-0003 (Pure framework-independent Cube Engine in `src/cube/`).
  - Recorded ADR-0004 (Stack Technology Boundaries: React + Vite frontend, Three.js presentation, Python + Flask + Kociemba backend; no Express).
- **Implementation**:
  - `src/cube/model/constants.js`: Faces, colors, opposites, facelet indices, solved string.
  - `src/cube/model/stickers.js`: 2D/global coordinate conversions, color mappings.
  - `src/cube/model/cubies.js`: Derivation of 8 corners and 12 edges with permutation and orientation from CubeState for mathematical validation and analysis.
  - `src/cube/model/moves.js`: Structured Move model, amount normalization, inverses, same/opposite face detection, move composition.
  - `src/cube/model/notation.js`: Singmaster/WCA parser, prime variants, comments, multiplier syntax `(R U)*3`, algorithm inversion.
  - `src/cube/model/CubeState.js`: Single authoritative state container, serialization (string/json/array), cloning, equals, isSolved.
  - `src/cube/engine/permutations.js`: Exact 54-facelet permutations for base moves U, D, L, R, F, B and their compositions.
  - `src/cube/engine/applyMove.js`: Pure non-mutating `applyMove`, `applyMoves`, `applyAlgorithm`.
  - `src/cube/engine/validation.js`: Multi-tier validator checking structure, symbols, frequencies, centers, impossible pieces, duplicates, corner twist parity ($\sum twist \equiv 0 \pmod 3$), edge flip parity ($\sum flip \equiv 0 \pmod 2$), and permutation parity ($\text{sgn}(\sigma_c) = \text{sgn}(\sigma_e)$).
  - `src/cube/engine/scramble.js`: WCA scramble generator enforcing non-consecutive same-face & axis turns, with deterministic Mulberry32 PRNG seed support.
  - `src/cube/engine/history.js`: Independent history manager with undo, redo, move count, branching, and state decoupling.
  - `src/cube/index.js`: Clean public barrel export.
  - `index.html` & `src/main.js`: Vite entry point.
- **Verification & Testing**:
  - Installed `vite` and `vitest`.
  - Implemented 8 test suites covering unit, integration, and property-based mathematical invariants.
  - Test run: 8/8 test files passed, 60/60 tests passed.
  - Production build: `npm run build` completed successfully with 0 errors.
- **Checkpoint**:
  - Phase 0 complete and verified. Ready for clean Git checkpoint.
