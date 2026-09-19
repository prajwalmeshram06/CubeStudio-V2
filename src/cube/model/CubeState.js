/**
 * CubeStudio V2 - CubeState
 * The SINGLE authoritative source of truth for the logical Rubik's Cube state.
 *
 * Stored as a 54-element array of facelet identifiers in Kociemba standard order:
 * U (0..8), R (9..17), F (18..26), D (27..35), L (36..44), B (45..53)
 */

import {
  FACES,
  STICKERS_PER_FACE,
  FACELET_COUNT,
  SOLVED_FACELET_STRING,
  CENTER_STICKER_INDEX,
  CENTER_FACELET_INDICES
} from './constants.js';
import { toGlobalIndex, getFaceOffset } from './stickers.js';

export class CubeState {
  /**
   * @param {string[]|string} [initialState] - 54 facelet array or string. Defaults to solved state.
   */
  constructor(initialState) {
    if (!initialState) {
      this._facelets = SOLVED_FACELET_STRING.split('');
    } else if (typeof initialState === 'string') {
      if (initialState.length !== FACELET_COUNT) {
        throw new Error(`Invalid state string length: ${initialState.length}. Expected ${FACELET_COUNT}`);
      }
      this._facelets = initialState.split('');
    } else if (Array.isArray(initialState)) {
      if (initialState.length !== FACELET_COUNT) {
        throw new Error(`Invalid state array length: ${initialState.length}. Expected ${FACELET_COUNT}`);
      }
      this._facelets = [...initialState];
    } else {
      throw new Error(`Unsupported initial state format: ${typeof initialState}`);
    }
  }

  /**
   * Factory method to create a new solved CubeState.
   * @returns {CubeState}
   */
  static createSolved() {
    return new CubeState();
  }

  /**
   * Creates a deep clone of this CubeState.
   * @returns {CubeState}
   */
  clone() {
    return new CubeState(this._facelets);
  }

  /**
   * Returns a copy of the raw 54-facelet array.
   * @returns {string[]}
   */
  getFacelets() {
    return [...this._facelets];
  }

  /**
   * Gets a specific sticker facelet value by face and local sticker index (0..8).
   * @param {string} face - 'U'|'R'|'F'|'D'|'L'|'B'
   * @param {number} localIndex - 0..8
   * @returns {string}
   */
  getSticker(face, localIndex) {
    const globalIdx = toGlobalIndex(face, localIndex);
    return this._facelets[globalIdx];
  }

  /**
   * Sets a specific sticker facelet value.
   * @param {string} face - 'U'|'R'|'F'|'D'|'L'|'B'
   * @param {number} localIndex - 0..8
   * @param {string} value - Facelet char ('U', 'R', etc.)
   */
  setSticker(face, localIndex, value) {
    const globalIdx = toGlobalIndex(face, localIndex);
    this._facelets[globalIdx] = value;
  }

  /**
   * Gets all 9 stickers of a face in local 0..8 order.
   * @param {string} face
   * @returns {string[]}
   */
  getFace(face) {
    const offset = getFaceOffset(face);
    return this._facelets.slice(offset, offset + STICKERS_PER_FACE);
  }

  /**
   * Sets all 9 stickers of a face.
   * @param {string} face
   * @param {string[]} stickers - Array of 9 facelet chars
   */
  setFace(face, stickers) {
    if (!Array.isArray(stickers) || stickers.length !== STICKERS_PER_FACE) {
      throw new Error(`Expected 9 stickers for face ${face}, got ${stickers ? stickers.length : 0}`);
    }
    const offset = getFaceOffset(face);
    for (let i = 0; i < STICKERS_PER_FACE; i++) {
      this._facelets[offset + i] = stickers[i];
    }
  }

  /**
   * Returns the center facelet value of a face.
   * @param {string} face
   * @returns {string}
   */
  getCenter(face) {
    const globalIdx = CENTER_FACELET_INDICES[face];
    return this._facelets[globalIdx];
  }

  /**
   * Determines if the cube is currently in a solved state.
   * A cube is solved if each face consists entirely of the color/symbol of its center.
   * @returns {boolean}
   */
  isSolved() {
    for (const face of FACES) {
      const center = this.getCenter(face);
      const faceStickers = this.getFace(face);
      for (let i = 0; i < STICKERS_PER_FACE; i++) {
        if (faceStickers[i] !== center) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Compares state with another CubeState instance.
   * @param {CubeState} other
   * @returns {boolean}
   */
  equals(other) {
    if (!other || !(other instanceof CubeState)) return false;
    for (let i = 0; i < FACELET_COUNT; i++) {
      if (this._facelets[i] !== other._facelets[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Serializes the cube state.
   * @param {'string'|'json'|'array'} [format='string']
   * @returns {string|object|string[]}
   */
  serialize(format = 'string') {
    switch (format) {
      case 'string':
        return this._facelets.join('');
      case 'array':
        return [...this._facelets];
      case 'json': {
        const obj = {};
        for (const face of FACES) {
          obj[face] = this.getFace(face);
        }
        return obj;
      }
      default:
        throw new Error(`Unsupported serialization format: "${format}"`);
    }
  }

  /**
   * Deserializes data into a new CubeState.
   * @param {string|object|string[]} data
   * @returns {CubeState}
   */
  static deserialize(data) {
    if (typeof data === 'string') {
      return new CubeState(data);
    }
    if (Array.isArray(data)) {
      return new CubeState(data);
    }
    if (data && typeof data === 'object') {
      // Check for JSON face map { U: [...], R: [...], ... }
      const facelets = [];
      for (const face of FACES) {
        if (!Array.isArray(data[face]) || data[face].length !== STICKERS_PER_FACE) {
          throw new Error(`Invalid JSON format: missing or invalid face array for ${face}`);
        }
        facelets.push(...data[face]);
      }
      return new CubeState(facelets);
    }
    throw new Error(`Invalid data format for deserialization: ${typeof data}`);
  }

  toString() {
    return this.serialize('string');
  }
}
