// Onboard flight camera monitor.
// Main goal: report the view from a camera mounted just ahead of the crew cabin.
// Technique: transform the live Earth direction into the rocket's forward/right/up basis, so the horizon only appears where the crew should see it.

export function createFlightView({BABYLON, canvas}) {
  const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer: false, stencil: true}, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(.002, .006, .016, 1);
  const camera = new BABYLON.FreeCamera('crew cabin nose camera', new BABYLON.Vector3(0, 0, 0), scene);
  camera.setTarget(new BABYLON.Vector3(0, 0, 10));
  camera.fov = .82;
  scene.activeCamera = camera;

  const light = new BABYLON.HemisphericLight('onboard view fill', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = .72;
  const earth = BABYLON.MeshBuilder.CreateSphere('onboard Earth horizon', {diameter: 18, segments: 32}, scene);
  earth.position.set(0, -10, 27);
  const earthMaterial = new BABYLON.StandardMaterial('onboard Earth material', scene);
  earthMaterial.diffuseTexture = new BABYLON.Texture('assets/earth-day.jpg', scene);
  earthMaterial.specularColor = new BABYLON.Color3(.08, .1, .14);
  earth.material = earthMaterial;

  const atmosphere = BABYLON.MeshBuilder.CreateSphere('onboard atmosphere', {diameter: 18.35, segments: 32}, scene);
  atmosphere.position = earth.position.clone();
  const atmosphereMaterial = new BABYLON.StandardMaterial('onboard atmosphere material', scene);
  atmosphereMaterial.diffuseColor = new BABYLON.Color3(.08, .36, .8);
  atmosphereMaterial.emissiveColor = new BABYLON.Color3(.03, .16, .42);
  atmosphereMaterial.alpha = .16;
  atmosphereMaterial.backFaceCulling = false;
  atmosphere.material = atmosphereMaterial;

  const reticle = BABYLON.MeshBuilder.CreateTorus('onboard view reticle', {diameter: 1.2, thickness: .012, tessellation: 48}, scene);
  reticle.position.set(0, 0, 8);
  const reticleMaterial = new BABYLON.StandardMaterial('onboard reticle material', scene);
  reticleMaterial.emissiveColor = new BABYLON.Color3(.25, .85, 1);
  reticleMaterial.disableLighting = true;
  reticle.material = reticleMaterial;

  let active = false;
  let lastState = null;

  function update(state) {
    lastState = state;
    const altitudeFraction = Math.min(1, Math.max(0, (state?.altitudeKm || 0) / 200));
    const angle = state?.orbitAngle || 0;
    const radial = state?.startNormal && state?.tangent
      ? state.startNormal.scale(Math.cos(angle)).add(state.tangent.scale(Math.sin(angle))).normalize()
      : new BABYLON.Vector3(0, 1, 0);
    const forward = state?.flightDirection?.lengthSquared?.() > .000001 ? state.flightDirection.normalizeToNew() : radial;
    const reference = Math.abs(BABYLON.Vector3.Dot(forward, BABYLON.Vector3.Up())) > .94 ? BABYLON.Vector3.Right() : BABYLON.Vector3.Up();
    const right = BABYLON.Vector3.Cross(forward, reference).normalize();
    const up = BABYLON.Vector3.Cross(right, forward).normalize();
    const earthDirection = radial.scale(-1);
    const distance = 28 + altitudeFraction * 10;
    const earthX = BABYLON.Vector3.Dot(earthDirection, right) * distance;
    const earthY = BABYLON.Vector3.Dot(earthDirection, up) * distance;
    const earthZ = BABYLON.Vector3.Dot(earthDirection, forward) * distance;
    earth.position.set(earthX, earthY, earthZ);
    atmosphere.position.copyFrom(earth.position);
    camera.setTarget(new BABYLON.Vector3(0, 0, 10));
    reticle.rotation.z += .01;
    if (!active) {
      active = true;
      engine.resize();
    }
    scene.render();
  }

  function resize() {
    engine.resize();
    scene.render();
  }

  function getState() {
    return {active, altitudeKm: lastState?.altitudeKm ?? 0, sceneReady: scene.isReady()};
  }

  window.setInterval(() => {
    if (active) scene.render();
  }, 1000 / 30);

  return {update, resize, getState, engine, scene};
}
