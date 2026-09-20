import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ScannerView } from '../../../src/features/scanner/ScannerView.jsx';

describe('ScannerView UI Component', () => {
  it('renders scanner title, tips, and controls in initial state', () => {
    const html = renderToString(React.createElement(ScannerView));

    expect(html).toContain('Face Scanner');
    expect(html).toContain('Scanning Tips');
    expect(html).toContain('Capture Face');
    expect(html).toContain('Single Face Result');
    expect(html).toContain('No Face Captured Yet');
    expect(html).toContain('scanner-view-container');
    expect(html).toContain('viewfinder-viewport');
  });
});
