# Legacy Feature Mapping — CubeStudio V2

## Overview
This document tracks features from the legacy CubeStudio repository (`https://github.com/prajwalmeshram06/CubeStudio`) and maps them to clean V2 architectural designs.

> **Principle**: The legacy repository answers *what existed*; the new specifications answer *what V2 should become*. V2 does not duplicate legacy architecture or code.

> [!NOTE]
> **Historical Roadmap Reference**: Early project drafts assigned different phase numbers to several features (e.g. Timer as Phase 8, Training as Phase 9). The authoritative reconciled roadmap established in Phase 8 groups features as:
> - Timer + Statistics: **Phase 5**
> - Training System: **Phase 6A** (Beginner Curriculum) & **Phase 6B** (Trainers & CFOP)
> - Camera Scanner: **Phase 7A** (Foundation) & **Phase 7B** (Reconstruction)
> - Documentation Reconciliation: **Phase 8**
> - Future Features: **Phase 9+** (Algorithm Library, Cube Analysis, Auth/Cloud, etc.)

| Existing Feature | Legacy Implementation | V2 Architecture / Design | Current Status |
|---|---|---|---|
| 3D Simulator | Monolithic script / Three.js coupling | Pure CubeState -> Three.js Presentation Adapter (`src/cube/rendering/`) & Simulator Controller | Completed (Phase 1) |
| Cube State Logic | Scattered in UI/Renderer | Pure Cube Engine (`src/cube/model/` & `src/cube/engine/`) | Completed (Phase 0) |
| Manual 2D Editor | Direct DOM edits | Net editor component modifying CubeState via domain APIs (`src/features/editor/`) | Completed (Phase 2) |
| Solver | Direct HTTP calls in UI | Domain-abstracted Solver Service calling Flask REST API (`/api/v1/solve`) | Completed (Phase 3) |
| Solution Player | Renderer-specific move execution | Headless state machine coordinating with 3D Simulator (`src/features/solver/`) | Completed (Phase 4) |
| Speedcubing Timer | Basic JS timer | High-resolution monotonic timer with WCA inspection, penalties & stats (`src/features/timer/`) | Completed (Phase 5; historically drafted as Phase 8) |
| Training / Lessons | Hardcoded sequences | Guided beginner curriculum + Move/Notation/Algorithm trainers (`src/features/training/`) | Completed (Phase 6A & 6B; historically drafted as Phase 9) |
| Camera Scanner | OpenCV experimental script | Structured image pipeline producing validated CubeState (`src/features/scanner/`) | Completed (Phase 7A & 7B; physical camera test pending) |
| Algorithm Library | Unstructured lists | Structured catalog with search, filtering, and triggers | Planned (Phase 9) |
| Auth & Cloud | Basic local storage | Cloud sync, user accounts, solve backup | Planned (Phase 13; historically drafted as Phase 8) |
