# Architecture Decision Records (ADR) — CubeStudio V2

## ADR-0001: Western Color Scheme & Kociemba Facelet Convention
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  CubeStudio V2 requires a uniform representation of the 3x3 Rubik's Cube across engine, renderer, 2D editor, scanner, and solver. Discrepancies between facelet indices or color mappings cause desynchronization bugs.
- **Decision**:
  Adopt the standard Western color scheme and standard Singmaster/Kociemba facelet indexing:
  - Faces: `U` (Up/White), `R` (Right/Red), `F` (Front/Green), `D` (Down/Yellow), `L` (Left/Orange), `B` (Back/Blue).
  - Facelet ordering: 54 characters in order `U1..U9 R1..R9 F1..F9 D1..D9 L1..L9 B1..B9` (faces ordered U, R, F, D, L, B).
  - Each face ordered top-left to bottom-right (indices 0..8, where index 4 is the fixed center).
- **Alternatives Considered**:
  - Custom face order (e.g. UDFBLR): Rejected because Kociemba and standard solver libraries require URFDLB.
  - Arbitrary index ordering: Rejected for maintainability.
- **Consequences**:
  Direct 1:1 compatibility with standard solvers (Kociemba) and 2D net unfolded layout without translation overhead.

---

## ADR-0002: Single Authoritative Source of Truth in CubeState
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  The Rubik's Cube can be modeled as stickers (54 facelets) or cubies (8 corners + 12 edges with permutation and orientation). Maintaining dual mutable representations creates state drift and synchronization bugs.
- **Decision**:
  `CubeState` is the SINGLE authoritative mutable/logical source of truth for the cube state, stored as a 54-facelet array. Cubie data (permutation and orientation) is strictly derived dynamically from `CubeState` for mathematical validation and analysis. Cubie representations are never a second source of truth.
- **Alternatives Considered**:
  - Dual mutable representations kept in sync: Rejected as error-prone.
  - Cubie-only state: Complicates 2D net editing, partial camera scanning, and direct sticker coloring.
- **Consequences**:
  Clean, unambiguous state boundaries. Validation can project stickers into cubies to verify physical solvable invariants without risk of divergence.

---

## ADR-0003: Pure Framework-Independent Cube Engine
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  Phase 0 requires the mathematical and logical cube foundation. If domain logic is entangled with React, Three.js, DOM events, or backend code, testing and maintainability suffer.
- **Decision**:
  The Cube Engine (`src/cube/`) is pure JavaScript with zero dependencies on React, Three.js, DOM, Node APIs, or backend frameworks. It executes identically in browser and Node environments.
- **Alternatives Considered**:
  - Integrating Three.js or UI components during Phase 0: Rejected to enforce strict separation of concerns.
- **Consequences**:
  Deterministic, isolated, highly testable domain engine.

---

## ADR-0004: Stack Technology Boundaries
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  Defining clear roles for the complete platform stack to prevent scope creep or redundant backends.
- **Decision**:
  - Frontend: React + Vite
  - 3D Renderer: Three.js (presentation only, receives CubeState)
  - Cube Engine: Pure JavaScript (domain core)
  - Backend: Python + Flask + Kociemba via versioned REST API (`/api/v1/`)
  - No Express or Node backend will be introduced unless a concrete requirement emerges that cannot be satisfied by the specified Flask backend.
- **Alternatives Considered**:
  - Express backend: Rejected as redundant to the specified Flask backend.
- **Consequences**:
  Clear architectural boundaries across the entire system.

---

## ADR-0005: 3D Renderer Presentation Layer & Hard Synchronization
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  Animating 3D face turns with Three.js involves rotating meshes around arbitrary axes. Floating-point errors and interrupted animations can cause visual cubies to drift away from the mathematical state over time.
- **Decision**:
  1. `CubeRenderer` is purely a visual projection of `CubeState`. It maintains 26 cubie meshes with face materials indexed to the 54 facelet layout.
  2. The `MoveAnimator` handles visual rotational transitions using temporary Three.js pivot groups.
  3. At the completion of every move (or upon cancellation/undo/reset), `CubeRenderer.syncWithState(cubeState)` and `resetPositions()` are invoked to hard-lock mesh transforms and material assignments to the authoritative `CubeState`.
  4. Input rapid clicks and multi-move sequences are queued through `AnimationQueue` (FIFO) to prevent overlapping conflicting mesh transformations.
- **Alternatives Considered**:
  - Relying solely on continuous mesh rotations to represent cube state: Rejected because rounding drift corrupts visual orientation.
- **Consequences**:
  Zero visual drift, robust rapid inputs, seamless undo/redo, and clean separation between rendering and mathematics.

---

## ADR-0006: Manual Editor Direct Domain Operation
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  The 2D Net Manual Editor allows user manipulation of individual facelets. Without strict domain boundaries, an editor might duplicate cube state, maintain divergent validation rules, or define custom serialization formats.
- **Decision**:
  `EditorController` directly operates on an instance of `CubeState` using standard domain methods (`getSticker`, `setSticker`, `getFace`).
  1. No duplicate cube representation is created.
  2. Multi-tier validation delegates entirely to `validate(this.cubeState)`.
  3. Serialization/deserialization uses standard Kociemba 54-facelet strings.
  4. Valid states are passed directly to the 3D Simulator without conversion layers.
  5. Center stickers remain fixed to preserve canonical spatial orientation.
- **Alternatives Considered**:
  - Storing stickers in custom React state: Rejected to eliminate state synchronization bugs.
- **Consequences**:
  100% interoperability between Editor, Simulator, Validation Engine, and upcoming Solver.

---

## ADR-0007: Python/Flask Kociemba Backend & Frontend Solver Service Layer
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  Phase 3 introduces the Rubik's Cube solver powered by the two-phase Kociemba algorithm. The solver requires a dedicated backend service with controlled API schemas, CORS, safe error handling, and separation of concerns.
- **Decision**:
  1. Built a versioned Python + Flask REST API (`/api/v1/`) exposing `GET /api/v1/health`, `POST /api/v1/validate`, and `POST /api/v1/solve`.
  2. Input validation strictly enforces 54-facelet URFDLB strings, valid face symbols, 9-count frequencies, fixed center coordinates, and physical solvability via Kociemba before computation.
  3. Structured error responses follow `{ "error": { "code": "...", "message": "..." } }` with standard error codes (`INVALID_REQUEST`, `INVALID_CUBE`, `UNSOLVABLE_CUBE`, `SOLVER_ERROR`, `INTERNAL_ERROR`), never leaking stack traces.
  4. Frontend interaction with the backend is strictly isolated behind `src/services/solverApi.js`. React UI components and feature controllers are prohibited from invoking `fetch()` directly.
  5. `SolverController.js` acts as the bridge: performs local pre-validation using `CubeEngine`, serializes `CubeState`, invokes `solverApi.solve()`, and converts raw solution strings into standard `Move` instances using `parseAlgorithm()`.
- **Alternatives Considered**:
  - Direct HTTP calls within React components: Rejected to maintain clean layered architecture and testability.
  - In-browser JavaScript Kociemba port: Rejected in favor of the canonical Python/C Kociemba backend specified in project specifications.
- **Consequences**:
  Clean client-server contract, full testability with mocked HTTP calls, zero state duplication, and seamless navigation between Simulator, Editor, and Solver.
