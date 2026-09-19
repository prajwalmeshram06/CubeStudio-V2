# Legacy Feature Mapping — CubeStudio V2

## Overview
This document tracks features from the legacy CubeStudio repository (`https://github.com/prajwalmeshram06/CubeStudio`) and maps them to clean V2 architectural designs.

> **Principle**: The legacy repository answers *what existed*; the new specifications answer *what V2 should become*. V2 does not duplicate legacy architecture or code.

| Existing Feature | Legacy Implementation | V2 Architecture / Design | Status |
|---|---|---|---|
| 3D Simulator | Monolithic script / Three.js coupling | Pure CubeState -> Three.js Presentation Adapter (`src/cube/rendering/`) & Simulator Controller | Completed (Phase 1) |
| Cube State Logic | Scattered in UI/Renderer | Pure Cube Engine (`src/cube/model/` & `src/cube/engine/`) | Completed (Phase 0) |
| Manual 2D Editor | Direct DOM edits | Net editor component modifying CubeState via domain APIs | Planned (Phase 2) |
| Solver | Direct HTTP calls in UI | Domain-abstracted Solver Service calling Flask REST API (`/api/v1/solve`) | Planned (Phase 3) |
| Solution Player | Renderer-specific move execution | Reusable move execution pipeline using pure Cube Engine | Planned (Phase 4) |
| Timer | Basic JS timer | High-resolution monotonic timer with WCA inspection, penalties & stats | Planned (Phase 8) |
| Training / Lessons | Hardcoded sequences | Curriculum engine with mistake detection & step validation | Planned (Phase 9) |
| Scanner | OpenCV experimental script | Structured image pipeline producing validated CubeState | Planned (Phase 7) |
