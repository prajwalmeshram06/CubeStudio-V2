/**
 * CubeStudio V2 - Main React Application
 * Provides navigation between 3D Simulator, Manual Editor, Solver, Speedcubing Timer, and Training.
 */

import React, { useState } from 'react';
import { SimulatorView } from '../features/simulator/SimulatorView.jsx';
import { EditorView } from '../features/editor/EditorView.jsx';
import { SolverView } from '../features/solver/SolverView.jsx';
import { TimerView } from '../features/timer/TimerView.jsx';
import { TrainingView } from '../features/training/TrainingView.jsx';
import { CubeState } from '../cube/model/CubeState.js';
import { parseAlgorithm } from '../cube/model/notation.js';
import { applyMove } from '../cube/engine/applyMove.js';
import './app.css';

export function App() {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'editor' | 'solver' | 'timer' | 'training'
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
      {/* Top Navigation Bar */}
      <nav className="app-nav">
        <button
          className={`nav-tab ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          3D Simulator
        </button>
        <button
          className={`nav-tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          Manual Editor
        </button>
        <button
          className={`nav-tab ${activeTab === 'solver' ? 'active' : ''}`}
          onClick={() => setActiveTab('solver')}
        >
          Solver
        </button>
        <button
          className={`nav-tab ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          Timer
        </button>
        <button
          className={`nav-tab ${activeTab === 'training' ? 'active' : ''}`}
          onClick={() => setActiveTab('training')}
        >
          Training
        </button>
      </nav>

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
      </main>
    </div>
  );
}
