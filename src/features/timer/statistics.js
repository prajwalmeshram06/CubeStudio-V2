/**
 * CubeStudio V2 - Timer Statistics & Formatting
 * Pure mathematical functions for WCA-compliant speedcubing statistics.
 *
 * Rules:
 * - Raw time (timeMs) is NEVER mutated.
 * - Effective time adds +2000ms for '+2' penalty and evaluates to Infinity for 'DNF'.
 * - Ao5 / Ao12 / Ao50 / Ao100 use standard WCA trimmed averaging:
 *   - Ao5: trim 1 fastest, 1 slowest. If >1 DNF -> Ao5 is DNF.
 *   - Ao12: trim 1 fastest, 1 slowest. If >1 DNF -> Ao12 is DNF.
 *   - Ao50: trim 5% (2) fastest, 5% (2) slowest. If >2 DNF -> DNF.
 *   - Ao100: trim 5% (5) fastest, 5% (5) slowest. If >5 DNF -> DNF.
 *   - Insufficient solves return null.
 */

/**
 * Calculates effective time in milliseconds for a solve record.
 * @param {{ timeMs: number, penalty: string|null }} solve
 * @returns {number}
 */
export function getEffectiveTime(solve) {
  if (!solve || typeof solve.timeMs !== 'number') return Infinity;
  if (solve.penalty === 'DNF') return Infinity;
  if (solve.penalty === '+2') return solve.timeMs + 2000;
  return solve.timeMs;
}

/**
 * Formats a time in milliseconds into standard speedcubing string format (mm:ss.xxx or ss.xxx).
 * @param {number|null|undefined} timeMs - Raw or effective time in milliseconds
 * @param {string|null} [penalty=null] - Penalty string ('+2', 'DNF', or null)
 * @param {object} [options]
 * @param {boolean} [options.showDecimals3=true] - If true, 3 decimals (e.g. 12.345); else 2 decimals
 * @returns {string}
 */
export function formatTime(timeMs, penalty = null, options = {}) {
  if (penalty === 'DNF') {
    return 'DNF';
  }

  if (timeMs === null || timeMs === undefined || !Number.isFinite(timeMs) || timeMs < 0) {
    return '—';
  }

  const effectiveMs = penalty === '+2' ? timeMs + 2000 : timeMs;
  const totalSeconds = effectiveMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const decimals = options.showDecimals3 === false ? 2 : 3;

  let formatted;
  if (minutes > 0) {
    const secStr = seconds.toFixed(decimals).padStart(decimals === 3 ? 6 : 5, '0');
    formatted = `${minutes}:${secStr}`;
  } else {
    formatted = seconds.toFixed(decimals);
  }

  if (penalty === '+2') {
    return `${formatted} (+2)`;
  }

  return formatted;
}

/**
 * Calculates WCA trimmed average for a window of solves.
 * @param {Array<{ timeMs: number, penalty: string|null }>} solves - Chronological solve list
 * @param {number} n - Window size (e.g. 5, 12, 50, 100)
 * @returns {number|null} Average in ms, Infinity for DNF, or null if insufficient solves
 */
export function calculateAoN(solves, n) {
  if (!Array.isArray(solves) || solves.length < n || n < 3) {
    return null;
  }

  const window = solves.slice(-n);

  // Determine trim count per side according to WCA regulations
  // WCA 9f1: For averages of 5: trim 1 best, 1 worst.
  // For averages of 12: trim 1 best, 1 worst (WCA official average of 12 is top 1 / bottom 1).
  // For n >= 20: trim Math.round(n * 0.05) from each side.
  let trimCount = 1;
  if (n >= 20) {
    trimCount = Math.round(n * 0.05);
  }

  // Count DNFs
  const dnfCount = window.filter(s => s.penalty === 'DNF').length;
  if (dnfCount > trimCount) {
    return Infinity; // DNF for the average
  }

  // Sort by effective time
  const times = window.map(s => getEffectiveTime(s)).sort((a, b) => a - b);

  // Trim best and worst
  const middle = times.slice(trimCount, times.length - trimCount);

  if (middle.length === 0) return null;

  const sum = middle.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / middle.length);
}

/**
 * Calculates the best AoN across all consecutive windows in solve history.
 * @param {Array<{ timeMs: number, penalty: string|null }>} solves
 * @param {number} n
 * @returns {number|null} Best average in ms, or null
 */
export function calculateBestAoN(solves, n) {
  if (!Array.isArray(solves) || solves.length < n) return null;

  let best = Infinity;
  for (let i = n; i <= solves.length; i++) {
    const sub = solves.slice(0, i);
    const ao = calculateAoN(sub, n);
    if (ao !== null && ao < best) {
      best = ao;
    }
  }

  return Number.isFinite(best) ? best : (best === Infinity ? Infinity : null);
}

/**
 * Calculates session average (mean of all valid solves or trimmed mean if >= 5).
 * @param {Array<{ timeMs: number, penalty: string|null }>} solves
 * @returns {number|null}
 */
export function calculateSessionAverage(solves) {
  if (!Array.isArray(solves) || solves.length === 0) return null;

  if (solves.length >= 5) {
    // Trim 5% each end
    const trim = Math.max(1, Math.floor(solves.length * 0.05));
    const dnfCount = solves.filter(s => s.penalty === 'DNF').length;
    if (dnfCount > trim) return Infinity;

    const times = solves.map(s => getEffectiveTime(s)).sort((a, b) => a - b);
    const middle = times.slice(trim, times.length - trim);
    if (middle.length === 0) return null;

    const sum = middle.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / middle.length);
  }

  // Fewer than 5 solves: arithmetic mean of all non-DNF solves
  const valid = solves.map(s => getEffectiveTime(s)).filter(t => Number.isFinite(t));
  if (valid.length === 0) return Infinity;

  const sum = valid.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / valid.length);
}

/**
 * Finds the best single solve in history.
 * @param {Array<{ timeMs: number, penalty: string|null }>} solves
 * @returns {{ solve: object|null, timeMs: number|null }}
 */
export function calculateBestSingle(solves) {
  if (!Array.isArray(solves) || solves.length === 0) {
    return { solve: null, timeMs: null };
  }

  let bestSolve = null;
  let bestTime = Infinity;

  for (const s of solves) {
    const eff = getEffectiveTime(s);
    if (eff < bestTime) {
      bestTime = eff;
      bestSolve = s;
    }
  }

  return {
    solve: bestSolve,
    timeMs: Number.isFinite(bestTime) ? bestTime : null
  };
}

/**
 * Calculates the improvement comparing initial performance to current performance.
 * Definition: Difference between initial Ao5 (or first solve) and current Ao5 (or current solve).
 * A positive number means faster (improved by X ms).
 * @param {Array<{ timeMs: number, penalty: string|null }>} solves
 * @returns {{ diffMs: number|null, percentage: number|null, improved: boolean }}
 */
export function calculateImprovement(solves) {
  if (!Array.isArray(solves) || solves.length < 2) {
    return { diffMs: null, percentage: null, improved: false };
  }

  let initialVal = null;
  let currentVal = null;

  if (solves.length >= 5) {
    initialVal = calculateAoN(solves.slice(0, 5), 5);
    currentVal = calculateAoN(solves, 5);
  } else {
    initialVal = getEffectiveTime(solves[0]);
    currentVal = getEffectiveTime(solves[solves.length - 1]);
  }

  if (!Number.isFinite(initialVal) || !Number.isFinite(currentVal) || initialVal <= 0) {
    return { diffMs: null, percentage: null, improved: false };
  }

  const diffMs = initialVal - currentVal;
  const percentage = Math.round((diffMs / initialVal) * 1000) / 10; // 1 decimal place

  return {
    diffMs,
    percentage,
    improved: diffMs > 0
  };
}

/**
 * Aggregates all statistics for the provided solves.
 * @param {Array<object>} solves
 * @returns {object}
 */
export function calculateStatistics(solves = []) {
  const count = Array.isArray(solves) ? solves.length : 0;
  const dnfCount = solves.filter(s => s.penalty === 'DNF').length;
  const plusTwoCount = solves.filter(s => s.penalty === '+2').length;

  const bestSingle = calculateBestSingle(solves);
  const sessionAverage = calculateSessionAverage(solves);
  const ao5 = calculateAoN(solves, 5);
  const ao12 = calculateAoN(solves, 12);
  const ao50 = calculateAoN(solves, 50);
  const ao100 = calculateAoN(solves, 100);

  const bestAo5 = calculateBestAoN(solves, 5);
  const bestAo12 = calculateBestAoN(solves, 12);
  const improvement = calculateImprovement(solves);

  return {
    count,
    dnfCount,
    plusTwoCount,
    bestSingleTime: bestSingle.timeMs,
    bestSingleSolve: bestSingle.solve,
    sessionAverage,
    ao5,
    ao12,
    ao50,
    ao100,
    bestAo5,
    bestAo12,
    improvement
  };
}
