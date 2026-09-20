/**
 * MoveTrainerPanel.jsx — Interactive UI for Move, Notation, and Sequence Drills.
 */

import React, { useState, useEffect } from 'react';
import { MoveTrainerController, TRAINER_MODES, MOVE_GROUPS } from './MoveTrainerController.js';

export function MoveTrainerPanel({ simulatorController, storage }) {
  const [controller] = useState(() => new MoveTrainerController({ storage }));
  const [state, setState] = useState(() => controller.getState());

  useEffect(() => {
    return controller.subscribe(newState => setState(newState));
  }, [controller]);

  // Hook simulator moves to trainer observation
  useEffect(() => {
    if (!simulatorController) return;
    const unsub = simulatorController.subscribe(simState => {
      if (simState.lastMove && simState.lastMoveTime) {
        controller.observeMove(simState.lastMove);
      }
    });
    return unsub;
  }, [simulatorController, controller]);

  const handleManualMove = async (moveToken) => {
    if (simulatorController) {
      await simulatorController.applyMove(moveToken);
    } else {
      controller.observeMove(moveToken);
    }
  };

  const { mode, filterGroup, currentPrompt, status, lastFeedback, stats, accuracy, performedSequence } = state;

  return (
    <div className="trainer-panel">
      {/* Top Header / Mode Switcher */}
      <div className="trainer-header">
        <div className="trainer-tabs">
          <button
            className={`trainer-tab ${mode === TRAINER_MODES.MOVE_PRACTICE ? 'active' : ''}`}
            onClick={() => controller.setMode(TRAINER_MODES.MOVE_PRACTICE)}
          >
            Move Practice
          </button>
          <button
            className={`trainer-tab ${mode === TRAINER_MODES.NOTATION_READING ? 'active' : ''}`}
            onClick={() => controller.setMode(TRAINER_MODES.NOTATION_READING)}
          >
            Notation Reading
          </button>
          <button
            className={`trainer-tab ${mode === TRAINER_MODES.SEQUENCE_DRILL ? 'active' : ''}`}
            onClick={() => controller.setMode(TRAINER_MODES.SEQUENCE_DRILL)}
          >
            Sequence Drills
          </button>
        </div>

        {/* Quick Stats Badges */}
        <div className="trainer-stats-row">
          <div className="stat-pill">
            <span className="stat-label">Streak</span>
            <span className="stat-value highlight">🔥 {stats.currentStreak}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Best</span>
            <span className="stat-value">⭐ {stats.bestStreak}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">{accuracy}%</span>
          </div>
        </div>
      </div>

      {/* Group Filters (for single move / notation modes) */}
      {mode !== TRAINER_MODES.SEQUENCE_DRILL && (
        <div className="group-filters">
          <span className="filter-title">Filter:</span>
          {[
            { id: MOVE_GROUPS.ALL, label: 'All' },
            { id: MOVE_GROUPS.BASIC, label: 'Basic' },
            { id: MOVE_GROUPS.PRIMES, label: "Primes (')" },
            { id: MOVE_GROUPS.DOUBLES, label: 'Doubles (2)' },
            { id: MOVE_GROUPS.RIGHT_LEFT, label: 'R / L' },
            { id: MOVE_GROUPS.UP_DOWN, label: 'U / D' },
            { id: MOVE_GROUPS.FRONT_BACK, label: 'F / B' }
          ].map(f => (
            <button
              key={f.id}
              className={`filter-pill ${filterGroup === f.id ? 'active' : ''}`}
              onClick={() => controller.setFilterGroup(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Target Prompt Display */}
      <div className={`prompt-card status-${status}`}>
        <div className="prompt-header">
          <span className="prompt-tag">
            {mode === TRAINER_MODES.SEQUENCE_DRILL ? 'TARGET SEQUENCE' : 'PERFORM MOVE'}
          </span>
          <span className="prompt-hint">{currentPrompt?.hint}</span>
        </div>

        <div className="prompt-main">
          {mode === TRAINER_MODES.NOTATION_READING ? (
            <div className="prompt-notation large">{currentPrompt?.expected}</div>
          ) : mode === TRAINER_MODES.SEQUENCE_DRILL ? (
            <div className="prompt-sequence-wrap">
              <div className="prompt-name">{currentPrompt?.name}</div>
              <div className="prompt-notation sequence">{currentPrompt?.expected}</div>
            </div>
          ) : (
            <div className="prompt-notation-row">
              <div className="prompt-notation large">{currentPrompt?.expected}</div>
              <div className="prompt-desc">{currentPrompt?.description}</div>
            </div>
          )}
        </div>

        {/* Progress for Sequence Drill */}
        {mode === TRAINER_MODES.SEQUENCE_DRILL && (
          <div className="sequence-progress">
            <div className="sequence-label">Your Input:</div>
            <div className="sequence-chips">
              {performedSequence.length === 0 ? (
                <span className="empty-seq">Waiting for first move...</span>
              ) : (
                performedSequence.map((m, idx) => (
                  <span key={idx} className="seq-chip done">{m}</span>
                ))
              )}
            </div>
          </div>
        )}

        {/* Feedback Area */}
        {lastFeedback && (
          <div className={`feedback-alert ${lastFeedback.isCorrect ? 'success' : 'error'}`}>
            <div className="feedback-text">{lastFeedback.message}</div>
            {lastFeedback.tip && <div className="feedback-tip">💡 {lastFeedback.tip}</div>}
          </div>
        )}

        {/* Action Controls */}
        <div className="prompt-actions">
          <button
            className="btn-next-prompt"
            onClick={() => controller.nextPrompt()}
          >
            {status === 'success' ? 'Next Challenge →' : 'Skip / Next →'}
          </button>
          <button
            className="btn-retry"
            onClick={() => controller.resetCurrent()}
          >
            Reset Attempt
          </button>
        </div>
      </div>

      {/* Virtual Keypad for direct testing or mouse control */}
      <div className="trainer-keypad">
        <div className="keypad-title">Interactive Move Buttons (or press keys on keyboard)</div>
        <div className="keypad-grid">
          {['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'].map(token => (
            <button
              key={token}
              className="keypad-btn"
              onClick={() => handleManualMove(token)}
            >
              {token}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
