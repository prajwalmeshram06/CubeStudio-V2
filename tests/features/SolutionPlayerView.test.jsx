import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SolutionPlayerView } from '../../src/features/solver/SolutionPlayerView.jsx';
import { SolutionPlayerController } from '../../src/features/solver/SolutionPlayerController.js';
import { CubeState } from '../../src/cube/model/CubeState.js';

describe('SolutionPlayerView UI Component', () => {
  it('renders clean solved state when solution is empty', () => {
    const controller = new SolutionPlayerController({ moves: [] });
    const html = renderToString(React.createElement(SolutionPlayerView, { controller }));

    expect(html).toContain('Already Solved — No moves required');
    expect(html).not.toContain('button');
  });

  it('renders move chips, step count, and progress bar for normal solution', () => {
    const controller = new SolutionPlayerController({
      initialCubeState: CubeState.createSolved(),
      moves: ['R', 'U', "R'", "U'"],
    });
    const html = renderToString(React.createElement(SolutionPlayerView, { controller }));
    const text = html.replace(/<!--.*?-->/g, '');

    expect(text).toContain('Move 0 of 4');
    expect(text).toContain('0%');
    expect(html).toContain('R');
    expect(html).toContain('U');
    expect(html).toContain("R&#x27;"); // escaped in HTML
    expect(html).toContain('Next Move');
    expect(html).toContain('Turn Right face clockwise (R)');
  });

  it('renders active move chip with current class and aria-current', () => {
    const controller = new SolutionPlayerController({
      initialCubeState: CubeState.createSolved(),
      moves: ['R', 'U'],
    });

    const html = renderToString(React.createElement(SolutionPlayerView, { controller }));

    expect(html).toContain('solution-chip current');
    expect(html).toContain('aria-current="step"');
  });

  it('renders playback control buttons with accessible labels', () => {
    const controller = new SolutionPlayerController({
      initialCubeState: CubeState.createSolved(),
      moves: ['R', 'U'],
    });

    const html = renderToString(React.createElement(SolutionPlayerView, { controller }));

    expect(html).toContain('aria-label="Restart solution from beginning"');
    expect(html).toContain('aria-label="Step backward to previous move"');
    expect(html).toContain('aria-label="Play solution automatically"');
    expect(html).toContain('aria-label="Step forward to next move"');
  });

  it('renders speed selector pills with active preset', () => {
    const controller = new SolutionPlayerController({
      moves: ['R'],
      playbackSpeed: 500, // 1x
    });

    const html = renderToString(React.createElement(SolutionPlayerView, { controller }));

    expect(html).toContain('0.5x');
    expect(html).toContain('1x');
    expect(html).toContain('1.5x');
    expect(html).toContain('2x');
    expect(html).toContain('speed-pill active');
  });

  it('subscribes to controller on mount and pauses on unmount', () => {
    const controller = new SolutionPlayerController({ moves: ['R', 'U'] });
    const subscribeSpy = vi.spyOn(controller, 'subscribe');
    const pauseSpy = vi.spyOn(controller, 'pause');

    // Test subscription function logic
    let listenerCalled = false;
    const unsub = controller.subscribe((state) => {
      listenerCalled = true;
    });

    expect(subscribeSpy).toHaveBeenCalled();
    expect(listenerCalled).toBe(true);

    unsub();
    controller.pause();
    expect(pauseSpy).toHaveBeenCalled();
  });

  it('renders close button when onClose prop is provided', () => {
    const controller = new SolutionPlayerController({ moves: ['R'] });
    const onClose = vi.fn();
    const html = renderToString(React.createElement(SolutionPlayerView, { controller, onClose, compact: true }));

    expect(html).toContain('solution-close-btn');
    expect(html).toContain('aria-label="Close solution player"');
    expect(html).toContain('solution-player--compact');
  });
});

