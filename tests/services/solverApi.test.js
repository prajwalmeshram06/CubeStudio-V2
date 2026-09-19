import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { health, validate, solve, SolverApiError } from '../../src/services/solverApi.js';

describe('solverApi service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('health()', () => {
    it('returns service status on 200 OK', async () => {
      const mockPayload = { status: 'ok', version: '1.0.0', service: 'cubestudio-api' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload
      });

      const res = await health();
      expect(res).toEqual(mockPayload);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/api/v1/health');
    });

    it('throws SolverApiError on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(health()).rejects.toThrow(SolverApiError);
      await expect(health()).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        statusCode: null
      });
    });

    it('throws SolverApiError on non-200 HTTP response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { code: 'INTERNAL_ERROR', message: 'Server down' } })
      });

      await expect(health()).rejects.toThrow(SolverApiError);
      await expect(health()).rejects.toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Server down',
        statusCode: 500
      });
    });

    it('handles non-JSON responses with PARSE_ERROR', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => { throw new Error('invalid json'); }
      });

      await expect(health()).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        statusCode: 200
      });
    });
  });

  describe('validate(cubeString)', () => {
    it('sends correct POST payload and returns validation success', async () => {
      const cube = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
      const mockPayload = { valid: true, message: 'Valid' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload
      });

      const res = await validate(cube);
      expect(res).toEqual(mockPayload);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/validate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cube })
        })
      );
    });

    it('throws SolverApiError with 422 status code on invalid cube', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ error: { code: 'INVALID_CUBE', message: 'Invalid symbol' } })
      });

      await expect(validate('BAD_STRING')).rejects.toMatchObject({
        code: 'INVALID_CUBE',
        message: 'Invalid symbol',
        statusCode: 422
      });
    });
  });

  describe('solve(cubeString)', () => {
    it('sends correct POST payload and returns parsed solution object', async () => {
      const cube = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
      const mockPayload = {
        solution: ["R", "U", "R'", "U'"],
        raw: "R U R' U'",
        moveCount: 4
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload
      });

      const res = await solve(cube);
      expect(res).toEqual(mockPayload);
      expect(res.solution).toHaveLength(4);
      expect(res.moveCount).toBe(4);
    });

    it('throws SolverApiError on UNSOLVABLE_CUBE', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ error: { code: 'UNSOLVABLE_CUBE', message: 'Impossible parity' } })
      });

      await expect(solve('UNSOLVABLE')).rejects.toMatchObject({
        code: 'UNSOLVABLE_CUBE',
        statusCode: 422
      });
    });
  });
});
