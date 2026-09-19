/**
 * Presentation component tests for TimerView.jsx and HistoryView.jsx
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TimerView } from '../../src/features/timer/TimerView.jsx';
import { HistoryView } from '../../src/features/timer/HistoryView.jsx';

describe('TimerView & HistoryView UI Components', () => {
  it('renders TimerView in IDLE state with initial scramble and controls', () => {
    const html = renderToString(React.createElement(TimerView));

    expect(html).toContain('timer-container');
    expect(html).toContain('timer-scramble-text');
    expect(html).toContain('15s WCA Inspection');
    expect(html).toContain('Timer');
    expect(html).toContain('History');
    expect(html).toContain('Press Space or Tap to Begin');
    expect(html).toContain('timer-digits');
    expect(html).toContain('Best');
    expect(html).toContain('Ao5');
    expect(html).toContain('Ao12');
    expect(html).toContain('Session Mean');
  });

  it('renders HistoryView with empty state when no solves are present', () => {
    const html = renderToString(
      React.createElement(HistoryView, {
        solves: [],
        onSolvesChanged: vi.fn(),
      })
    );
    const text = html.replace(/<!--.*?-->/g, '');

    expect(text).toContain('Solve History');
    expect(text).toContain('0 solves');
    expect(text).toContain('No solves recorded yet');
    expect(html).toContain('JSON');
    expect(html).toContain('CSV');
    expect(html).toContain('Clear');
  });

  it('renders HistoryView with solve table rows, statistics, and action buttons', () => {
    const sampleSolves = [
      {
        id: 's1',
        timeMs: 12450,
        penalty: null,
        scramble: "R U R' U'",
        moveCount: 45,
        date: '2026-09-19T10:00:00.000Z',
        solution: null,
      },
      {
        id: 's2',
        timeMs: 15300,
        penalty: '+2',
        scramble: 'F2 D2 L2',
        moveCount: 52,
        date: '2026-09-19T10:05:00.000Z',
        solution: null,
      },
    ];

    const html = renderToString(
      React.createElement(HistoryView, {
        solves: sampleSolves,
        onSolvesChanged: vi.fn(),
      })
    );
    const text = html.replace(/<!--.*?-->/g, '');

    expect(text).toContain('2 solves');
    expect(html).toContain('12.450');
    expect(html).toContain('17.300 (+2)'); // 15300 + 2000
    expect(html).toContain("R U R&#x27; U&#x27;");
    expect(html).toContain('F2 D2 L2');
    expect(html).toContain('45');
    expect(html).toContain('52');
  });
});
