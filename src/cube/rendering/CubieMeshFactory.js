/**
 * CubeStudio V2 - Cubie Mesh Factory
 * Creates the 26 cubie meshes with individual face materials mapped to CubeState facelets.
 */

import * as THREE from 'three';
import { RENDER_HEX } from './colors.js';
import { FACES } from '../model/constants.js';

/**
 * Three.js BoxGeometry material indices:
 * 0: +X (R - Right)
 * 1: -X (L - Left)
 * 2: +Y (U - Up)
 * 3: -Y (D - Down)
 * 4: +Z (F - Front)
 * 5: -Z (B - Back)
 */
export const BOX_FACE_INDICES = Object.freeze({
  R: 0,
  L: 1,
  U: 2,
  D: 3,
  F: 4,
  B: 5
});

/**
 * Maps cubie position (x, y, z) to facelet index (0..8) on each face.
 * x, y, z in {-1, 0, 1}
 */
export function getFaceletLocalIndex(face, x, y, z) {
  switch (face) {
    case 'U': // y = 1. Looking from top, -z is top, +z is bottom, -x is left, +x is right
      return (z + 1) * 3 + (x + 1);
    case 'D': // y = -1. Looking from bottom with F(+z) at top: row = 1 - z, col = x + 1
      return (1 - z) * 3 + (x + 1);
    case 'F': // z = 1. Looking at F: +y is top, -y is bottom, -x is left, +x is right
      return (1 - y) * 3 + (x + 1);
    case 'B': // z = -1. Looking at B: +y is top, -y is bottom, +x is left, -x is right
      return (1 - y) * 3 + (1 - x);
    case 'L': // x = -1. Looking at L: +y is top, -y is bottom, -z is left, +z is right
      return (1 - y) * 3 + (z + 1);
    case 'R': // x = 1. Looking at R: +y is top, -y is bottom, +z is left, -z is right
      return (1 - y) * 3 + (1 - z);
    default:
      return null;
  }
}

/**
 * Creates reusable materials for sticker colors and internal plastic.
 */
export function createMaterialPalette() {
  const materials = {};

  for (const face of FACES) {
    materials[face] = new THREE.MeshStandardMaterial({
      color: RENDER_HEX[face],
      roughness: 0.25,
      metalness: 0.05
    });
  }

  materials.INTERNAL = new THREE.MeshStandardMaterial({
    color: RENDER_HEX.INTERNAL,
    roughness: 0.8,
    metalness: 0.1
  });

  return materials;
}

/**
 * Creates the 26 cubie meshes for a 3x3 Rubik's cube.
 * @param {object} palette - Material palette
 * @returns {THREE.Mesh[]}
 */
export function createCubieMeshes(palette = createMaterialPalette()) {
  const cubies = [];
  const cubieSize = 0.96;
  const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // Skip invisible center core
        if (x === 0 && y === 0 && z === 0) continue;

        // Build array of 6 materials for this cubie
        const cubieMaterials = [
          x === 1 ? palette.R : palette.INTERNAL,  // +X (R)
          x === -1 ? palette.L : palette.INTERNAL, // -X (L)
          y === 1 ? palette.U : palette.INTERNAL,  // +Y (U)
          y === -1 ? palette.D : palette.INTERNAL, // -Y (D)
          z === 1 ? palette.F : palette.INTERNAL,  // +Z (F)
          z === -1 ? palette.B : palette.INTERNAL  // -Z (B)
        ];

        const mesh = new THREE.Mesh(geometry, cubieMaterials);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Store initial position coordinates for sticker mapping
        mesh.userData = {
          initialCoords: { x, y, z },
          currentCoords: { x, y, z },
          isCubie: true
        };

        cubies.push(mesh);
      }
    }
  }

  return cubies;
}
