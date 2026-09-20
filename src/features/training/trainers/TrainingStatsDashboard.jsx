/**
 * TrainingStatsDashboard.jsx — Comprehensive Training Analytics & Mistake Insights.
 */

import React, { useState, useEffect } from 'react';
import {
  getAggregatedTrainingStats,
  downloadTrainingDataExport,
  clearTrainingData
} from '../../../services/trainingStorage.js';
import { CFOP_ALGORITHMS } from '../algorithms/cfopData.js';

export function TrainingStatsDashboard({ storage, onSelectAlgorithm }) {
  const [stats, setStats] = useState(() => getAggregatedTrainingStats(storage));

  const refreshStats = () => {
    setStats(getAggregatedTrainingStats(storage));
  };

  useEffect(() => {
    refreshStats();
  }, [storage]);

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to reset all training progress and statistics?')) {
      clearTrainingData(storage);
      refreshStats();
    }
  };

  const {
    lessonsCompleted,
    totalAttempts,
    totalSuccesses,
    accuracy,
    currentStreak,
    bestStreak,
    combinedMistakes,
    moveTrainer,
    notationTrainer,
    algorithmTrainer
  } = stats;

  const mistakeLabels = {
    wrong_direction: 'Wrong Direction (Prime vs CW)',
    wrong_amount: 'Wrong Amount (Single vs Double turn)',
    wrong_face: 'Wrong Face Selected',
    extra_move: 'Extra Unplanned Move',
    diverged: 'Algorithm Diverged Early',
    unknown: 'Other Mistakes'
  };

  return (
    <div className="trainer-dashboard">
      {/* Top Overview Cards */}
      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="dash-label">Lessons Completed</div>
          <div className="dash-value highlight">{lessonsCompleted} / 9</div>
          <div className="dash-sub">Beginner Curriculum</div>
        </div>

        <div className="dash-card">
          <div className="dash-label">Total Drill Attempts</div>
          <div className="dash-value">{totalAttempts}</div>
          <div className="dash-sub">{totalSuccesses} successful</div>
        </div>

        <div className="dash-card">
          <div className="dash-label">Overall Accuracy</div>
          <div className="dash-value highlight">{accuracy}%</div>
          <div className="dash-sub">Across all trainers</div>
        </div>

        <div className="dash-card">
          <div className="dash-label">Streak Record</div>
          <div className="dash-value">🔥 {currentStreak}</div>
          <div className="dash-sub">Best: {bestStreak}</div>
        </div>
      </div>

      {/* Mistake Intelligence & Taxonomy Breakdown */}
      <div className="dashboard-section">
        <h3 className="section-title">🧠 Mistake Intelligence Breakdown</h3>
        <p className="section-desc">
          Structured taxonomy of errors made during training drills. Use this to identify areas needing focus.
        </p>

        <div className="mistake-breakdown-list">
          {Object.keys(combinedMistakes).length === 0 ? (
            <div className="empty-state">No mistakes recorded yet! Keep drilling clean turns.</div>
          ) : (
            Object.entries(combinedMistakes).map(([type, count]) => (
              <div key={type} className="mistake-item">
                <div className="mistake-info">
                  <span className="mistake-name">{mistakeLabels[type] || type}</span>
                  <span className="mistake-count">{count} mistakes</span>
                </div>
                <div className="mistake-bar-wrap">
                  <div
                    className="mistake-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.round((count / (totalAttempts || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Algorithm Mastery Table */}
      <div className="dashboard-section">
        <h3 className="section-title">⚡ CFOP Algorithm Practice Records</h3>
        <div className="alg-mastery-table-wrap">
          <table className="alg-mastery-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Stage</th>
                <th>Attempts</th>
                <th>Completions</th>
                <th>Best Time</th>
              </tr>
            </thead>
            <tbody>
              {CFOP_ALGORITHMS.map(alg => {
                const record = algorithmTrainer.byAlgorithm?.[alg.id];
                return (
                  <tr key={alg.id}>
                    <td>
                      <div className="alg-name-cell">
                        <span className="alg-name">{alg.name}</span>
                        <code className="alg-notation">{alg.notation}</code>
                      </div>
                    </td>
                    <td><span className="badge-stage">{alg.stage.toUpperCase()}</span></td>
                    <td>{record?.attempts || 0}</td>
                    <td>{record?.completions || 0}</td>
                    <td>
                      {record?.bestTimeMs
                        ? `${(record.bestTimeMs / 1000).toFixed(2)}s`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export & Reset Actions */}
      <div className="dashboard-actions">
        <button
          className="btn-export-training"
          onClick={() => downloadTrainingDataExport(storage)}
        >
          📥 Export Training Data (JSON)
        </button>
        <button
          className="btn-clear-training"
          onClick={handleClearData}
        >
          🗑️ Reset Training Data
        </button>
      </div>
    </div>
  );
}
