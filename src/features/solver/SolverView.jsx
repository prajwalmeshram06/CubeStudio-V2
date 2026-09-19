/**
 * SolverView.jsx — React UI for the Solver tab.
 *
 * Displays:
 *  - Current cube state (Kociemba string + local validation)
 *  - Solve button → calls SolverController.solve()
 *  - Solution move list (token chips)
 *  - Error banner
 *  - Backend health badge
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SolverController } from './SolverController.js';
import './solver.css';

/**
 * @param {{
 *   cubeState: import('../../cube/model/CubeState.js').CubeState,
 *   onApplySolution?: (moves: string[]) => void
 * }} props
 */
export function SolverView({ cubeState, onApplySolution }) {
  const controllerRef = useRef(null);

  const [localValid, setLocalValid] = useState(null);  // null | { valid, error }
  const [solving, setSolving] = useState(false);
  const [result, setResult] = useState(null);           // { solution, raw, moveCount } | null
  const [error, setError] = useState(null);             // string | null
  const [health, setHealth] = useState('unknown');      // 'ok' | 'error' | 'unknown' | 'loading'
  const [cubeString, setCubeString] = useState('');

  // ── Sync controller with latest cubeState prop ──────────────
  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new SolverController(cubeState);
    } else {
      controllerRef.current.setCubeState(cubeState);
    }

    const serialized = cubeState.serialize('string');
    setCubeString(serialized);

    const validation = controllerRef.current.validateLocally();
    setLocalValid(validation);

    // Clear stale results when cube changes
    setResult(null);
    setError(null);
  }, [cubeState]);

  // ── Health check on mount ────────────────────────────────────
  useEffect(() => {
    setHealth('loading');
    controllerRef.current = new SolverController(cubeState);
    controllerRef.current.checkHealth()
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Solve ────────────────────────────────────────────────────
  const handleSolve = useCallback(async () => {
    if (!localValid?.valid) return;
    setSolving(true);
    setError(null);
    setResult(null);

    try {
      const res = await controllerRef.current.solve();
      setResult(res);
    } catch (err) {
      setError(err.message ?? 'Unknown error from solver');
    } finally {
      setSolving(false);
    }
  }, [localValid]);

  // ── Apply solution to simulator ──────────────────────────────
  const handleApply = useCallback(() => {
    if (result?.solution && onApplySolution) {
      onApplySolution(result.solution);
    }
  }, [result, onApplySolution]);

  // ── Render ───────────────────────────────────────────────────
  const healthClass = health === 'ok' ? 'solver-health--ok' : health === 'error' ? 'solver-health--error' : 'solver-health--unknown';

  return (
    <div className="solver-view">
      <div className="solver-header">
        <h2 className="solver-title">Cube Solver</h2>
        <span className={`solver-health ${healthClass}`}>
          {health === 'loading' ? '⏳ Checking backend…' :
           health === 'ok'      ? '🟢 Backend online' :
           health === 'error'   ? '🔴 Backend offline' :
                                  '⚪ Unknown'}
        </span>
      </div>

      {/* Current cube string */}
      <div className="solver-cube-string">
        <label className="solver-label">Kociemba String</label>
        <code className="solver-code">{cubeString}</code>
      </div>

      {/* Local validation */}
      {localValid && (
        <div className={`solver-banner ${localValid.valid ? 'solver-banner--valid' : 'solver-banner--invalid'}`}>
          {localValid.valid
            ? '✅ Cube is locally valid — ready to solve'
            : `❌ ${localValid.error?.code}: ${localValid.error?.message}`}
        </div>
      )}

      {/* Solve button */}
      <button
        className="solver-btn"
        onClick={handleSolve}
        disabled={!localValid?.valid || solving || health === 'error'}
      >
        {solving ? '⏳ Solving…' : '🔍 Solve Cube'}
      </button>

      {/* Error from backend */}
      {error && (
        <div className="solver-banner solver-banner--error">
          ⚠️ {error}
        </div>
      )}

      {/* Solution display */}
      {result && (
        <div className="solver-result">
          <div className="solver-result-header">
            <span className="solver-result-title">
              {result.moveCount === 0
                ? '✅ Cube is already solved!'
                : `Solution — ${result.moveCount} move${result.moveCount !== 1 ? 's' : ''}`}
            </span>
            {result.moveCount > 0 && onApplySolution && (
              <button className="solver-apply-btn" onClick={handleApply}>
                ▶ Play in Simulator
              </button>
            )}
          </div>

          {result.moveCount > 0 && (
            <div className="solver-moves">
              {result.solution.map((move, i) => (
                <span key={i} className="solver-move-chip">{move}</span>
              ))}
            </div>
          )}

          {result.raw && (
            <div className="solver-raw">
              <label className="solver-label">Raw notation</label>
              <code className="solver-code">{result.raw}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SolverView;
