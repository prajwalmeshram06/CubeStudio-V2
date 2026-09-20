import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TrainingView } from '../../../src/features/training/TrainingView.jsx';

describe('TrainingView', () => {
  it('renders the beginner curriculum with nine numbered lessons', () => {
    const html = renderToString(React.createElement(TrainingView));
    expect(html).toContain('Beginner Method');
    expect(html).toContain('Training');
    expect(html).toContain('Cube Basics');
    expect(html).toContain('Cube Notation');
    expect(html).toContain('White Cross');
    expect(html).toContain('White Corners');
    expect(html).toContain('Second Layer');
    expect(html).toContain('Yellow Cross');
    expect(html).toContain('Yellow Face');
    expect(html).toContain('Last-Layer Corners');
    expect(html).toContain('Last-Layer Edges');
    expect(html).toContain('0 / 9 lessons complete');
  });
});
