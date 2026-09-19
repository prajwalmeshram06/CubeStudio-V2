/**
 * SolverView.jsx — React UI for the Solver tab.
 *
 * Displays:
 *  - Current cube state (Kociemba string + local validation)
 *  - Solve button → calls SolverController.solve()
 *  - Solution Player with step-by-step playback, progress, and hints
 *  - Error banner & Backend health badge
 *  - Link to open solution in 3D Simulator
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SolverController } from './SolverController.js';
import { SolutionPlayerController } from './SolutionPlayerController.js';
import { SolutionPlayerView } from './SolutionPlayerView.jsx';
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
  const [playerController, setPlayerController] = useState(null);
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
    setPlayerController(null);
    setError(null);
  }, [cubeState]);

  // ── Health check on mount (with retry support) ───────────────
  const checkBackendHealth = useCallback(() => {
    setHealth('loading');
    const ctrl = controllerRef.current ?? new SolverController(cubeState);
    controllerRef.current = ctrl;
    ctrl.checkHealth()
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'));
  }, [cubeState]);

  useEffect(() => {
    checkBackendHealth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Solve ────────────────────────────────────────────────────
  const handleSolve = useCallback(async () => {
    if (!localValid?.valid) return;
    setSolving(true);
    setError(null);
    setResult(null);
    setPlayerController(null);

    try {
      const res = await controllerRef.current.solve();
      setResult(res);

      if (res.parsed && res.parsed.length > 0) {
        const player = new SolutionPlayerController({
          initialCubeState: cubeState.clone(),
          moves: res.parsed,
          playbackSpeed: 500,
        });
        setPlayerController(player);
      }
    } catch (err) {
      setError(err.message ?? 'Unknown error from solver');
    } finally {
      setSolving(false);
    }
  }, [localValid, cubeState]);

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
        {health === 'error' && (
          <button
            className="solver-retry-btn"
            onClick={checkBackendHealth}
            title="Retry backend health check"
          >
            🔄 Retry
          </button>
        )}
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
        disabled={!localValid?.valid || solving}
      >
        {solving ? '⏳ Solving…' : '🔍 Solve Cube'}
      </button>

      {/* Error from backend */}
      {error && (
        <div className="solver-banner solver-banner--error">
          ⚠️ {error}
        </div>
      )}

      {/* Solution Display & Solution Player */}
      {result && (
        <div className="solver-result">
          <div className="solver-result-header">
            <span className="solver-result-title">
              {result.moveCount === 0
                ? '✅ Cube is already solved!'
                : `Solution Generated — ${result.moveCount} move${result.moveCount !== 1 ? 's' : ''}`}
            </span>
            {result.moveCount > 0 && onApplySolution && (
              <button className="solver-apply-btn" onClick={handleApply}>
                ▶ Open in 3D Simulator
              </button>
            )}
          </div>

          {/* Embedded Interactive Solution Player */}
          {playerController && (
            <div className="solver-player-wrapper">
              <SolutionPlayerView controller={playerController} />
            </div>
          )}

          {/* Raw Notation Summary */}
          {result.raw && (
            <div className="solver-raw">
              <label className="solver-label">Raw notation sequence</label>
              <code className="solver-code">{result.raw}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SolverView;
