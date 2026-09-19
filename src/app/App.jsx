/**
 * CubeStudio V2 - Main React Application
 * Provides navigation between 3D Simulator, Manual Editor, and future feature modules.
 */

import React, { useState } from 'react';
import { SimulatorView } from '../features/simulator/SimulatorView.jsx';
import { EditorView } from '../features/editor/EditorView.jsx';
import { CubeState } from '../cube/model/CubeState.js';
import './app.css';

export function App() {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'editor'
  const [sharedCubeState, setSharedCubeState] = useState(() => CubeState.createSolved());

  const handleOpenEditor = (state) => {
    if (state) setSharedCubeState(state);
    setActiveTab('editor');
  };

  const handleLoadIntoSimulator = (state) => {
    if (state) setSharedCubeState(state);
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
      </nav>

      {/* Main Content Area */}
      <main className="app-content">
        {activeTab === 'simulator' ? (
          <SimulatorView
            key={sharedCubeState.serialize('string')}
            initialCubeState={sharedCubeState}
            onOpenEditor={handleOpenEditor}
          />
        ) : (
          <EditorView
            initialCubeState={sharedCubeState}
            onLoadIntoSimulator={handleLoadIntoSimulator}
          />
        )}
      </main>
    </div>
  );
}
