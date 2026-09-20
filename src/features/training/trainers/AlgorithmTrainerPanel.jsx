/**
 * AlgorithmTrainerPanel.jsx — Interactive UI for CFOP & Algorithm Mastery.
 */

import React, { useState, useEffect } from 'react';
import { AlgorithmTrainerController } from './AlgorithmTrainerController.js';
import { CFOP_STAGES } from '../algorithms/cfopData.js';

export function AlgorithmTrainerPanel({ simulatorController, storage }) {
  const [controller] = useState(() => new AlgorithmTrainerController({ storage }));
  const [state, setState] = useState(() => controller.getState());
  const [isApplyingSetup, setIsApplyingSetup] = useState(false);

  useEffect(() => {
    return controller.subscribe(newState => setState(newState));
  }, [controller]);

  // Hook simulator moves to trainer
  useEffect(() => {
    if (!simulatorController) return;
    const unsub = simulatorController.subscribe(simState => {
      if (simState.lastMove && simState.lastMoveTime) {
        controller.observeMove(simState.lastMove);
      }
    });
    return unsub;
  }, [simulatorController, controller]);

  const {
    stageFilter,
    selectedAlgorithm,
    expectedMoves,
    currentStepIndex,
    executedMoves,
    status,
    divergenceInfo,
    elapsedMs,
    globalStats,
    algStats,
    filteredAlgorithms
  } = state;

  const handleApplySetup = async () => {
    if (!simulatorController) return;
    setIsApplyingSetup(true);
    try {
      await controller.applySetupToSimulator(simulatorController);
    } finally {
      setIsApplyingSetup(false);
    }
  };

  const handleManualMove = async (moveToken) => {
    if (simulatorController) {
      await simulatorController.applyMove(moveToken);
    } else {
      controller.observeMove(moveToken);
    }
  };

  return (
    <div className="trainer-panel alg-trainer-panel">
      {/* Stage Selector Filters */}
      <div className="trainer-header">
        <div className="stage-filters">
          {[
            { id: 'all', label: 'All Cases' },
            { id: CFOP_STAGES.CROSS, label: 'Cross' },
            { id: CFOP_STAGES.F2L, label: 'F2L' },
            { id: CFOP_STAGES.OLL, label: '2-Look OLL' },
            { id: CFOP_STAGES.PLL, label: '2-Look PLL' }
          ].map(stage => (
            <button
              key={stage.id}
              className={`stage-pill ${stageFilter === stage.id ? 'active' : ''}`}
              onClick={() => controller.setStageFilter(stage.id)}
            >
              {stage.label}
            </button>
          ))}
        </div>

        {/* Algorithm Quick Switcher Dropdown */}
        <div className="alg-selector-wrap">
          <select
            className="alg-dropdown"
            value={selectedAlgorithm?.id || ''}
            onChange={(e) => controller.selectAlgorithm(e.target.value)}
          >
            {filteredAlgorithms.map(alg => (
              <option key={alg.id} value={alg.id}>
                {alg.name} ({alg.notation})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Algorithm Card */}
      {selectedAlgorithm && (
        <div className={`alg-card status-${status}`}>
          <div className="alg-meta-row">
            <div className="alg-title-wrap">
              <span className="alg-category-tag">{selectedAlgorithm.category}</span>
              <h3 className="alg-title">{selectedAlgorithm.name}</h3>
            </div>
            <div className="alg-badges">
              <span className="badge-difficulty">{selectedAlgorithm.difficulty}</span>
              <span className="badge-moves">{selectedAlgorithm.moveCount} moves</span>
              {algStats?.bestTimeMs && (
                <span className="badge-best-time">
                  ⚡ Best: {(algStats.bestTimeMs / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          </div>

          {/* Setup Trigger Banner */}
          <div className="alg-setup-bar">
            <div className="setup-info">
              <span className="setup-label">Scramble Setup:</span>
              <span className="setup-notation">{selectedAlgorithm.setup}</span>
            </div>
            <button
              className="btn-apply-setup"
              onClick={handleApplySetup}
              disabled={isApplyingSetup}
            >
              {isApplyingSetup ? 'Scrambling...' : '⚡ Set Up on Cube'}
            </button>
          </div>

          {/* Interactive Step-by-Step Notation Bar */}
          <div className="alg-sequence-display">
            <div className="alg-step-chips">
              {expectedMoves.map((m, idx) => {
                let stepState = 'pending';
                if (idx < currentStepIndex) stepState = 'done';
                else if (idx === currentStepIndex) stepState = 'active';

                return (
                  <span
                    key={idx}
                    className={`step-chip ${stepState} ${status === 'diverged' && idx === divergenceInfo?.divergenceIndex ? 'diverged' : ''}`}
                  >
                    <span className="step-num">{idx + 1}</span>
                    <span className="step-move">{m}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Status & Feedback Area */}
          {divergenceInfo && (
            <div className={`feedback-alert ${divergenceInfo.isCorrect ? 'success' : 'error'}`}>
              <div className="feedback-text">{divergenceInfo.message}</div>
              {divergenceInfo.tip && <div className="feedback-tip">💡 {divergenceInfo.tip}</div>}
            </div>
          )}

          {/* Recognition & Execution Notes */}
          <div className="alg-guidance-grid">
            <div className="guidance-box recognition">
              <div className="box-title">👁️ Recognition Cue</div>
              <p className="box-content">{selectedAlgorithm.recognition}</p>
            </div>
            <div className="guidance-box explanation">
              <div className="box-title">🎯 Execution Tips</div>
              <p className="box-content">{selectedAlgorithm.explanation}</p>
            </div>
          </div>

          {/* Navigation and Retry Controls */}
          <div className="alg-actions-row">
            <div className="nav-buttons">
              <button className="btn-nav" onClick={() => controller.prevAlgorithm()}>
                ← Previous
              </button>
              <button className="btn-nav" onClick={() => controller.nextAlgorithm()}>
                Next Case →
              </button>
            </div>
            <button className="btn-retry" onClick={() => controller.resetPractice()}>
              Reset Step
            </button>
          </div>
        </div>
      )}

      {/* Virtual Keypad */}
      <div className="trainer-keypad">
        <div className="keypad-title">Interactive Move Buttons</div>
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
