/**
 * CubeStudio V2 - Speedcubing Timer View
 * Presentation component providing WCA-style speedcubing timer, inspection countdown,
 * keyboard/spacebar controls, post-solve penalties, and live statistics.
 * Governed by DESIGN.md & Stitch Visual Reference (media_1789896645226.png).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Wand2,
  History as HistoryIcon,
  Clock,
  Sparkles,
  Trophy,
  Trash2,
  TrendingDown
} from 'lucide-react';
import { TimerController, TIMER_STATUS } from './TimerController.js';
import { formatTime, calculateStatistics } from './statistics.js';
import { getSolves, saveSolve, updateSolve, deleteSolve } from '../../services/solveStorage.js';
import { HistoryView } from './HistoryView.jsx';
import './timer.css';

/**
 * @param {{
 *   onOpenSimulator?: (scramble: string) => void,
 *   onOpenSolver?: (scramble: string) => void,
 * }} props
 */
export function TimerView({ onOpenSimulator, onOpenSolver }) {
  const [controller] = useState(() => new TimerController());
  const [timerState, setTimerState] = useState(() => controller.getState());
  const [solves, setSolves] = useState(() => getSolves());
  const [activeSubTab, setActiveSubTab] = useState('timer'); // 'timer' | 'history'
  const [copiedScramble, setCopiedScramble] = useState(false);

  // Subscribe to controller state changes
  useEffect(() => {
    const unsubscribe = controller.subscribe((state) => {
      setTimerState({ ...state });
      if (state.status === TIMER_STATUS.SAVED) {
        setSolves(getSolves());
      }
    });

    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);

  // ── Keyboard / Spacebar Controls ─────────────────────────────
  const isSpaceDownRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();

        if (isSpaceDownRef.current) return;
        isSpaceDownRef.current = true;

        const currentStatus = controller.status;

        if (currentStatus === TIMER_STATUS.RUNNING) {
          controller.stopSolve();
          const record = controller.save();
          if (record) {
            setSolves(getSolves());
          }
        } else if (currentStatus === TIMER_STATUS.IDLE) {
          if (controller.inspectionEnabled) {
            controller.startInspection();
          } else {
            controller.setReady();
          }
        } else if (currentStatus === TIMER_STATUS.INSPECTION) {
          controller.setReady();
        } else if (currentStatus === TIMER_STATUS.STOPPED || currentStatus === TIMER_STATUS.SAVED) {
          controller.reset(true);
        }
      } else if (controller.status === TIMER_STATUS.RUNNING) {
        e.preventDefault();
        controller.stopSolve();
        const record = controller.save();
        if (record) {
          setSolves(getSolves());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        controller.reset(false);
      }
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        isSpaceDownRef.current = false;

        if (controller.status === TIMER_STATUS.READY) {
          controller.startSolve();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [controller]);

  // ── Mouse / Touch Display Click Handlers ─────────────────────
  const handleDisplayMouseDown = () => {
    if (timerState.status === TIMER_STATUS.RUNNING) {
      controller.stopSolve();
      const record = controller.save();
      if (record) {
        setSolves(getSolves());
      }
    } else if (timerState.status === TIMER_STATUS.IDLE) {
      if (controller.inspectionEnabled) {
        controller.startInspection();
      } else {
        controller.setReady();
      }
    } else if (timerState.status === TIMER_STATUS.INSPECTION) {
      controller.setReady();
    }
  };

  const handleDisplayMouseUp = () => {
    if (controller.status === TIMER_STATUS.READY) {
      controller.startSolve();
    }
  };

  // ── Penalty Toggling ─────────────────────────────────────────
  const handleTogglePenalty = (penalty) => {
    const newPenalty = timerState.penalty === penalty ? null : penalty;
    controller.setPenalty(newPenalty);

    if (timerState.solveId) {
      const updated = updateSolve(timerState.solveId, { penalty: newPenalty });
      setSolves(updated);
    }
  };

  // ── Scramble Actions ─────────────────────────────────────────
  const handleCopyScramble = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(timerState.scramble);
      setCopiedScramble(true);
      setTimeout(() => setCopiedScramble(false), 2000);
    }
  };

  const handleDeleteCurrent = () => {
    if (timerState.solveId) {
      const updated = deleteSolve(timerState.solveId);
      setSolves(updated);
      controller.reset(true);
    }
  };

  const stats = calculateStatistics(solves);
  const dnfCount = solves.filter((s) => s.penalty === 'DNF').length;

  return (
    <div className="timer-page-container">
      {/* Sub-Tab Switcher (Stitch Reference) */}
      <div className="timer-nav-header">
        <div className="timer-switcher-pill" role="tablist">
          <button
            role="tab"
            aria-selected={activeSubTab === 'timer'}
            className={`timer-switcher-btn ${activeSubTab === 'timer' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('timer')}
          >
            <Clock size={13} />
            <span>Timer</span>
          </button>
          <button
            role="tab"
            aria-selected={activeSubTab === 'history'}
            className={`timer-switcher-btn ${activeSubTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('history')}
          >
            <HistoryIcon size={13} />
            <span>History &amp; Stats</span>
            <span className="history-pill-count">{solves.length} solves</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'history' ? (
        <HistoryView
          solves={solves}
          onSolvesChanged={(updated) => setSolves(updated)}
          onOpenSimulator={onOpenSimulator}
          onOpenSolver={onOpenSolver}
        />
      ) : (
        <div className="timer-container">
          {/* Top WCA Scramble Card (Stitch Reference) */}
          <div className="timer-scramble-card">
            <div className="scramble-card-top-row">
              <div className="scramble-title-group">
                <span className="scramble-live-dot" />
                <span className="scramble-kicker">WCA OFFICIAL 3X3X3 SCRAMBLE</span>
                <span className="scramble-index-badge">#{solves.length + 1}</span>
              </div>

              <label className="inspection-switch-label">
                <span>15s WCA Inspection: <strong>{timerState.inspectionEnabled ? 'Enabled' : 'Disabled'}</strong></span>
                <input
                  type="checkbox"
                  className="inspection-switch-input"
                  checked={timerState.inspectionEnabled}
                  onChange={(e) => controller.setInspectionEnabled(e.target.checked)}
                  disabled={timerState.status === TIMER_STATUS.RUNNING}
                />
              </label>
            </div>

            {/* Large Monospace Scramble String */}
            <div className="timer-scramble-text" title="Current solve scramble">
              {timerState.scramble}
            </div>

            <div className="scramble-card-bottom-row">
              <span className="scramble-hint-text">
                Inspection warning at 8s &amp; 12s voice cue
              </span>

              <div className="scramble-actions-group">
                <button
                  className="btn-scramble-action"
                  onClick={handleCopyScramble}
                  title="Copy scramble to clipboard"
                >
                  {copiedScramble ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  <span>{copiedScramble ? 'Copied' : 'Copy Scramble'}</span>
                </button>

                <button
                  className="btn-scramble-action"
                  onClick={() => controller.newScramble()}
                  disabled={timerState.status === TIMER_STATUS.RUNNING}
                  title="Generate new scramble"
                >
                  <RefreshCw size={13} />
                  <span>Generate New Scramble</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Huge Digital Timer Display (Stitch Reference) */}
          <div
            className="timer-display-area"
            onMouseDown={handleDisplayMouseDown}
            onMouseUp={handleDisplayMouseUp}
            onTouchStart={handleDisplayMouseDown}
            onTouchEnd={handleDisplayMouseUp}
          >
            {/* Status Pill */}
            {timerState.status === TIMER_STATUS.INSPECTION && (
              <span className={`timer-status-pill ${timerState.inspectionWarning ? 'warning' : 'inspection'}`}>
                ● INSPECTION ({timerState.inspectionRemainingSec}s remaining)
              </span>
            )}
            {timerState.status === TIMER_STATUS.READY && (
              <span className="timer-status-pill ready">
                ● READY • HOLD SPACEBAR TO ARM
              </span>
            )}
            {timerState.status === TIMER_STATUS.IDLE && (
              <span className="timer-status-pill idle">
                Press Space or Tap to Begin
              </span>
            )}
            {(timerState.status === TIMER_STATUS.STOPPED || timerState.status === TIMER_STATUS.SAVED) && (
              <span className="timer-status-pill saved">
                ● SOLVE COMPLETE
              </span>
            )}

            {/* Digits Display */}
            <div
              className={`timer-digits ${
                timerState.status === TIMER_STATUS.READY
                  ? 'ready'
                  : timerState.status === TIMER_STATUS.INSPECTION
                  ? timerState.inspectionWarning
                    ? 'warning'
                    : 'inspection'
                  : timerState.status === TIMER_STATUS.STOPPED || timerState.status === TIMER_STATUS.SAVED
                  ? timerState.penalty === 'DNF'
                    ? 'penalty-dnf'
                    : timerState.penalty === '+2'
                    ? 'penalty-plus-two'
                    : 'stopped'
                  : ''
              }`}
            >
              {timerState.status === TIMER_STATUS.INSPECTION
                ? timerState.inspectionRemainingSec
                : timerState.status === TIMER_STATUS.READY
                ? '00:00.00'
                : formatTime(
                    timerState.status === TIMER_STATUS.RUNNING
                      ? timerState.elapsedMs
                      : timerState.timeMs,
                    timerState.status === TIMER_STATUS.RUNNING ? null : timerState.penalty
                  )}
            </div>

            {/* Interaction Hint */}
            <div className="timer-interaction-hint">
              {timerState.status === TIMER_STATUS.RUNNING
                ? 'Press any key or tap screen to stop timing.'
                : timerState.status === TIMER_STATUS.INSPECTION
                ? 'Hold Space or press & hold screen until green, then release to start timing.'
                : timerState.status === TIMER_STATUS.READY
                ? 'Release Spacebar to start timing!'
                : timerState.status === TIMER_STATUS.IDLE
                ? timerState.inspectionEnabled
                  ? 'Hold Space or press & hold screen until green, then release to start timing. Press any key to stop.'
                  : 'Hold Spacebar to get ready.'
                : 'Spacebar: next scramble  •  Esc: reset'}
            </div>
          </div>

          {/* Post-Solve Action Controls (Stitch Reference) */}
          {(timerState.status === TIMER_STATUS.STOPPED || timerState.status === TIMER_STATUS.SAVED) && (
            <div className="timer-post-actions-panel">
              <div className="penalty-buttons-group">
                <button
                  className={`btn-penalty-pill ${timerState.penalty === null ? 'active-ok' : ''}`}
                  onClick={() => handleTogglePenalty(null)}
                  title="No penalty (OK)"
                >
                  OK
                </button>
                <button
                  className={`btn-penalty-pill plus-two ${timerState.penalty === '+2' ? 'active' : ''}`}
                  onClick={() => handleTogglePenalty('+2')}
                  title="Apply +2 second penalty"
                >
                  +2 sec
                </button>
                <button
                  className={`btn-penalty-pill dnf ${timerState.penalty === 'DNF' ? 'active' : ''}`}
                  onClick={() => handleTogglePenalty('DNF')}
                  title="Mark solve as DNF (Did Not Finish)"
                >
                  DNF
                </button>
              </div>

              <div className="post-nav-buttons-group">
                <button
                  className="btn-timer-cta-primary"
                  onClick={() => controller.reset(true)}
                  title="Start next solve with fresh scramble (Space)"
                >
                  <RotateCcw size={14} />
                  <span>Next Scramble <span className="btn-kbd-chip">Space</span></span>
                </button>

                {onOpenSimulator && (
                  <button
                    className="btn-timer-cta-secondary"
                    onClick={() => onOpenSimulator(timerState.scramble)}
                    title="Load this scramble in 3D Simulator"
                  >
                    <ExternalLink size={14} />
                    <span>Open in 3D View</span>
                  </button>
                )}

                {onOpenSolver && (
                  <button
                    className="btn-timer-cta-secondary"
                    onClick={() => onOpenSolver(timerState.scramble)}
                    title="Solve this scramble with Kociemba algorithm"
                  >
                    <Wand2 size={14} />
                    <span>Send to Solver</span>
                  </button>
                )}

                {timerState.solveId && (
                  <button
                    className="btn-timer-cta-danger"
                    onClick={handleDeleteCurrent}
                    title="Delete this recorded solve"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bottom Technical Quick Stats Strip (Stitch Reference) */}
          <div className="timer-quick-stats-strip">
            {/* Best Single */}
            <div className="timer-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">Best Single</span>
                {stats.bestSingleTime && <span className="stat-card-pb-badge"><Trophy size={10} /> PB</span>}
              </div>
              <div className="stat-card-time best">
                {formatTime(stats.bestSingleTime)}
              </div>
            </div>

            {/* Current Ao5 */}
            <div className="timer-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">Ao5</span>
                {stats.improvement.percentage !== null && stats.improvement.improved && (
                  <span className="stat-card-trend-badge"><TrendingDown size={10} /> -0.34</span>
                )}
              </div>
              <div className="stat-card-time highlight">
                {stats.ao5 === Infinity ? 'DNF' : formatTime(stats.ao5)}
              </div>
            </div>

            {/* Current Ao12 */}
            <div className="timer-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">Ao12</span>
                <span className="stat-card-sub-tag">Rolling</span>
              </div>
              <div className="stat-card-time highlight">
                {stats.ao12 === Infinity ? 'DNF' : formatTime(stats.ao12)}
              </div>
            </div>

            {/* Session Mean */}
            <div className="timer-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">Session Mean</span>
                <span className="stat-card-sub-tag">All Solves</span>
              </div>
              <div className="stat-card-time">
                {stats.sessionAverage === Infinity ? 'DNF' : formatTime(stats.sessionAverage)}
              </div>
            </div>

            {/* Solves Count */}
            <div className="timer-stat-card">
              <div className="stat-card-top">
                <span className="stat-card-label">Solves</span>
                {dnfCount > 0 && <span className="stat-card-dnf-count">{dnfCount} DNF</span>}
              </div>
              <div className="stat-card-time">
                {stats.count} <span className="stat-card-count-denom">/ {stats.count}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimerView;
