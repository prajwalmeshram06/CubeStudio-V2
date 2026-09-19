/**
 * CubeStudio V2 - Timer View
 * Presentation component providing WCA-style speedcubing timer, inspection countdown,
 * keyboard/spacebar controls, post-solve penalties, and live statistics.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Copy, Check, Save, RotateCcw, ExternalLink, Wand2, History as HistoryIcon, Clock } from 'lucide-react';
import { TimerController, TIMER_STATUS } from './TimerController.js';
import { formatTime, calculateStatistics } from './statistics.js';
import { getSolves, saveSolve, updateSolve } from '../../services/solveStorage.js';
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
    });

    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);

  // Sync saved solve records whenever a solve transitions to SAVED
  const handleSaveCurrentSolve = useCallback(() => {
    if (timerState.status === TIMER_STATUS.STOPPED) {
      const record = controller.save();
      if (record) {
        setSolves(getSolves());
      }
    }
  }, [controller, timerState.status]);

  // ── Keyboard / Spacebar Controls ─────────────────────────────
  const isSpaceDownRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is inside an input, textarea, select, or editable element
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent browser scrolling

        if (isSpaceDownRef.current) return;
        isSpaceDownRef.current = true;

        const currentStatus = controller.status;

        if (currentStatus === TIMER_STATUS.RUNNING) {
          // Any space tap while running immediately stops the solve
          controller.stopSolve();
          // Auto-save on stop for convenient seamless speedcubing sessions
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
          // Space on stopped solve resets to idle with new scramble
          controller.reset(true);
        }
      } else if (controller.status === TIMER_STATUS.RUNNING) {
        // Any key stops the timer during a solve
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

  const stats = calculateStatistics(solves);

  return (
    <div className="timer-container">
      {/* Top Scramble & Sub-Tab Bar */}
      <div className="timer-header">
        <div className="timer-scramble-card">
          <div className="timer-scramble-text" title="Current solve scramble">
            {timerState.scramble}
          </div>
          <div className="timer-scramble-actions">
            <button
              className="timer-icon-btn"
              onClick={handleCopyScramble}
              title="Copy scramble to clipboard"
            >
              {copiedScramble ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            </button>
            <button
              className="timer-icon-btn"
              onClick={() => controller.newScramble()}
              disabled={timerState.status === TIMER_STATUS.RUNNING}
              title="Generate new scramble"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="timer-settings-bar">
          <label className="timer-toggle-label">
            <input
              type="checkbox"
              className="timer-toggle-checkbox"
              checked={timerState.inspectionEnabled}
              onChange={(e) => controller.setInspectionEnabled(e.target.checked)}
              disabled={timerState.status === TIMER_STATUS.RUNNING}
            />
            <span>15s WCA Inspection</span>
          </label>

          <div className="timer-view-tabs">
            <button
              className={`timer-tab-btn ${activeSubTab === 'timer' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('timer')}
            >
              <Clock size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
              Timer
            </button>
            <button
              className={`timer-tab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('history')}
            >
              <HistoryIcon size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
              History ({solves.length})
            </button>
          </div>
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
        <>
          {/* Main Large Timer Area */}
          <div
            className="timer-display-area"
            onMouseDown={handleDisplayMouseDown}
            onMouseUp={handleDisplayMouseUp}
            onTouchStart={handleDisplayMouseDown}
            onTouchEnd={handleDisplayMouseUp}
          >
            {/* Status Badge */}
            {timerState.status === TIMER_STATUS.INSPECTION && (
              <span className={`timer-status-badge ${timerState.inspectionWarning ? 'status--warning' : 'status--inspection'}`}>
                {timerState.inspectionWarning ? `Inspection (${timerState.inspectionWarning})` : 'Inspection'}
              </span>
            )}
            {timerState.status === TIMER_STATUS.READY && (
              <span className="timer-status-badge status--ready">READY</span>
            )}
            {timerState.status === TIMER_STATUS.IDLE && (
              <span className="timer-status-badge status--idle">Press Space or Tap to Begin</span>
            )}
            {(timerState.status === TIMER_STATUS.STOPPED || timerState.status === TIMER_STATUS.SAVED) && (
              <span className="timer-status-badge status--saved">Solve Complete</span>
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
                ? '0.000'
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
                ? 'Press any key or tap screen to stop'
                : timerState.status === TIMER_STATUS.INSPECTION
                ? 'Hold Spacebar or tap to get ready'
                : timerState.status === TIMER_STATUS.READY
                ? 'Release Spacebar to start solving!'
                : timerState.status === TIMER_STATUS.IDLE
                ? timerState.inspectionEnabled
                  ? 'Hold Spacebar to inspect cube'
                  : 'Hold Spacebar to get ready'
                : 'Spacebar: next scramble  •  Esc: reset'}
            </div>
          </div>

          {/* Post-Solve Action Controls */}
          {(timerState.status === TIMER_STATUS.STOPPED || timerState.status === TIMER_STATUS.SAVED) && (
            <div className="timer-post-actions">
              <div className="timer-action-group">
                <button
                  className={`btn-penalty plus-two ${timerState.penalty === '+2' ? 'active' : ''}`}
                  onClick={() => handleTogglePenalty('+2')}
                  title="Apply +2 second penalty"
                >
                  +2
                </button>
                <button
                  className={`btn-penalty ${timerState.penalty === 'DNF' ? 'active' : ''}`}
                  onClick={() => handleTogglePenalty('DNF')}
                  title="Mark solve as DNF (Did Not Finish)"
                >
                  DNF
                </button>
              </div>

              <div className="timer-action-group">
                <button
                  className="btn-timer-primary"
                  onClick={() => controller.reset(true)}
                  title="Start next solve with new scramble"
                >
                  <RotateCcw size={15} />
                  <span>Next Scramble</span>
                </button>

                {onOpenSimulator && (
                  <button
                    className="btn-timer-secondary"
                    onClick={() => onOpenSimulator(timerState.scramble)}
                    title="Load this scramble in 3D Simulator"
                  >
                    <ExternalLink size={15} />
                    <span>3D View</span>
                  </button>
                )}

                {onOpenSolver && (
                  <button
                    className="btn-timer-secondary"
                    onClick={() => onOpenSolver(timerState.scramble)}
                    title="Solve this scramble with Kociemba algorithm"
                  >
                    <Wand2 size={15} />
                    <span>Solve</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats Panel */}
          <div className="timer-quick-stats">
            <div className="stat-pill">
              <span className="stat-label">Best</span>
              <span className="stat-value best">{formatTime(stats.bestSingleTime)}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Ao5</span>
              <span className="stat-value highlight">
                {stats.ao5 === Infinity ? 'DNF' : formatTime(stats.ao5)}
              </span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Ao12</span>
              <span className="stat-value highlight">
                {stats.ao12 === Infinity ? 'DNF' : formatTime(stats.ao12)}
              </span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Session Mean</span>
              <span className="stat-value">
                {stats.sessionAverage === Infinity ? 'DNF' : formatTime(stats.sessionAverage)}
              </span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Solves</span>
              <span className="stat-value">{stats.count}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
