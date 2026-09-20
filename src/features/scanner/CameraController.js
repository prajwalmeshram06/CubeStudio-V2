/**
 * CubeStudio V2 — Phase 7A
 * CameraController: acquires and releases a MediaStream from the user's camera.
 *
 * Responsibilities:
 *  - Request camera permission
 *  - Return the stream for a <video> element to consume
 *  - Release all tracks on stop() to ensure no camera indicator remains
 *
 * This class has NO React dependency. Lifecycle must be managed by the
 * caller (useScannerEngine) so cleanup happens on component unmount.
 */

export class CameraController {
  constructor() {
    /** @type {MediaStream|null} */
    this._stream = null;
  }

  /**
   * Acquire a camera stream.
   * @param {'user'|'environment'} facingMode  'environment' = back camera (mobile), 'user' = front camera
   * @returns {Promise<MediaStream>}
   */
  async start(facingMode = 'environment') {
    // If already running, stop first to avoid duplicates
    if (this._stream) {
      this.stop();
    }

    const constraints = {
      video: {
        facingMode,
        width:  { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    };

    this._stream = await navigator.mediaDevices.getUserMedia(constraints);
    return this._stream;
  }

  /**
   * Release all tracks. Safe to call multiple times.
   */
  stop() {
    if (this._stream) {
      for (const track of this._stream.getTracks()) {
        track.stop();
      }
      this._stream = null;
    }
  }

  /**
   * @returns {MediaStream|null}
   */
  getStream() {
    return this._stream;
  }

  /**
   * True if camera is currently active.
   * @returns {boolean}
   */
  get isActive() {
    return this._stream !== null && this._stream.getTracks().some(t => t.readyState === 'live');
  }
}
