// Live vehicle tracking mirror.
// Main goal: show the exact rendered image produced by the real crew-cabin camera.
// Technique: the coordinator renders that Babylon camera, then copies the WebGL canvas into this 2D telemetry canvas.

export function createFlightView({canvas, sourceCanvas}) {
  const context = canvas.getContext('2d', {alpha: false});
  let active = false;
  let lastState = null;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round((rect.width || 320) * dpr));
    canvas.height = Math.max(1, Math.round((rect.height || 180) * dpr));
  }

  function mirror() {
    if (!context || !sourceCanvas) return;
    if (!canvas.width || !canvas.height) resizeCanvas();
    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    active = true;
  }

  function update(state) {
    lastState = state;
  }

  function resize() {
    resizeCanvas();
    mirror();
  }

  function getState() {
    return {
      active,
      altitudeKm: lastState?.altitudeKm ?? 0,
      sceneReady: active,
      sourceCamera: window.__CREW_CABIN_CAMERA?.name || null
    };
  }

  resizeCanvas();
  return {update, mirror, resize, getState, engine: null, scene: null};
}
