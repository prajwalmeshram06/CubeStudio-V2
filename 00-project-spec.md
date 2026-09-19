# CubeStudio V2 — Project Specification

## 1. Vision
CubeStudio V2 is a full-stack Rubik's Cube platform for simulation, solving, training, analysis, speedcubing, and future puzzle support.

This is a complete new implementation. The legacy CubeStudio repository is reference-only.

### Core principle
> **CubeState is the single source of truth for cube state.**

## 2. Goals

### Core
- CubeState representation
- Sticker/cubie representation
- Consistent face/color definitions
- Move representation and notation
- All 18 standard 3×3 moves
- Algorithm parsing
- Move application
- Scramble generation
- Solved-state detection
- Validation
- Serialization/deserialization
- History and undo/redo

### Simulator
- Interactive Three.js 3D cube
- Mouse, keyboard, and touch controls
- Face turns and animations
- Move queue
- Scramble/reset/undo/redo
- Move counter
- Keyboard shortcuts
- Shareable scrambles

### Editor
- 2D cube net
- Sticker editing
- Color palette
- Clear/reset
- Validation
- Import/export
- Random valid-state generation where supported

### Solver
- Validation
- Facelet conversion
- Kociemba solving
- Structured solutions
- Move count
- Solution player
- Hints
- Error handling

### Timer
- Inspection
- WCA-style timing
- +2/DNF
- Scrambles
- Solve history
- Ao5/Ao12/Ao50/Ao100
- Best/average/improvement
- Graphs
- Export

### Training
- Beginner curriculum
- Notation/move/algorithm trainers
- CFOP
- Mistake detection
- Practice validation
- Progress tracking

### Advanced
- Camera scanner
- Algorithm library
- Cube analysis
- Solution optimization
- PWA/mobile
- Authentication/cloud
- AI coach
- Sharing/social
- Additional puzzles

## 3. Non-functional requirements
Prioritize correctness, deterministic behavior, maintainability, testability, performance, accessibility, responsive UI, clear APIs, safe errors, and explicit state boundaries.

## 4. State rules
1. CubeState owns logical cube state.
2. Cube Engine performs cube transformations.
3. Renderer visualizes CubeState; it does not own logical state.
4. UI dispatches actions rather than implementing cube algorithms.
5. Editor modifies CubeState through domain APIs.
6. Scanner produces CubeState after validation.
7. Solver consumes validated CubeState.
8. Timer/session data remains separate from CubeState.
9. Backend APIs use explicit schemas.
10. Feature state must not duplicate the complete cube.

## 5. Acceptance
A feature is complete only when its behavior, boundaries, tests, errors, integration, responsive behavior, and documentation are addressed.

## 6. Development order
1. Foundation + Cube Engine
2. Cube Engine tests
3. Renderer + Simulator
4. Editor + Validation
5. Backend + Solver
6. Solution Player + Hints
7. UI/UX
8. Reliability/testing
9. Scanner
10. Timer/statistics
11. Training
12. Algorithm Library
13. Cube Analysis
14. Optimization
15. PWA/mobile
16. Auth/cloud
17. AI Coach
18. Sharing/social
19. Additional puzzles

## 7. Engineering rule
When a feature is difficult, fix the appropriate domain/service layer rather than adding UI-specific workarounds.

> **Build the cube engine correctly first. Build everything else on top of it.**
