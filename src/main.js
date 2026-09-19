/**
 * CubeStudio V2 - Entry Point
 * Phase 0: Pure Cube Domain and Engine
 */

import * as CubeEngine from './cube/index.js';

export * from './cube/index.js';

if (typeof window !== 'undefined') {
  window.CubeStudio = {
    version: '2.0.0',
    phase: 'Phase 0 - Foundation + Pure Cube Engine',
    engine: CubeEngine
  };
}
