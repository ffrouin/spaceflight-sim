// Shared simulation clock for visual celestial motion.
// Main goal: make Earth rotation, Moon orbit, and future mission time advance from one clock.
// Technique: accumulate simulation seconds from real frame time using an explicit multiplier.

export function createSimulationClock({initialSeconds = 0, timeScale = 1} = {}) {
  let simulationSeconds = initialSeconds;
  let multiplier = timeScale;
  return {
    tick(realDeltaSeconds) {
      simulationSeconds += Math.max(0, realDeltaSeconds) * multiplier;
      return simulationSeconds;
    },
    getSeconds() { return simulationSeconds; },
    getTimeScale() { return multiplier; },
    setTimeScale(value) { multiplier = Number.isFinite(Number(value)) ? Number(value) : multiplier; },
    setSeconds(value) { simulationSeconds = Number(value) || 0; }
  };
}
