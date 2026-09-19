import { describe, it, expect } from 'vitest';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { SOLVED_FACELET_STRING, FACES, FACELET_COUNT } from '../../src/cube/model/constants.js';

describe('CubeState Model', () => {
  it('creates a default solved cube', () => {
    const cube = new CubeState();
    expect(cube.serialize('string')).toBe(SOLVED_FACELET_STRING);
    expect(cube.isSolved()).toBe(true);
  });

  it('creates a solved cube via createSolved factory', () => {
    const cube = CubeState.createSolved();
    expect(cube.isSolved()).toBe(true);
    expect(cube.serialize('string')).toBe(SOLVED_FACELET_STRING);
  });

  it('rejects invalid initialization string lengths', () => {
    expect(() => new CubeState('UUU')).toThrow(/Invalid state string length/);
    expect(() => new CubeState('U'.repeat(55))).toThrow(/Invalid state string length/);
  });

  it('rejects invalid initialization array lengths', () => {
    expect(() => new CubeState(new Array(50))).toThrow(/Invalid state array length/);
  });

  it('clones state independently', () => {
    const original = CubeState.createSolved();
    const clone = original.clone();
    expect(clone.equals(original)).toBe(true);

    // Mutating clone does not mutate original
    clone.setSticker('U', 0, 'R');
    expect(clone.getSticker('U', 0)).toBe('R');
    expect(original.getSticker('U', 0)).toBe('U');
    expect(clone.equals(original)).toBe(false);
  });

  it('correctly reads and sets stickers and faces', () => {
    const cube = CubeState.createSolved();
    expect(cube.getSticker('F', 4)).toBe('F');
    expect(cube.getCenter('F')).toBe('F');

    const uFace = cube.getFace('U');
    expect(uFace).toEqual(Array(9).fill('U'));

    cube.setSticker('F', 0, 'D');
    expect(cube.getSticker('F', 0)).toBe('D');
    expect(cube.isSolved()).toBe(false);

    cube.setFace('F', Array(9).fill('F'));
    expect(cube.isSolved()).toBe(true);
  });

  it('serializes to string, array, and json formats', () => {
    const cube = CubeState.createSolved();

    const str = cube.serialize('string');
    expect(str).toBe(SOLVED_FACELET_STRING);

    const arr = cube.serialize('array');
    expect(arr.length).toBe(FACELET_COUNT);
    expect(arr.join('')).toBe(SOLVED_FACELET_STRING);

    const json = cube.serialize('json');
    expect(Object.keys(json)).toEqual(FACES);
    expect(json.U).toEqual(Array(9).fill('U'));
  });

  it('deserializes from string, array, and json formats', () => {
    const original = CubeState.createSolved();
    original.setSticker('U', 0, 'B');

    const fromStr = CubeState.deserialize(original.serialize('string'));
    expect(fromStr.equals(original)).toBe(true);

    const fromArr = CubeState.deserialize(original.serialize('array'));
    expect(fromArr.equals(original)).toBe(true);

    const fromJson = CubeState.deserialize(original.serialize('json'));
    expect(fromJson.equals(original)).toBe(true);
  });
});
