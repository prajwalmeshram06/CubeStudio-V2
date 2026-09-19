/**
 * CubeStudio V2 - Move Animator
 * Animates 3D face turns smoothly using Three.js pivot groups.
 */

import * as THREE from 'three';

const FACE_ROTATION_AXIS = Object.freeze({
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  R: new THREE.Vector3(1, 0, 0),
  L: new THREE.Vector3(-1, 0, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1)
});

// Cubic ease-out function: 1 - (1 - t)^3
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export class MoveAnimator {
  /**
   * @param {object} [options]
   * @param {number} [options.defaultDuration=250] - Default animation duration in ms
   */
  constructor(options = {}) {
    this.defaultDuration = options.defaultDuration ?? 250;
    this.isAnimating = false;
    this._currentAnimation = null;
  }

  /**
   * Animates a single move on the CubeRenderer.
   * @param {import('./CubeRenderer.js').CubeRenderer} renderer
   * @param {import('../model/moves.js').Move} move
   * @param {number} [duration] - Animation duration in ms (0 for instant)
   * @returns {Promise<void>}
   */
  animate(renderer, move, duration = this.defaultDuration) {
    if (this.isAnimating) {
      return Promise.reject(new Error('Animation already in progress'));
    }

    const cubies = renderer.getCubiesForFace(move.face);
    if (cubies.length === 0) {
      return Promise.resolve();
    }

    // Instant execution if duration <= 0
    if (duration <= 0) {
      this._applyInstantRotation(renderer, cubies, move);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.isAnimating = true;

      // Create a temporary pivot group centered at (0, 0, 0)
      const pivot = new THREE.Group();
      pivot.name = `Pivot_${move.face}`;
      renderer.getMesh().add(pivot);

      // Attach the 9 face cubies to the pivot
      for (const cubie of cubies) {
        pivot.attach(cubie);
      }

      const axis = FACE_ROTATION_AXIS[move.face];
      // Clockwise rotation looking at face is -PI/2
      let totalAngle = -Math.PI / 2;
      if (move.amount === 2) {
        totalAngle = -Math.PI;
      } else if (move.amount === 3) {
        totalAngle = Math.PI / 2;
      }

      let startTime = null;
      let lastAngle = 0;

      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        const currentTargetAngle = totalAngle * eased;
        const deltaAngle = currentTargetAngle - lastAngle;

        pivot.rotateOnAxis(axis, deltaAngle);
        lastAngle = currentTargetAngle;

        if (progress < 1) {
          this._currentAnimation = requestAnimationFrame(step);
        } else {
          // Finish animation
          this._finalizeRotation(renderer, pivot, cubies);
          this.isAnimating = false;
          this._currentAnimation = null;
          resolve();
        }
      };

      this._currentAnimation = requestAnimationFrame(step);
    });
  }

  /**
   * Applies an instant rotation without visual tweening.
   */
  _applyInstantRotation(renderer, cubies, move) {
    const pivot = new THREE.Group();
    renderer.getMesh().add(pivot);

    for (const cubie of cubies) {
      pivot.attach(cubie);
    }

    const axis = FACE_ROTATION_AXIS[move.face];
    let totalAngle = -Math.PI / 2;
    if (move.amount === 2) totalAngle = -Math.PI;
    if (move.amount === 3) totalAngle = Math.PI / 2;

    pivot.rotateOnAxis(axis, totalAngle);
    this._finalizeRotation(renderer, pivot, cubies);
  }

  /**
   * Cleans up the pivot and re-attaches cubies to the main cube group.
   */
  _finalizeRotation(renderer, pivot, cubies) {
    const mainGroup = renderer.getMesh();
    for (const cubie of cubies) {
      mainGroup.attach(cubie);
      cubie.position.set(
        Math.round(cubie.position.x),
        Math.round(cubie.position.y),
        Math.round(cubie.position.z)
      );
    }
    mainGroup.remove(pivot);
    renderer.resetPositions();
  }

  /**
   * Cancels any currently running animation immediately.
   */
  cancel() {
    if (this._currentAnimation) {
      cancelAnimationFrame(this._currentAnimation);
      this._currentAnimation = null;
    }
    this.isAnimating = false;
  }
}
