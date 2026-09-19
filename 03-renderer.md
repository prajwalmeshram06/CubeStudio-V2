# CubeStudio V2 — Renderer and Simulator Specification

## 1. Purpose
The renderer converts CubeState into an interactive Three.js visualization. It is presentation-only and never owns logical cube state.

## 2. Components
Recommended:
- CubeScene
- CubeRenderer
- CubieFactory
- StickerFactory
- CameraController
- MoveAnimator
- InteractionController

## 3. Pipeline
```text
CubeState
   ↓
Cube geometry
   ↓
Sticker colors
   ↓
Three.js scene
   ↓
Camera / lighting
   ↓
Animation
   ↓
Screen
```

## 4. Interaction
Support orbit/rotation, zoom, mouse, keyboard, touch, face turns, scramble, reset, undo/redo, move counter, and shortcuts.

## 5. Animation
Support quarter, prime, and double turns; queues; rapid input; cancellation/reset; and safe synchronization with CubeState.

Visual animation and logical state must never drift apart.

## 6. Input queue
Define behavior for input during animation, conflicting inputs, reset cancellation, and undo with queued moves.

## 7. Camera
Provide sensible defaults, orbit, zoom limits, reset, responsive framing, and mobile-friendly interaction.

## 8. Performance
Avoid unnecessary geometry recreation, rebuilding the whole scene for each move, duplicate render loops, and expensive DOM updates.

## 9. Tests
Test sticker mapping, solved colors, state synchronization, animations, reset, camera reset, and queued moves.

## 10. Acceptance
A user can open a solved cube, rotate it, make turns, scramble, undo/redo, reset, and perform rapid input without corrupting state.
