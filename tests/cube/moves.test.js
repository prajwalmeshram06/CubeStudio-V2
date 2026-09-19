import { describe, it, expect } from 'vitest';
import {
  Move,
  createMove,
  inverseMove,
  isSameFace,
  isOppositeFace,
  composeMoves
} from '../../src/cube/model/moves.js';
import { FACES } from '../../src/cube/model/constants.js';

describe('Move Model', () => {
  it('creates valid standard moves', () => {
    const r = new Move('R', 1);
    expect(r.face).toBe('R');
    expect(r.amount).toBe(1);
    expect(r.direction).toBe(1);
    expect(r.notation).toBe('R');

    const rPrime = new Move('R', 3);
    expect(rPrime.amount).toBe(3);
    expect(rPrime.direction).toBe(-1);
    expect(rPrime.notation).toBe("R'");

    const rDouble = new Move('R', 2);
    expect(rDouble.amount).toBe(2);
    expect(rDouble.direction).toBe(2);
    expect(rDouble.notation).toBe('R2');
  });

  it('normalizes negative and wrap-around amounts', () => {
    const moveNeg = createMove('U', -1);
    expect(moveNeg.amount).toBe(3);
    expect(moveNeg.notation).toBe("U'");

    const moveWrap = new Move('F', 5);
    expect(moveWrap.amount).toBe(1);
    expect(moveWrap.notation).toBe('F');
  });

  it('rejects invalid face names', () => {
    expect(() => new Move('X', 1)).toThrow(/Invalid face/);
    expect(() => new Move('', 1)).toThrow(/Invalid face/);
  });

  it('rejects zero rotation amount', () => {
    expect(() => new Move('U', 0)).toThrow(/Invalid move amount 0/);
    expect(() => new Move('U', 4)).toThrow(/Invalid move amount 0/);
  });

  it('inverts moves correctly', () => {
    expect(createMove('R', 1).inverse().notation).toBe("R'");
    expect(createMove('R', 3).inverse().notation).toBe('R');
    expect(createMove('R', 2).inverse().notation).toBe('R2');
    expect(inverseMove(createMove('U', -1)).notation).toBe('U');
  });

  it('detects same face and opposite face relationships', () => {
    const u = createMove('U', 1);
    const uPrime = createMove('U', 3);
    const d = createMove('D', 1);
    const r = createMove('R', 1);

    expect(isSameFace(u, uPrime)).toBe(true);
    expect(isSameFace(u, d)).toBe(false);

    expect(isOppositeFace(u, d)).toBe(true);
    expect(isOppositeFace(u, r)).toBe(false);
  });

  it('composes moves on the same face', () => {
    const r1 = createMove('R', 1);
    const r2 = createMove('R', 1);
    const comp1 = composeMoves(r1, r2);
    expect(comp1.notation).toBe('R2');

    const comp2 = composeMoves(r1, createMove('R', 2));
    expect(comp2.notation).toBe("R'");

    // R + R' should cancel to identity (null)
    const cancel = composeMoves(r1, createMove('R', -1));
    expect(cancel).toBeNull();
  });

  it('throws when composing moves on different faces', () => {
    expect(() => composeMoves(createMove('R', 1), createMove('U', 1))).toThrow(
      /Cannot compose moves on different faces/
    );
  });
});
