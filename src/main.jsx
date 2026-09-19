/**
 * CubeStudio V2 - Entry Point
 * Phase 1: Three.js Renderer + Simulator Foundation
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import * as CubeEngine from './cube/index.js';

export * from './cube/index.js';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

if (typeof window !== 'undefined') {
  window.CubeStudio = {
    version: '2.0.0',
    phase: 'Phase 1 - Three.js Renderer + Simulator Foundation',
    engine: CubeEngine
  };
}
