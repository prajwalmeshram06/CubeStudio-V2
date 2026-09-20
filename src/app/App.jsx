/**
 * CubeStudio V2 - Main React Application
 * Provides navigation between 3D Simulator, Manual Editor, Solver, Speedcubing Timer, and Training.
 * Governed by DESIGN.md and Stitch Visual Specifications.
 */

import React, { useState } from 'react';
import { Box, Layers, Wand2, Timer, GraduationCap, Camera } from 'lucide-react';
import { SimulatorView } from '../features/simulator/SimulatorView.jsx';
import { EditorView } from '../features/editor/EditorView.jsx';
import { SolverView } from '../features/solver/SolverView.jsx';
import { TimerView } from '../features/timer/TimerView.jsx';
import { TrainingView } from '../features/training/TrainingView.jsx';
import { ScannerView } from '../features/scanner/ScannerView.jsx';
import { CubeState } from '../cube/model/CubeState.js';
import { parseAlgorithm } from '../cube/model/notation.js';
import { applyMove } from '../cube/engine/applyMove.js';
import '../styles/tokens.css';
import './app.css';

export function App() {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'editor' | 'solver' | 'timer' | 'training' | 'scanner'
  const [sharedCubeState, setSharedCubeState] = useState(() => CubeState.createSolved());
  const [pendingSolutionMoves, setPendingSolutionMoves] = useState(null);

  const handleOpenEditor = (state) => {
    if (state) setSharedCubeState(state);
    setActiveTab('editor');
  };

  const handleOpenSolver = (stateOrScramble) => {
    if (typeof stateOrScramble === 'string') {
      // Scramble algorithm string from Timer
      let state = CubeState.createSolved();
      try {
        const moves = parseAlgorithm(stateOrScramble);
        for (const m of moves) {
          state = applyMove(state, m);
        }
      } catch (err) {
        console.warn('Failed to parse scramble:', err);
      }
      setSharedCubeState(state);
    } else if (stateOrScramble) {
      setSharedCubeState(stateOrScramble);
    }
    setActiveTab('solver');
  };

  const handleLoadIntoSimulator = (state) => {
    if (state) setSharedCubeState(state);
    setPendingSolutionMoves(null);
    setActiveTab('simulator');
  };

  const handleApplySolution = (moves) => {
    setPendingSolutionMoves(moves);
    setActiveTab('simulator');
  };

  const handleOpenSimulatorWithScramble = (scrambleString) => {
    let state = CubeState.createSolved();
    try {
      const moves = parseAlgorithm(scrambleString);
      for (const m of moves) {
        state = applyMove(state, m);
      }
    } catch (err) {
      console.warn('Failed to parse scramble for simulator:', err);
    }
    setSharedCubeState(state);
    setPendingSolutionMoves(null);
    setActiveTab('simulator');
  };

  return (
    <div className="app-root">
      {/* Top Floating Pill Navigation Bar (Stitch Design Specification) */}
      <header className="app-nav-wrapper">
        <nav className="app-nav" aria-label="Main Navigation">
          {/* Brand Logo & Title */}
          <div className="nav-brand" onClick={() => setActiveTab('simulator')} title="CubeStudio V2">
            <div className="nav-brand-icon">
              <Box size={16} />
            </div>
            <span className="nav-brand-title">CubeStudio <span className="nav-brand-v">V2</span></span>
          </div>

          <div className="nav-divider" />

          {/* Nav Tabs */}
          <div className="nav-tabs-group" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'simulator'}
              className={`nav-tab ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulator')}
            >
              <span>Simulator</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'editor'}
              className={`nav-tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <span>Editor</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'solver'}
              className={`nav-tab ${activeTab === 'solver' ? 'active' : ''}`}
              onClick={() => setActiveTab('solver')}
            >
              <span>Solver</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'timer'}
              className={`nav-tab ${activeTab === 'timer' ? 'active' : ''}`}
              onClick={() => setActiveTab('timer')}
            >
              <span>Timer</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'training'}
              className={`nav-tab ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              <span>Training</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'scanner'}
              className={`nav-tab ${activeTab === 'scanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('scanner')}
            >
              <span>Scanner</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="app-content">
        {activeTab === 'simulator' && (
          <SimulatorView
            key="simulator-main"
            initialCubeState={sharedCubeState}
            solutionMoves={pendingSolutionMoves}
            onOpenEditor={handleOpenEditor}
            onOpenSolver={handleOpenSolver}
          />
        )}
        {activeTab === 'editor' && (
          <EditorView
            initialCubeState={sharedCubeState}
            onLoadIntoSimulator={handleLoadIntoSimulator}
            onOpenSolver={handleOpenSolver}
          />
        )}
        {activeTab === 'solver' && (
          <SolverView
            cubeState={sharedCubeState}
            onApplySolution={handleApplySolution}
          />
        )}
        {activeTab === 'timer' && (
          <TimerView
            onOpenSimulator={handleOpenSimulatorWithScramble}
            onOpenSolver={handleOpenSolver}
          />
        )}
        {activeTab === 'training' && (
          <TrainingView />
        )}
        {activeTab === 'scanner' && (
          <ScannerView />
        )}
      </main>
    </div>
  );
}
export default App;
