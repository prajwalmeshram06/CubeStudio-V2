import { describe, it, expect } from 'vitest';
import { AnimationQueue } from '../../src/cube/rendering/AnimationQueue.js';

describe('AnimationQueue', () => {
  it('processes items in strict FIFO order', async () => {
    const executed = [];
    const queue = new AnimationQueue({
      processor: async (item) => {
        executed.push(item);
      }
    });

    queue.enqueue('A');
    queue.enqueue('B');
    queue.enqueue('C');

    // Wait for async queue processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(executed).toEqual(['A', 'B', 'C']);
    expect(queue.isBusy()).toBe(false);
  });

  it('enqueues multiple items via enqueueAll', async () => {
    const executed = [];
    const queue = new AnimationQueue({
      processor: async (item) => {
        executed.push(item);
      }
    });

    queue.enqueueAll(['U', 'R', "U'", "R'"]);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(executed).toEqual(['U', 'R', "U'", "R'"]);
  });

  it('flushes pending queue items on clear', async () => {
    const executed = [];
    const queue = new AnimationQueue({
      processor: async (item) => {
        executed.push(item);
        // Simulate slight delay
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    });

    queue.enqueue('1');
    queue.enqueue('2');
    queue.enqueue('3');
    queue.enqueue('4');

    // Clear after first item starts
    queue.clear();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(executed.length).toBeLessThan(4);
    expect(queue.length).toBe(0);
  });
});
