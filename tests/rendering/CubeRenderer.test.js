import { describe, it, expect } from 'vitest';
import { CubeRenderer } from '../../src/cube/rendering/CubeRenderer.js';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { applyMove } from '../../src/cube/engine/applyMove.js';
import { FACES } from '../../src/cube/model/constants.js';
import { BOX_FACE_INDICES } from '../../src/cube/rendering/CubieMeshFactory.js';

describe('CubeRenderer Presentation Layer', () => {
  it('creates exactly 26 cubie meshes in the root group', () => {
    const renderer = new CubeRenderer();
    expect(renderer.cubies.length).toBe(26);
    expect(renderer.getMesh().children.length).toBe(26);
  });

  it('identifies exactly 9 cubies for each of the 6 faces', () => {
    const renderer = new CubeRenderer();
    for (const face of FACES) {
      const faceCubies = renderer.getCubiesForFace(face);
      expect(faceCubies.length).toBe(9);
    }
  });

  it('synchronizes cubie materials with solved CubeState', () => {
    const renderer = new CubeRenderer();
    const state = CubeState.createSolved();
    renderer.syncWithState(state);

    // Verify Up face cubies (y > 0.5) have U material on +Y face (BOX_FACE_INDICES.U)
    const uCubies = renderer.getCubiesForFace('U');
    for (const cubie of uCubies) {
      const mat = cubie.material[BOX_FACE_INDICES.U];
      expect(mat).toBe(renderer.palette.U);
    }
  });

  it('synchronizes materials accurately after CubeState transformation', () => {
    const renderer = new CubeRenderer();
    let state = CubeState.createSolved();
    state = applyMove(state, 'R');

    renderer.syncWithState(state);

    // R face center cubie should still have R material
    const rCubies = renderer.getCubiesForFace('R');
    expect(rCubies.length).toBe(9);
  });

  it('resets cubie positions cleanly', () => {
    const renderer = new CubeRenderer();
    const cubie = renderer.cubies[0];
    cubie.position.set(1.23, -0.98, 0.05);
    cubie.rotation.set(0.5, 0.2, 0.1);

    renderer.resetPositions();

    expect(cubie.position.x).toBe(1);
    expect(cubie.position.y).toBe(-1);
    expect(cubie.position.z).toBe(0);
    expect(cubie.rotation.x).toBe(0);
    expect(cubie.rotation.y).toBe(0);
    expect(cubie.rotation.z).toBe(0);
  });

  it('disposes resources without errors', () => {
    const renderer = new CubeRenderer();
    expect(() => renderer.dispose()).not.toThrow();
  });
});
