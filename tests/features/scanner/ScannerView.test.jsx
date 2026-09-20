import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ScannerView } from '../../../src/features/scanner/ScannerView.jsx';

describe('ScannerView Phase 7B UI Component', () => {
  it('renders 6-face progress stepper, target face header, and orientation guide', () => {
    const html = renderToString(React.createElement(ScannerView));
    const text = html.replace(/<!--.*?-->/g, '');

    expect(text).toContain('Cube Camera Scanner');
    expect(text).toContain('0 of 6 Faces Scanned');
    expect(text).toContain('Face:');
    expect(text).toContain('Target Center:');
    expect(text).toContain('Orientation Guide');
    expect(html).toContain('face-stepper-row');
    expect(html).toContain('scanner-view-container');
    expect(html).toContain('viewfinder-viewport');
  });
});
