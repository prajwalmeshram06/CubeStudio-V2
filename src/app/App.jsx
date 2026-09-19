/**
 * CubeStudio V2 - Main React Application
 * Provides navigation between 3D Simulator, Manual Editor, and Solver.
 */

import React, { useState } from 'react';
import { SimulatorView } from '../features/simulator/SimulatorView.jsx';
import { EditorView } from '../features/editor/EditorView.jsx';
import { SolverView } from '../features/solver/SolverView.jsx';
import { CubeState } from '../cube/model/CubeState.js';
import './app.css';

export function App() {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'editor' | 'solver'
  const [sharedCubeState, setSharedCubeState] = useState(() => CubeState.createSolved());
  const [pendingSolutionMoves, setPendingSolutionMoves] = useState(null);

  const handleOpenEditor = (state) => {
    if (state) setSharedCubeState(state);
    setActiveTab('editor');
  };

  const handleOpenSolver = (state) => {
    if (state) setSharedCubeState(state);
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
      </nav>

      {/* Main Content Area */}
      <main className="app-content">
        {activeTab === 'simulator' && (
          <SimulatorView
            key={sharedCubeState.serialize('string') + (pendingSolutionMoves ? '-sol' : '')}
            initialCubeState={sharedCubeState}
            initialAlgorithm={pendingSolutionMoves}
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
      </main>
    </div>
  );
}
