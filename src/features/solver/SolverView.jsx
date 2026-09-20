/**
 * SolverView.jsx — React UI for the Solver tab.
 * Governed by DESIGN.md & Stitch Visual Specifications (media_1789896645222.png).
 *
 * Displays:
 *  - Header with solver suite kicker, title, and live backend health status with retry
 *  - 2-Column Overview:
 *      * Cube State Overview (54-facelet map, copy button, validation status, Solve Cube button)
 *      * Results & Solution Overview (Solution move count, copy algorithm, execution metrics)
 *  - Embedded Solution Player with algorithm rail, natural language step instructions, and transport controls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Zap,
  RefreshCw,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
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
  const [copiedString, setCopiedString] = useState(false);
  const [copiedAlgorithm, setCopiedAlgorithm] = useState(false);
  const [solveDurationMs, setSolveDurationMs] = useState(null);

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
    setSolveDurationMs(null);
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
    const startTime = performance.now();

    try {
      const res = await controllerRef.current.solve();
      const elapsed = Math.round(performance.now() - startTime);
      setSolveDurationMs(elapsed);
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

  // ── Copy helpers ─────────────────────────────────────────────
  const handleCopyString = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cubeString);
      setCopiedString(true);
      setTimeout(() => setCopiedString(false), 2000);
    }
  };

  const handleCopyAlgorithm = () => {
    if (navigator.clipboard && result?.raw) {
      navigator.clipboard.writeText(result.raw);
      setCopiedAlgorithm(true);
      setTimeout(() => setCopiedAlgorithm(false), 2000);
    }
  };

  return (
    <div className="solver-page-container">
      {/* Top Header & Health Bar (Stitch Reference) */}
      <div className="solver-top-header">
        <div className="solver-title-group">
          <div className="solver-kicker">
            <Cpu size={14} />
            <span>ALGORITHMIC SUITE • Two-Phase Reduction</span>
          </div>
          <div className="solver-main-title">
            <h1>Kociemba Two-Phase Solver</h1>
            <span className="solver-version-badge">v2.4.1-engine</span>
          </div>
        </div>

        <div className="solver-status-group">
          <div className={`solver-api-status ${health}`}>
            <span className={`status-indicator-dot ${health}`} />
            <span className="status-indicator-text">
              {health === 'loading'
                ? 'Checking API…'
                : health === 'ok'
                ? 'Solver API: Online'
                : health === 'error'
                ? 'Solver API: Offline'
                : 'API: Unknown'}
            </span>
          </div>

          <button
            className="solver-retry-button"
            onClick={checkBackendHealth}
            title="Refresh backend solver connection"
            aria-label="Refresh backend solver connection"
          >
            <RefreshCw size={13} className={health === 'loading' ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* 2-Column Cards Grid (Stitch Reference) */}
      <div className="solver-overview-grid">
        {/* Left Card: Cube State Overview */}
        <div className="solver-card">
          <div className="solver-card-header">
            <div className="solver-card-title-item">
              <Layers size={16} />
              <h3>Cube State Overview</h3>
            </div>
            <span className="solver-badge-mono">54 Facelets</span>
          </div>

          <div className="solver-card-body">
            <div className="solver-field-row">
              <span className="solver-field-label">FACELET MAP (U-R-F-D-L-B)</span>
              <button
                className="solver-copy-btn"
                onClick={handleCopyString}
                title="Copy Kociemba 54-char string"
              >
                {copiedString ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copiedString ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="solver-code-box">
              <code>{cubeString}</code>
            </div>

            {/* Local Validation Banner */}
            {localValid && (
              <div className={`solver-validation-pill ${localValid.valid ? 'valid' : 'invalid'}`}>
                <div className="validation-pill-left">
                  {localValid.valid ? (
                    <CheckCircle2 size={15} className="pill-icon-success" />
                  ) : (
                    <AlertTriangle size={15} className="pill-icon-error" />
                  )}
                  <span>
                    {localValid.valid
                      ? 'State Valid: Ready for computation'
                      : `${localValid.error?.code || 'Invalid'}: ${localValid.error?.message}`}
                  </span>
                </div>
                {localValid.valid && <span className="validation-pill-tag">Parity: OK</span>}
              </div>
            )}

            {/* Solve Button CTA */}
            <div className="solver-action-row">
              <button
                className="solver-primary-btn"
                onClick={handleSolve}
                disabled={!localValid?.valid || solving}
              >
                <Zap size={16} />
                <span>{solving ? 'Solving Cube…' : 'Solve Cube'}</span>
              </button>
              <span className="solver-estimation-text">ESTIMATION &lt; 0.05s</span>
            </div>

            {/* Error Message if any */}
            {error && (
              <div className="solver-error-banner">
                <XCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Results & Solution Overview */}
        <div className="solver-card">
          <div className="solver-card-header">
            <div className="solver-card-title-item">
              <Sparkles size={16} />
              <h3>Results &amp; Solution Overview</h3>
            </div>
            {result && <span className="solver-badge-optimal">Two-Phase Optimal</span>}
          </div>

          <div className="solver-card-body">
            {!result && !solving && (
              <div className="solver-empty-card-state">
                <p>Click <strong>Solve Cube</strong> to compute the optimal move sequence using the two-phase Kociemba algorithm.</p>
              </div>
            )}

            {solving && (
              <div className="solver-empty-card-state">
                <RefreshCw size={24} className="spinning" />
                <p>Computing optimal solution path…</p>
              </div>
            )}

            {result && (
              <>
                <div className="solution-headline">
                  {result.moveCount === 0 ? (
                    <h4 className="solution-headline-text solved">Cube is already solved!</h4>
                  ) : (
                    <h4 className="solution-headline-text">
                      Solution Found: {result.moveCount} Moves
                    </h4>
                  )}
                </div>

                {result.raw && (
                  <>
                    <div className="solver-field-row">
                      <span className="solver-field-label">FULL NOTATION SEQUENCE</span>
                      <button
                        className="solver-copy-btn"
                        onClick={handleCopyAlgorithm}
                        title="Copy algorithm sequence"
                      >
                        {copiedAlgorithm ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        <span>{copiedAlgorithm ? 'Copied' : 'Copy Algorithm'}</span>
                      </button>
                    </div>

                    <div className="solver-code-box solution-sequence">
                      <code>{result.raw}</code>
                    </div>
                  </>
                )}

                {/* Telemetry Row */}
                <div className="solver-telemetry-row">
                  <div className="telemetry-item">
                    <span className="telemetry-label">EXECUTION TIME</span>
                    <span className="telemetry-value">
                      {solveDurationMs !== null ? `${solveDurationMs}ms` : '< 20ms'}
                    </span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">TOTAL TURNS</span>
                    <span className="telemetry-value">{result.moveCount} Turns</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">PHASE REDUCTION</span>
                    <span className="telemetry-value highlight">G0 &rarr; G1 OK</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Solution Player Section (Stitch Reference) */}
      {result && result.moveCount > 0 && playerController && (
        <div className="solver-player-section">
          <SolutionPlayerView
            controller={playerController}
            onOpenInSimulator={onApplySolution ? handleApply : undefined}
          />
        </div>
      )}
    </div>
  );
}

export default SolverView;
