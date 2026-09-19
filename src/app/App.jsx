/**
 * CubeStudio V2 - Main React Application
 */

import React from 'react';
import { SimulatorView } from '../features/simulator/SimulatorView.jsx';

export function App() {
  return (
    <div className="app-root">
      <SimulatorView />
    </div>
  );
}
