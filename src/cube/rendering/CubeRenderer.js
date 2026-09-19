/**
 * CubeStudio V2 - CubeRenderer
 * Presentation layer component: converts CubeState into 3D Three.js mesh visualization.
 * It NEVER owns logical cube state.
 */

import * as THREE from 'three';
import {
  createMaterialPalette,
  createCubieMeshes,
  getFaceletLocalIndex,
  BOX_FACE_INDICES
} from './CubieMeshFactory.js';
import { FACES } from '../model/constants.js';

export class CubeRenderer {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.palette = createMaterialPalette();
    this.cubies = createCubieMeshes(this.palette);

    this.group = new THREE.Group();
    this.group.name = 'RubiksCube';

    for (const cubie of this.cubies) {
      this.group.add(cubie);
    }
  }

  /**
   * Returns the Three.js root object for the cube.
   * @returns {THREE.Group}
   */
  getMesh() {
    return this.group;
  }

  /**
   * Retrieves the 9 cubie meshes currently located on a given face.
   * @param {string} face - 'U'|'R'|'F'|'D'|'L'|'B'
   * @returns {THREE.Mesh[]}
   */
  getCubiesForFace(face) {
    const threshold = 0.5;
    return this.cubies.filter(cubie => {
      const pos = cubie.position;
      switch (face) {
        case 'U': return pos.y > threshold;
        case 'D': return pos.y < -threshold;
        case 'R': return pos.x > threshold;
        case 'L': return pos.x < -threshold;
        case 'F': return pos.z > threshold;
        case 'B': return pos.z < -threshold;
        default: return false;
      }
    });
  }

  /**
   * Synchronizes visual sticker colors with an authoritative CubeState.
   * Ensures zero state drift between logical cube and 3D presentation.
   * @param {import('../model/CubeState.js').CubeState} cubeState
   */
  syncWithState(cubeState) {
    if (!cubeState) return;

    for (const cubie of this.cubies) {
      const x = Math.round(cubie.position.x);
      const y = Math.round(cubie.position.y);
      const z = Math.round(cubie.position.z);

      // Clone or clone-shallow the materials array for individual cubie assignment if needed
      const mats = [...cubie.material];

      // +X (R)
      if (x === 1) {
        const localIdx = getFaceletLocalIndex('R', x, y, z);
        const faceletVal = cubeState.getSticker('R', localIdx);
        mats[BOX_FACE_INDICES.R] = this.palette[faceletVal] || this.palette.R;
      } else {
        mats[BOX_FACE_INDICES.R] = this.palette.INTERNAL;
      }

      // -X (L)
      if (x === -1) {
        const localIdx = getFaceletLocalIndex('L', x, y, z);
        const faceletVal = cubeState.getSticker('L', localIdx);
        mats[BOX_FACE_INDICES.L] = this.palette[faceletVal] || this.palette.L;
      } else {
        mats[BOX_FACE_INDICES.L] = this.palette.INTERNAL;
      }

      // +Y (U)
      if (y === 1) {
        const localIdx = getFaceletLocalIndex('U', x, y, z);
        const faceletVal = cubeState.getSticker('U', localIdx);
        mats[BOX_FACE_INDICES.U] = this.palette[faceletVal] || this.palette.U;
      } else {
        mats[BOX_FACE_INDICES.U] = this.palette.INTERNAL;
      }

      // -Y (D)
      if (y === -1) {
        const localIdx = getFaceletLocalIndex('D', x, y, z);
        const faceletVal = cubeState.getSticker('D', localIdx);
        mats[BOX_FACE_INDICES.D] = this.palette[faceletVal] || this.palette.D;
      } else {
        mats[BOX_FACE_INDICES.D] = this.palette.INTERNAL;
      }

      // +Z (F)
      if (z === 1) {
        const localIdx = getFaceletLocalIndex('F', x, y, z);
        const faceletVal = cubeState.getSticker('F', localIdx);
        mats[BOX_FACE_INDICES.F] = this.palette[faceletVal] || this.palette.F;
      } else {
        mats[BOX_FACE_INDICES.F] = this.palette.INTERNAL;
      }

      // -Z (B)
      if (z === -1) {
        const localIdx = getFaceletLocalIndex('B', x, y, z);
        const faceletVal = cubeState.getSticker('B', localIdx);
        mats[BOX_FACE_INDICES.B] = this.palette[faceletVal] || this.palette.B;
      } else {
        mats[BOX_FACE_INDICES.B] = this.palette.INTERNAL;
      }

      cubie.material = mats;
    }
  }

  /**
   * Resets all cubies to clean integer grid positions and removes any residual rotations.
   */
  resetPositions() {
    for (const cubie of this.cubies) {
      cubie.position.set(
        Math.round(cubie.position.x),
        Math.round(cubie.position.y),
        Math.round(cubie.position.z)
      );
      cubie.rotation.set(0, 0, 0);
      cubie.updateMatrix();
    }
  }

  /**
   * Disposes of Three.js geometries and materials to avoid memory leaks.
   */
  dispose() {
    for (const cubie of this.cubies) {
      if (cubie.geometry) cubie.geometry.dispose();
    }
    for (const key of Object.keys(this.palette)) {
      this.palette[key].dispose();
    }
  }
}
