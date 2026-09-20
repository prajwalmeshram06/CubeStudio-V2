import { describe, it, expect } from 'vitest';
import {
  CFOP_ALGORITHMS,
  CFOP_STAGES,
  getAlgorithmById,
  getAlgorithmsByStage
} from '../../../src/features/training/algorithms/cfopData.js';
import { parseAlgorithm } from '../../../src/cube/model/notation.js';

describe('cfopData Catalog', () => {
  it('contains algorithms for all standard CFOP stages', () => {
    const crossAlgs = getAlgorithmsByStage(CFOP_STAGES.CROSS);
    const f2lAlgs = getAlgorithmsByStage(CFOP_STAGES.F2L);
    const ollAlgs = getAlgorithmsByStage(CFOP_STAGES.OLL);
    const pllAlgs = getAlgorithmsByStage(CFOP_STAGES.PLL);

    expect(crossAlgs.length).toBeGreaterThan(0);
    expect(f2lAlgs.length).toBeGreaterThan(0);
    expect(ollAlgs.length).toBeGreaterThan(0);
    expect(pllAlgs.length).toBeGreaterThan(0);
  });

  it('ensures every algorithm has valid parsable notation and setups', () => {
    CFOP_ALGORITHMS.forEach(alg => {
      expect(alg.id).toBeTruthy();
      expect(alg.name).toBeTruthy();
      expect(alg.stage).toBeTruthy();
      expect(alg.notation).toBeTruthy();
      expect(alg.setup).toBeTruthy();

      const parsedNotation = parseAlgorithm(alg.notation);
      expect(parsedNotation.length).toBeGreaterThan(0);

      const parsedSetup = parseAlgorithm(alg.setup);
      expect(parsedSetup.length).toBeGreaterThan(0);
    });
  });

  it('retrieves specific algorithms by ID', () => {
    const sune = getAlgorithmById('oll-corner-sune');
    expect(sune).toBeDefined();
    expect(sune.notation).toBe("R U R' U R U2 R'");

    const tperm = getAlgorithmById('pll-corner-t-perm');
    expect(tperm).toBeDefined();
    expect(tperm.stage).toBe(CFOP_STAGES.PLL);
  });
});
