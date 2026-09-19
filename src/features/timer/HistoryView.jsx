/**
 * CubeStudio V2 - History View
 * Presentation component displaying solve history, statistics, detail modal, and export options.
 */

import React, { useState } from 'react';
import { Download, Trash2, ExternalLink, Wand2, Eye, X, Copy, Check } from 'lucide-react';
import { formatTime, calculateStatistics, getEffectiveTime } from './statistics.js';
import { deleteSolve, clearSolves, downloadSolvesExport } from '../../services/solveStorage.js';
import './history.css';

/**
 * @param {{
 *   solves: Array<object>,
 *   onSolvesChanged: (updatedSolves: Array<object>) => void,
 *   onOpenSimulator?: (scramble: string) => void,
 *   onOpenSolver?: (scramble: string) => void,
 * }} props
 */
export function HistoryView({ solves = [], onSolvesChanged, onOpenSimulator, onOpenSolver }) {
  const [selectedSolve, setSelectedSolve] = useState(null);
  const [copiedScramble, setCopiedScramble] = useState(false);

  const stats = calculateStatistics(solves);

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    const updated = deleteSolve(id);
    onSolvesChanged(updated);
    if (selectedSolve?.id === id) {
      setSelectedSolve(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all solve history? This cannot be undone.')) {
      clearSolves();
      onSolvesChanged([]);
      setSelectedSolve(null);
    }
  };

  const handleExportJSON = () => {
    downloadSolvesExport(solves, 'json');
  };

  const handleExportCSV = () => {
    downloadSolvesExport(solves, 'csv');
  };

  const handleCopyScramble = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedScramble(true);
      setTimeout(() => setCopiedScramble(false), 2000);
    }
  };

  // Solves in reverse chronological order for display (newest first)
  const reversedSolves = [...solves].reverse();

  return (
    <div className="history-container">
      {/* Header & Export Toolbar */}
      <div className="history-header">
        <div className="history-title-group">
          <h2 className="history-title">Solve History</h2>
          <span className="history-count-badge">{stats.count} solves</span>
        </div>

        <div className="history-toolbar">
          <button
            className="btn-history"
            onClick={handleExportJSON}
            disabled={solves.length === 0}
            title="Export solves as JSON"
          >
            <Download size={15} />
            <span>JSON</span>
          </button>

          <button
            className="btn-history"
            onClick={handleExportCSV}
            disabled={solves.length === 0}
            title="Export solves as CSV"
          >
            <Download size={15} />
            <span>CSV</span>
          </button>

          <button
            className="btn-history danger"
            onClick={handleClearAll}
            disabled={solves.length === 0}
            title="Clear all recorded solves"
          >
            <Trash2 size={15} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Statistics Overview */}
      <div className="stats-overview-grid">
        <div className="stat-card">
          <span className="stat-card-label">Best Single</span>
          <span className="stat-card-value best">{formatTime(stats.bestSingleTime)}</span>
          <span className="stat-card-sub">{stats.count > 0 ? 'PB record' : 'No solves'}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Current Ao5</span>
          <span className="stat-card-value highlight">
            {stats.ao5 === Infinity ? 'DNF' : formatTime(stats.ao5)}
          </span>
          <span className="stat-card-sub">
            Best: {stats.bestAo5 === Infinity ? 'DNF' : formatTime(stats.bestAo5)}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Current Ao12</span>
          <span className="stat-card-value highlight">
            {stats.ao12 === Infinity ? 'DNF' : formatTime(stats.ao12)}
          </span>
          <span className="stat-card-sub">
            Best: {stats.bestAo12 === Infinity ? 'DNF' : formatTime(stats.bestAo12)}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Session Mean</span>
          <span className="stat-card-value">
            {stats.sessionAverage === Infinity ? 'DNF' : formatTime(stats.sessionAverage)}
          </span>
          {stats.improvement.percentage !== null && (
            <span className={`stat-card-sub ${stats.improvement.improved ? 'improved' : ''}`}>
              {stats.improvement.improved ? '↓ ' : '↑ '}
              {Math.abs(stats.improvement.percentage)}% {stats.improvement.improved ? 'faster' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Solves Table */}
      <div className="history-table-wrapper">
        {reversedSolves.length === 0 ? (
          <div className="history-empty-state">
            No solves recorded yet. Head over to the Timer to begin speedcubing!
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Time</th>
                <th>Penalty</th>
                <th>Scramble</th>
                <th>Moves</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reversedSolves.map((solve, idx) => {
                const solveNum = reversedSolves.length - idx;
                const isDNF = solve.penalty === 'DNF';
                const isPlusTwo = solve.penalty === '+2';

                return (
                  <tr
                    key={solve.id}
                    onClick={() => setSelectedSolve(solve)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{solveNum}</td>
                    <td className={`col-time ${isDNF ? 'dnf' : isPlusTwo ? 'plus-two' : ''}`}>
                      {formatTime(solve.timeMs, solve.penalty)}
                    </td>
                    <td>{solve.penalty || '—'}</td>
                    <td className="col-scramble" title={solve.scramble}>
                      {solve.scramble}
                    </td>
                    <td>{solve.moveCount > 0 ? solve.moveCount : '—'}</td>
                    <td>{new Date(solve.date).toLocaleDateString()}</td>
                    <td className="col-actions">
                      <button
                        className="history-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSolve(solve);
                        }}
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>

                      {onOpenSimulator && (
                        <button
                          className="history-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSimulator(solve.scramble);
                          }}
                          title="Open scramble in 3D Simulator"
                        >
                          <ExternalLink size={15} />
                        </button>
                      )}

                      {onOpenSolver && (
                        <button
                          className="history-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSolver(solve.scramble);
                          }}
                          title="Solve scramble with Kociemba"
                        >
                          <Wand2 size={15} />
                        </button>
                      )}

                      <button
                        className="history-action-btn delete"
                        onClick={(e) => handleDelete(solve.id, e)}
                        title="Delete solve"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Solve Detail Modal */}
      {selectedSolve && (
        <div className="history-modal-overlay" onClick={() => setSelectedSolve(null)}>
          <div className="history-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Solve Details</span>
              <button className="history-action-btn" onClick={() => setSelectedSolve(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-time-large">
              {formatTime(selectedSolve.timeMs, selectedSolve.penalty)}
            </div>

            <div className="modal-section">
              <span className="modal-label">Raw Solve Time</span>
              <div>{selectedSolve.timeMs} ms ({formatTime(selectedSolve.timeMs)})</div>
            </div>

            {selectedSolve.penalty && (
              <div className="modal-section">
                <span className="modal-label">Applied Penalty</span>
                <div>{selectedSolve.penalty}</div>
              </div>
            )}

            <div className="modal-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="modal-label">Scramble</span>
                <button
                  className="history-action-btn"
                  onClick={() => handleCopyScramble(selectedSolve.scramble)}
                  title="Copy scramble"
                >
                  {copiedScramble ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="modal-code-box">{selectedSolve.scramble}</div>
            </div>

            {selectedSolve.solution && (
              <div className="modal-section">
                <span className="modal-label">Solution Algorithm</span>
                <div className="modal-code-box">{selectedSolve.solution}</div>
              </div>
            )}

            <div className="modal-section">
              <span className="modal-label">Recorded Date</span>
              <div>{new Date(selectedSolve.date).toLocaleString()}</div>
            </div>

            <div className="modal-footer">
              {onOpenSimulator && (
                <button
                  className="btn-history"
                  onClick={() => {
                    onOpenSimulator(selectedSolve.scramble);
                    setSelectedSolve(null);
                  }}
                >
                  <ExternalLink size={15} />
                  <span>3D Simulator</span>
                </button>
              )}

              {onOpenSolver && (
                <button
                  className="btn-history"
                  onClick={() => {
                    onOpenSolver(selectedSolve.scramble);
                    setSelectedSolve(null);
                  }}
                >
                  <Wand2 size={15} />
                  <span>Kociemba Solver</span>
                </button>
              )}

              <button
                className="btn-history danger"
                onClick={() => handleDelete(selectedSolve.id)}
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
