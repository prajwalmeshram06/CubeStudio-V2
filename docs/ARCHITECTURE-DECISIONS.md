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

---

## ADR-0008: Solution Player State Machine & Headless Simulator Coordination
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  Phase 4 requires step-by-step playback, progress tracking, hints, and 3D visual animation of Kociemba solutions. If the solution player were to implement its own animation loop, animation queue, or 3D meshes, it would duplicate the simulator engine and cause state desynchronization.
- **Decision**:
  1. `SolutionPlayerController` is designed as a headless domain state machine owning solution moves (`Move[]`), current playback index (`0..N`), status (`idle`, `playing`, `paused`, `completed`), progress stats, and natural-language hint generation.
  2. The single source of truth for cube transformations remains `CubeState` and `applyMove`.
  3. Reverse navigation (`stepBackward()`) uses standard `Move.inverse()` to step backward without recomputing the cube state.
  4. The solution player coordinates with the existing `SimulatorController` by dispatching requested forward and inverse moves into `simulatorController.applyMove()`.
  5. 3D rotational animations, FIFO sequential queuing, and Three.js mesh state remain the sole responsibility of `SimulatorController`, `AnimationQueue`, and `CubeRenderer`.
  6. Rapid user inputs and autoplay ticks are guarded against race conditions by checking `simulatorController.queue.isBusy()`.
  7. `SolutionPlayerView` is built as a reusable React component supporting move highlighting (`completed`, `current`, `upcoming`), accessibility landmarks (`aria-current="step"`, `aria-label`), auto-scrolling rail, and speed presets.
- **Alternatives Considered**:
  - Independent animation engine in the solution player: Rejected because it violates single source of truth and causes visual drift.
  - Plain string move manipulation: Rejected in favor of structured `Move` instances and `parseAlgorithm`.
- **Consequences**:
  100% state synchronization, zero duplicated animation logic, complete testability without DOM/WebGL requirements, and seamless embedding across both the Solver and 3D Simulator views.

---

## ADR-0009: Speedcubing Timer State Machine, Monotonic Timing, and Persistence
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  Phase 5 introduces a WCA-style speedcubing timer with inspection, solve recording, penalties, statistics, and solve history. The timer must be architecturally independent from the authoritative `CubeState`, must not rely on UI render frame rates or `setInterval` for elapsed timing, and must preserve raw solve times while tracking penalties.
- **Decision**:
  1. **Strict Separation of Concerns**: The timer state machine (`TimerController.js`) owns the timer lifecycle (`IDLE` -> `INSPECTION` -> `READY` -> `RUNNING` -> `STOPPED` -> `SAVED`). It does not own or mutate the authoritative `CubeState`. Scrambles are generated using the existing `generateScrambleString` domain utility.
  2. **Monotonic High-Resolution Timing**: Timer elapsed duration is derived strictly from `(now() - startTime)` using `performance.now()`. Display loops run purely for visual UI refreshes without affecting raw timing. The clock source is injectable (`options.now`) allowing 100% deterministic unit testing.
  3. **WCA Inspection & Penalty Integrity**: 15-second inspection countdown triggers automatic +2 (15s–17s) and DNF (>17s) penalties. Raw `timeMs` is permanently frozen upon stopping and NEVER mutated to represent penalties. Penalties are stored as a separate attribute (`null`, `'+2'`, `'DNF'`).
  4. **Pure Statistics Engine**: `statistics.js` computes effective times, best singles, session mean, Ao5, Ao12, Ao50, and Ao100 using standard WCA trimmed averaging (e.g. Ao5 trims 1 fastest and 1 slowest, counting 1 DNF as worst solve and >1 DNF as DNF).
  5. **Resilient Client Storage & Multi-Format Export**: `solveStorage.js` isolates localStorage persistence, validating and normalizing solve records, safely handling corrupted data, and providing JSON and RFC-compliant CSV export.
  6. **Bridge Navigation**: Timer and History views allow instantaneous loading of scrambles into the 3D Simulator and Solver without mutating authoritative state unexpectedly.
- **Alternatives Considered**:
  - Timer driving simulator directly: Rejected to prevent coupling inspection and solving with simulator rendering.
  - Deriving time from interval counts: Rejected because browser timer throttling causes severe time drift.
- **Consequences**:
  Ultra-precise, non-drifting speedcubing timer; reliable persistence across reloads; pure testable statistics; and zero interference with the existing simulator and solver architecture.

---

## ADR-0010: Training Lesson Engine on Authoritative CubeState
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**:
  Phase 6A adds a beginner 9-lesson curriculum. A second cube permutation engine, renderer, or animation loop would drift from the simulator and violate ADR-0002.
- **Decision**:
  1. `TrainingController` owns lesson phase, step index, hints, feedback, and in-session unlock/completion. It does not own cube permutation.
  2. The learner cube is the existing `SimulatorController.cubeState`. Training evaluates that instance (or a clone for tests) with pure predicates in `lessonValidation.js` that derive cubies from facelets.
  3. Deterministic starts are `applyAlgorithm(CubeState.createSolved(), setupAlgorithm)`. Practical completion is cubie/facelet conditions (white cross, F2L, yellow cross on D, etc.), not button clicks.
  4. Demonstration uses `simulatorController.applyAlgorithm` and the existing `AnimationQueue`. Practice observation is disabled until the demo queue is idle and `loadState` restores the start.
  5. Mistakes are never auto-undone. Feedback classifies wrong direction / wrong piece only when CubeState evidence supports it.
  6. `SimulatorView` gains a `training` variant and `onControllerReady`; `loadState` updates the cube without changing React keys on each move.
- **Alternatives Considered**:
  - Independent training cube model: Rejected; duplicates `CubeState`.
  - Remounting `SimulatorView` per move or per step: Rejected; drops WebGL context and races animation.
  - Auto-repairing illegal learner moves: Rejected by the Phase 6A teaching model.
- **Consequences**:
  Curriculum can grow as data. CFOP trainers (Phase 6B) can reuse the same engine, validation helpers, and simulator bridge.

---

## ADR-0011: Trainer Architecture, Authoritative Move Events, Source Isolation & Mistake Intelligence
- **Date**: 2026-09-20
- **Status**: Accepted
- **Context**:
  Phase 6B extends the training system with Move Trainer, Notation Trainer, and CFOP Algorithm Trainer. A naive subscription to general simulator state (`subscribe`) only provided UI flags (like `lastMoveTime`, `isSolved`) and lacked discrete move event data. Furthermore, applying setup moves (e.g. scrambling the cube to the start of an algorithm case) would erroneously trigger user drill evaluation and skew accuracy metrics.
- **Decision**:
  1. **Authoritative Move Event Stream**: Add an explicit `onMove(listener)` event stream to `SimulatorController` emitting `{ move, moveObj, source, timestamp, state }` upon move execution.
  2. **Source Metadata Tagging**: Tag all move invocations with explicit source metadata:
     - `'user'`: Manual 3D simulator turns and keyboard shortcuts.
     - `'setup'`: Automated case preparation moves for algorithm trainers.
     - `'scramble'`: Timer or manual randomizer turns.
     - `'algorithm'`: Solution player or automated demonstration playback.
  3. **Event Filtering in Trainers**: Trainer panels subscribe to `simulatorController.onMove` and strictly filter for `event.source === 'user'`. Setup moves dispatched with `source: 'setup'` are completely isolated from user attempt scoring.
  4. **Pure Mistake Classification**: `mistakeDetection.js` classifies mistakes into structured types (`CORRECT`, `WRONG_DIRECTION`, `WRONG_FACE`, `INCOMPLETE_DOUBLE`, `DIVERGENCE`, `SKIPPED`) with natural-language hints without mutating cube state or auto-correcting the user.
  5. **Separate Skip Tracking**: Added `MISTAKE_TYPES.SKIPPED` to allow learners to skip difficult prompts or cases without artificially inflating accuracy or corrupting mistake statistics.
- **Alternatives Considered**:
  - Polling `SimulatorController.cubeState`: Rejected because rapid turns could miss intermediate states and lacked direction/intent context.
  - Intercepting DOM keydown/click events: Rejected because it bypasses 3D cube face clicks and violates the single authoritative simulator pipeline.
- **Consequences**:
  Accurate drill evaluation, complete isolation between automated cube setup and learner moves, reliable streak/accuracy metrics, and zero duplicate cube logic.

---

## ADR-0012: Browser-Side Camera Scanner Architecture, Geometric Variance Detection & Quality Machine
- **Date**: 2026-09-20
- **Status**: Accepted
- **Context**:
  Phase 7A requires scanning a physical Rubik's Cube face via camera in the browser. Large computer vision / ML models (such as YOLO or heavy neural networks) would introduce massive download sizes (50MB+), WebAssembly/shader compilation overhead, and potential browser compatibility issues. Furthermore, running frame-by-frame analysis in React components would trigger 30–60 re-renders per second, causing severe UI lag.
- **Decision**:
  1. **Isolated Camera Stream Lifecycle**: `CameraController` isolates `navigator.mediaDevices.getUserMedia`, stream track lifecycle, facingMode switching, and explicit track release on component unmount and tab-switch.
  2. **Lightweight Geometric Detection**: `FaceDetector` computes row and column perceptual brightness variance across an offscreen canvas to locate high-contrast square regions without any machine learning dependency.
  3. **Border-Inset Grid Sampling**: `GridDetector` and `ColorSampler` compute 9 logical cells in row-major order with border-inset margins, averaging 5×5 center pixel blocks to avoid contamination from black plastic grid lines.
  4. **Pure HSL Color Classification**: `ColorClassifier` maps RGB to HSL and uses chromatic hue ranges and saturation/lightness thresholds to classify the 6 canonical cube colors honestly with confidence scores.
  5. **Offscreen Canvas & RAF Scheduling**: `useScannerEngine` runs the video extraction and overlay rendering via `requestAnimationFrame` on canvas using persistent refs. React state updates are throttled (>= 120ms or on quality change) to ensure zero re-render overhead during 60 FPS live preview.
  6. **Quality State Machine & Stability**: `ScanQuality` derives state (`SEARCHING`, `DETECTED`, `ALIGNING`, `READY`, `CAPTURED`, `LOW_LIGHT`, `POOR_ALIGNMENT`, `LOW_CONFIDENCE`) and enforces a 12-frame stability threshold (~400ms) before allowing capture.
- **Alternatives Considered**:
  - Client-side ML object detection model: Rejected due to heavy payload and latency overhead.
  - Server-side image streaming: Rejected to maintain client-side processing without continuous backend network bandwidth requirements.
- **Consequences**:
  Zero heavy dependencies, fast 60fps canvas preview without React re-render churn, reliable single-face capture payload, and clean separation between camera I/O and reconstruction.

---

## ADR-0013: Six-Face Scanning Session State Machine, Deterministic Reconstruction, and Simulator/Solver Handoff
- **Date**: 2026-09-20
- **Status**: Accepted
- **Context**:
  Phase 7B builds on Phase 7A's single-face scanner to scan all 6 faces, reconstruct a 54-facelet representation, validate physical solvability, and hand off the state to the 3D Simulator, Solver, and Manual Editor. Duplicating cube representation or writing a second validation engine would violate ADR-0002.
- **Decision**:
  1. **Fixed Center Color Identification**: Fixed centers on physical 3×3 cubes (`white -> U`, `red -> R`, `green -> F`, `yellow -> D`, `orange -> L`, `blue -> B`) serve as the single authoritative face identifier.
  2. **Session State Machine**: `ScannerSessionController` manages the 6-face sequence (`U -> R -> F -> D -> L -> B`), detects duplicate or mismatched center captures, provides single-face review before committing, and supports individual face rescan.
  3. **Deterministic 54-Facelet Assembler**: `CubeReconstructor` maps 6 faces (each 9 facelets in row-major order) to the canonical Kociemba standard array: `U (0..8)`, `R (9..17)`, `F (18..26)`, `D (27..35)`, `L (36..44)`, `B (45..53)`.
  4. **Authoritative Validation Reuse**: Reconstructed facelets are evaluated directly by `validation.js` across all 7 physical tiers (symbols, 9-count frequencies, centers, impossible/duplicate cubies, twist parity, flip parity, permutation parity).
  5. **Diagnostic Guidance**: Identifies over/under-represented colors and suggests specific faces to rescan when validation fails.
  6. **Direct Handoff**: The validated `CubeState` instance is passed directly to `onLoadIntoSimulator`, `onOpenSolver`, and `onOpenEditor` without intermediate conversion layers.
- **Alternatives Considered**:
  - Separate scanner-specific validation rules: Rejected to ensure only 100% physically solvable states reach the simulator/solver.
  - Forcing full 6-face restart on single error: Rejected in favor of individual face rescan from the 2D Net review.
- **Consequences**:
  Deterministic assembly, single authoritative `CubeState` shared across Simulator and Solver, robust error feedback, and zero state duplication.


