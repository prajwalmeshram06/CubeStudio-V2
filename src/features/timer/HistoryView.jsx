/**
 * CubeStudio V2 - Solve History & Performance View
 * Presentation component displaying solve history, statistics, detail modal, and export options.
 * Governed by DESIGN.md & Stitch Visual Reference (media_1789896645228.png).
 */

import React, { useState } from 'react';
import {
  Download,
  Trash2,
  ExternalLink,
  Wand2,
  Eye,
  X,
  Copy,
  Check,
  Trophy,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
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
      {/* Header & Export Toolbar (Stitch Reference) */}
      <div className="history-header">
        <div className="history-title-group">
          <div className="history-title-with-badge">
            <h2 className="history-title">Solve History &amp; Performance</h2>
            <span className="history-count-badge">{stats.count} solves</span>
          </div>
          <span className="history-subtitle">
            WCA Inspection Solve Archive • Offline Local Session Storage
          </span>
        </div>

        <div className="history-toolbar">
          <button
            className="btn-history-tool"
            onClick={handleExportCSV}
            disabled={solves.length === 0}
            title="Export solves as CSV file"
          >
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>

          <button
            className="btn-history-tool"
            onClick={handleExportJSON}
            disabled={solves.length === 0}
            title="Export solves as JSON file"
          >
            <FileCode size={14} />
            <span>Export JSON</span>
          </button>

          <button
            className="btn-history-tool danger"
            onClick={handleClearAll}
            disabled={solves.length === 0}
            title="Clear all recorded solves"
          >
            <Trash2 size={14} />
            <span>Clear Session</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Statistics Overview Cards (Stitch Reference) */}
      <div className="history-stats-grid">
        {/* Personal Best Single */}
        <div className="history-stat-card pb-card">
          <div className="stat-card-header">
            <span className="stat-card-label">PERSONAL BEST SINGLE</span>
            {stats.bestSingleTime && <span className="pb-tag"><Trophy size={10} /> PB</span>}
          </div>
          <div className="stat-card-value best">
            {formatTime(stats.bestSingleTime)}
          </div>
          <span className="stat-card-sub">
            {stats.count > 0 ? 'Fastest verified single' : 'No solves'}
          </span>
        </div>

        {/* Current Ao5 */}
        <div className="history-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">CURRENT AO5</span>
          </div>
          <div className="stat-card-value">
            {stats.ao5 === Infinity ? 'DNF' : formatTime(stats.ao5)}
          </div>
          <span className="stat-card-sub">
            Best Ao5: {stats.bestAo5 === Infinity ? 'DNF' : formatTime(stats.bestAo5)}
          </span>
        </div>

        {/* Current Ao12 */}
        <div className="history-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">CURRENT AO12</span>
          </div>
          <div className="stat-card-value">
            {stats.ao12 === Infinity ? 'DNF' : formatTime(stats.ao12)}
          </div>
          <span className="stat-card-sub">
            Best Ao12: {stats.bestAo12 === Infinity ? 'DNF' : formatTime(stats.bestAo12)}
          </span>
        </div>

        {/* Session Mean */}
        <div className="history-stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">SESSION MEAN</span>
          </div>
          <div className="stat-card-value">
            {stats.sessionAverage === Infinity ? 'DNF' : formatTime(stats.sessionAverage)}
          </div>
          <span className="stat-card-sub">
            {stats.improvement.percentage !== null ? (
              <span className={stats.improvement.improved ? 'trend-improved' : ''}>
                {stats.improvement.improved ? '↓ ' : '↑ '}
                {Math.abs(stats.improvement.percentage)}% session trend
              </span>
            ) : (
              'Overall average'
            )}
          </span>
        </div>
      </div>

      {/* Solves Table (Stitch Reference) */}
      <div className="history-table-wrapper">
        <div className="history-table-header-bar">
          <span className="table-header-title">LOGGED SOLVES</span>
        </div>

        {reversedSolves.length === 0 ? (
          <div className="history-empty-state">
            <p>No solves recorded yet. Head over to the Timer to begin speedcubing!</p>
          </div>
        ) : (
          <div className="table-scroll-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
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
                  const isPB = stats.bestSingleTime && solve.timeMs === stats.bestSingleTime && !solve.penalty;

                  return (
                    <tr
                      key={solve.id}
                      onClick={() => setSelectedSolve(solve)}
                      className="history-table-row"
                    >
                      <td className="col-index">
                        {isPB && <Trophy size={11} className="row-pb-icon" />}
                        #{solveNum}
                      </td>
                      <td className={`col-time ${isDNF ? 'dnf' : isPlusTwo ? 'plus-two' : ''}`}>
                        {formatTime(solve.timeMs, solve.penalty)}
                      </td>
                      <td>
                        {solve.penalty ? (
                          <span className={`table-penalty-tag ${solve.penalty === 'DNF' ? 'dnf' : 'plus-two'}`}>
                            {solve.penalty}
                          </span>
                        ) : (
                          <span className="table-penalty-none">—</span>
                        )}
                      </td>
                      <td className="col-scramble" title={solve.scramble}>
                        {solve.scramble}
                      </td>
                      <td className="col-moves">{solve.moveCount > 0 ? solve.moveCount : '—'}</td>
                      <td className="col-date">{new Date(solve.date).toLocaleDateString()}</td>
                      <td className="col-actions">
                        <button
                          className="table-action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSolve(solve);
                          }}
                          title="View inspection & reconstruction details"
                          aria-label="View solve details"
                        >
                          <Eye size={14} />
                        </button>

                        {onOpenSimulator && (
                          <button
                            className="table-action-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSimulator(solve.scramble);
                            }}
                            title="Open scramble in 3D Simulator"
                            aria-label="Open scramble in 3D Simulator"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}

                        {onOpenSolver && (
                          <button
                            className="table-action-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSolver(solve.scramble);
                            }}
                            title="Solve scramble with Kociemba solver"
                            aria-label="Solve scramble with Kociemba solver"
                          >
                            <Wand2 size={14} />
                          </button>
                        )}

                        <button
                          className="table-action-icon-btn delete"
                          onClick={(e) => handleDelete(solve.id, e)}
                          title="Delete solve record"
                          aria-label="Delete solve record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Solve Inspection & Reconstruction Detail Modal (Stitch Reference) */}
      {selectedSolve && (
        <div className="history-modal-overlay" onClick={() => setSelectedSolve(null)}>
          <div className="history-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-left">
                <span className="modal-index-pill">
                  #{solves.findIndex((s) => s.id === selectedSolve.id) + 1}
                </span>
                <span className="modal-title">Solve Inspection &amp; Reconstruction</span>
                {stats.bestSingleTime && selectedSolve.timeMs === stats.bestSingleTime && !selectedSolve.penalty && (
                  <span className="modal-pb-badge">PERSONAL BEST</span>
                )}
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedSolve(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-time-row">
              <div className="modal-time-block">
                <span className="modal-field-kicker">OFFICIAL TIME</span>
                <div className="modal-time-large">
                  {formatTime(selectedSolve.timeMs, selectedSolve.penalty)}
                  <span className="modal-ms-sub">({selectedSolve.timeMs} ms)</span>
                </div>
              </div>

              {selectedSolve.moveCount > 0 && (
                <div className="modal-turns-block">
                  <span className="modal-field-kicker">TOTAL MOVES</span>
                  <div className="modal-turns-value">{selectedSolve.moveCount} Turns</div>
                </div>
              )}
            </div>

            <div className="modal-section">
              <div className="modal-section-header">
                <span className="modal-field-kicker">WCA OFFICIAL SCRAMBLE</span>
                <button
                  className="modal-copy-btn"
                  onClick={() => handleCopyScramble(selectedSolve.scramble)}
                  title="Copy scramble"
                >
                  {copiedScramble ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedScramble ? 'Copied' : 'Copy Scramble'}</span>
                </button>
              </div>
              <div className="modal-code-box">{selectedSolve.scramble}</div>
            </div>

            {selectedSolve.solution && (
              <div className="modal-section">
                <span className="modal-field-kicker">SOLUTION ALGORITHM</span>
                <div className="modal-code-box solution">{selectedSolve.solution}</div>
              </div>
            )}

            <div className="modal-meta-row">
              <div className="modal-meta-item">
                <Calendar size={13} />
                <span>{new Date(selectedSolve.date).toLocaleString()}</span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-footer-btn danger"
                onClick={() => handleDelete(selectedSolve.id)}
              >
                <Trash2 size={14} />
                <span>Delete Solve</span>
              </button>

              <div className="modal-footer-right">
                {onOpenSolver && (
                  <button
                    className="modal-footer-btn secondary"
                    onClick={() => {
                      onOpenSolver(selectedSolve.scramble);
                      setSelectedSolve(null);
                    }}
                  >
                    <Wand2 size={14} />
                    <span>Open in Solver</span>
                  </button>
                )}

                {onOpenSimulator && (
                  <button
                    className="modal-footer-btn primary"
                    onClick={() => {
                      onOpenSimulator(selectedSolve.scramble);
                      setSelectedSolve(null);
                    }}
                  >
                    <Layers size={14} />
                    <span>Open in 3D Simulator</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryView;
