import { describe, it, expect } from 'vitest';
import { detectMoveMistake, detectSequenceDivergence, MISTAKE_TYPES } from '../../../src/features/training/mistakeDetection.js';

describe('mistakeDetection - Single Move Validation', () => {
  it('identifies exact correct moves', () => {
    const res = detectMoveMistake('R', 'R');
    expect(res.isCorrect).toBe(true);
    expect(res.type).toBe(MISTAKE_TYPES.CORRECT);
  });

  it('detects wrong direction (prime inverse)', () => {
    const res = detectMoveMistake('R', "R'");
    expect(res.isCorrect).toBe(false);
    expect(res.type).toBe(MISTAKE_TYPES.WRONG_DIRECTION);
    expect(res.expected).toBe('R');
    expect(res.actual).toBe("R'");
  });

  it('detects wrong amount (double vs single turn)', () => {
    const res = detectMoveMistake('R', 'R2');
    expect(res.isCorrect).toBe(false);
    expect(res.type).toBe(MISTAKE_TYPES.WRONG_AMOUNT);
  });

  it('detects wrong face', () => {
    const res = detectMoveMistake('U', 'F');
    expect(res.isCorrect).toBe(false);
    expect(res.type).toBe(MISTAKE_TYPES.WRONG_FACE);
  });

  it('handles missing input gracefully', () => {
    const res = detectMoveMistake('R', null);
    expect(res.isCorrect).toBe(false);
    expect(res.type).toBe(MISTAKE_TYPES.MISSING_MOVE);
  });
});

describe('mistakeDetection - Sequence Divergence Validation', () => {
  const SUNE = "R U R' U R U2 R'";

  it('validates a complete and correct sequence', () => {
    const moves = ['R', 'U', "R'", 'U', 'R', 'U2', "R'"];
    const res = detectSequenceDivergence(SUNE, moves);
    expect(res.isComplete).toBe(true);
    expect(res.isCorrect).toBe(true);
    expect(res.type).toBe(MISTAKE_TYPES.CORRECT);
    expect(res.divergenceIndex).toBeNull();
  });

  it('validates correct in-progress sequence', () => {
    const moves = ['R', 'U', "R'"];
    const res = detectSequenceDivergence(SUNE, moves);
    expect(res.isComplete).toBe(false);
    expect(res.isCorrect).toBe(true);
    expect(res.expectedMove).toBe('U');
  });

  it('identifies exact divergence location on mistake', () => {
    const moves = ['R', 'U', "R'", 'U', "R'"]; // 5th move is R' instead of R
    const res = detectSequenceDivergence(SUNE, moves);
    expect(res.isComplete).toBe(false);
    expect(res.isCorrect).toBe(false);
    expect(res.divergenceIndex).toBe(4);
    expect(res.expectedMove).toBe('R');
    expect(res.actualMove).toBe("R'");
  });

  it('identifies extra move performed after sequence completion', () => {
    const moves = ['R', 'U', "R'", 'U', 'R', 'U2', "R'", 'U'];
    const res = detectSequenceDivergence(SUNE, moves);
    expect(res.isComplete).toBe(false);
    expect(res.isCorrect).toBe(false);
    expect(res.type).toBe(MISTAKE_TYPES.EXTRA_MOVE);
    expect(res.divergenceIndex).toBe(7);
  });
});
