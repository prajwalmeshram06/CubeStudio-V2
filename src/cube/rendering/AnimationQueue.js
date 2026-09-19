/**
 * CubeStudio V2 - Animation Queue
 * Sequentially processes moves, buffering rapid user inputs and scramble sequences.
 */

export class AnimationQueue {
  /**
   * @param {object} [options]
   * @param {(item: any) => Promise<void>} [options.processor]
   */
  constructor(options = {}) {
    this._queue = [];
    this._isProcessing = false;
    this._processor = options.processor || null;
    this._onEmpty = options.onEmpty || null;
  }

  /**
   * Sets the async processor function for queue items.
   * @param {(item: any) => Promise<void>} processor
   */
  setProcessor(processor) {
    this._processor = processor;
  }

  /**
   * Adds an item to the queue.
   * @param {any} item
   */
  enqueue(item) {
    this._queue.push(item);
    this._processNext();
  }

  /**
   * Adds multiple items to the queue in order.
   * @param {any[]} items
   */
  enqueueAll(items) {
    if (!Array.isArray(items)) return;
    this._queue.push(...items);
    this._processNext();
  }

  /**
   * Checks if the queue is currently processing or has pending items.
   * @returns {boolean}
   */
  isBusy() {
    return this._isProcessing || this._queue.length > 0;
  }

  /**
   * Returns current pending queue length.
   * @returns {number}
   */
  get length() {
    return this._queue.length;
  }

  /**
   * Flushes all pending items from the queue.
   */
  clear() {
    this._queue = [];
  }

  /**
   * Internal processing loop.
   */
  async _processNext() {
    if (this._isProcessing || this._queue.length === 0 || !this._processor) {
      if (this._queue.length === 0 && !this._isProcessing && this._onEmpty) {
        this._onEmpty();
      }
      return;
    }

    this._isProcessing = true;
    const item = this._queue.shift();

    try {
      await this._processor(item);
    } catch (err) {
      console.error('Error processing animation queue item:', err);
    } finally {
      this._isProcessing = false;
      this._processNext();
    }
  }
}
