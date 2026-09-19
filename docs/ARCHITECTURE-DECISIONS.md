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
