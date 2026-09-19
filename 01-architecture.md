# CubeStudio V2 — Architecture

## 1. Philosophy
Use a layered architecture with a pure cube domain at its center.

```text
UI / Feature Controllers
        ↓
Cube Domain / Services
        ↓
Pure Cube Engine
        ↓
CubeState
```

## 2. Recommended structure
```text
src/
├── app/
│   ├── App.js
│   ├── router.js
│   └── providers/
├── cube/
│   ├── model/
│   │   ├── CubeState.js
│   │   ├── stickers.js
│   │   ├── cubies.js
│   │   ├── moves.js
│   │   └── notation.js
│   ├── engine/
│   │   ├── applyMove.js
│   │   ├── scramble.js
│   │   ├── history.js
│   │   └── validation.js
│   └── rendering/
│       ├── CubeScene.js
│       ├── CubeRenderer.js
│       └── animation.js
├── features/
│   ├── simulator/
│   ├── editor/
│   ├── solver/
│   ├── scanner/
│   ├── timer/
│   └── training/
├── ui/
│   ├── components/
│   ├── layout/
│   └── theme/
└── services/
    └── solverApi.js
```

The structure may evolve when an architectural decision justifies it.

## 3. Dependency direction
```text
UI
 ↓
Feature Controllers
 ↓
Cube Domain / Services
 ↓
Pure Cube Engine
```

The cube engine must not depend on UI, browser events, Three.js, or backend code.

## 4. State ownership
### CubeState
Owns the logical cube configuration.

### Cube Engine
Owns moves, algorithms, validation, scrambles, and transformations.

### History
Owns undo/redo position and move history.

### Renderer
Owns Three.js scene objects, camera, lights, meshes, and animation state only.

### Feature state
May own timer state, training progress, playback position, scanner confidence, and UI preferences, but must not duplicate the whole cube.

## 5. Backend boundary
```text
CubeState
   ↓
serialization
   ↓
API
   ↓
Flask
   ↓
validation
   ↓
Kociemba/service
   ↓
structured response
```

The backend does not own browser simulator state.

## 6. Renderer boundary
```text
CubeState
   ↓
renderer adapter
   ↓
Three.js scene
   ↓
animation
   ↓
screen
```

User interaction should produce domain actions, not arbitrary mesh mutations.

## 7. Avoid
- giant main.js
- giant UI components
- global mutable cube state
- duplicated move logic
- scattered event listeners
- feature logic inside rendering code
- hardcoded page behavior

## 8. Architecture decisions
Record significant decisions in `docs/ARCHITECTURE-DECISIONS.md` with:
- context
- decision
- alternatives
- reason
- consequences

## 9. Evolution
Avoid premature complexity. TypeScript, state libraries, or additional services may be introduced later only when justified.
