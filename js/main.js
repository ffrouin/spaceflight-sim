// Main welcome-page coordinator.
// Main goal: connect the Babylon scene, real launch-site selection, and one shared simulation clock.
// Technique: keep domain logic in modules and let this file only coordinate browser/UI/runtime wiring.

import { ATMOSPHERE, isaAtmosphereAt } from './atmosphere-model.js';
import { LAUNCH_PLATFORMS, latLonToEarthVector } from './launch-platforms.js';
import { createLaunchWizard } from './launch-wizard.js';
import { LAUNCH_VEHICLES } from './launch-vehicles.js';
import { createRocketSystem } from './rocket-system.js';
import { createFlightView } from './flight-view.js';
import { createCelestialSystem } from './celestial-system.js';
import { createSimulationClock } from './simulation-clock.js';
import { createLaunchScene } from './launch-scene.js';

const canvas = document.getElementById('renderCanvas');
const sceneSurfaceNode = canvas.closest('.scene');
const statusNode = document.getElementById('sceneStatus');
const assetNode = document.getElementById('assetStatus');
const errorNode = document.getElementById('error');
const planetLabelNode = document.getElementById('planetLabel');
const platformListNode = document.getElementById('platformList');
const countrySelectNode = document.getElementById('countrySelect');
const countryBenefitNode = document.getElementById('countryBenefit');
const selectedPlatformNode = document.getElementById('selectedPlatform');
const atmosphereAltitudeNode = document.getElementById('atmosphereAltitude');
const airDensityNode = document.getElementById('airDensity');
const airPressureNode = document.getElementById('airPressure');
const airTemperatureNode = document.getElementById('airTemperature');
const continueToRocketNode = document.getElementById('continueToRocket');
const launchPanelNode = document.getElementById('launchPanel');
const rocketDockNode = document.getElementById('rocketDock');
const rocketPanelNode = document.getElementById('rocketPanel');
const rocketListNode = document.getElementById('rocketList');
const rocketInfoNode = document.getElementById('rocketInfo');
const rocketComponentsNode = document.getElementById('rocketComponents');
const separationButtonNode = document.getElementById('previewSeparation');
const launchButtonNode = document.getElementById('launchRocket');
const rocketPreviewCanvas = document.getElementById('rocketPreviewCanvas');
const tabletStatusNode = document.getElementById('tabletStatus');
const flightTelemetryNode = document.getElementById('flightTelemetry');
const telemetryStateNode = document.getElementById('telemetryState');
const telemetryTimeNode = document.getElementById('telemetryTime');
const telemetryAltitudeNode = document.getElementById('telemetryAltitude');
const telemetrySpeedNode = document.getElementById('telemetrySpeed');
const telemetryRadiusNode = document.getElementById('telemetryRadius');
const telemetryTraceNode = document.getElementById('telemetryTrace');
const telemetryNoteNode = document.getElementById('telemetryNote');
const inspectCrewCameraNode = document.getElementById('inspectCrewCamera');
const crewOrientationControlsNode = document.getElementById('crewOrientationControls');
const crewYawNode = document.getElementById('crewYaw');
const crewPitchNode = document.getElementById('crewPitch');
const crewRollNode = document.getElementById('crewRoll');
const crewYawValueNode = document.getElementById('crewYawValue');
const crewPitchValueNode = document.getElementById('crewPitchValue');
const crewRollValueNode = document.getElementById('crewRollValue');
const resetCrewOrientationNode = document.getElementById('resetCrewOrientation');
const flightViewCanvas = document.getElementById('flightViewCanvas');
const telemetryHandleNode = document.getElementById('telemetryHandle');
const timeControlPanelNode = document.getElementById('timeControlPanel');
const timeControlHandleNode = document.getElementById('timeControlHandle');
const timeRateLabelNode = document.getElementById('timeRateLabel');
const timeControlStatusNode = document.getElementById('timeControlStatus');
const timeButtons = [...document.querySelectorAll('[data-time-rate]')];
const sceneTransitionNode = document.getElementById('sceneTransition');

// Expose the physical launch reference for the later wizard stages and review tooling.
window.__ATMOSPHERE_MODEL = { constants: ATMOSPHERE, atAltitude: isaAtmosphereAt };
window.__LAUNCH_PLATFORMS = LAUNCH_PLATFORMS;
window.__LAUNCH_VEHICLES = LAUNCH_VEHICLES;

function fail(message) {
  errorNode.textContent = message;
  errorNode.classList.remove('hidden');
  statusNode.textContent = 'rendering unavailable';
}

function makePanelMovable(panel, handle) {
  let drag = null;
  handle.addEventListener('pointerdown', event => {
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.transform = 'none';
    drag = {x: event.clientX, y: event.clientY, left: rect.left, top: rect.top};
    try { handle.setPointerCapture(event.pointerId); } catch (error) { /* Synthetic browser events may not own a pointer. */ }
  });
  handle.addEventListener('pointermove', event => {
    if (!drag) return;
    const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
    panel.style.left = `${Math.min(maxLeft, Math.max(8, drag.left + event.clientX - drag.x))}px`;
    panel.style.top = `${Math.min(maxTop, Math.max(8, drag.top + event.clientY - drag.y))}px`;
  });
  handle.addEventListener('pointerup', () => { drag = null; });
  handle.addEventListener('pointercancel', () => { drag = null; });
}

makePanelMovable(flightTelemetryNode, telemetryHandleNode);
makePanelMovable(timeControlPanelNode, timeControlHandleNode);

if (!window.BABYLON) {
  fail('Babylon.js could not load. Check the network connection and reload the page.');
  throw new Error('Babylon.js unavailable');
}

const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true }, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.004, 0.008, 0.02, 1);
scene.imageProcessingConfiguration.exposure = 1.12;
scene.imageProcessingConfiguration.contrast = 1.08;

const WORLD_SCALE = 333;
const EARTH_RADIUS_SCENE = 3 * WORLD_SCALE;

// The camera starts in the same enlarged world unit system as the celestial bodies.
const camera = new BABYLON.ArcRotateCamera('Earth inspection camera', -Math.PI * 0.58, Math.PI * 0.38, 14 * WORLD_SCALE, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 0.1;
camera.upperRadiusLimit = 100_000_000;
camera.wheelDeltaPercentage = 0.012;
camera.minZ = 0.01;
camera.maxZ = EARTH_RADIUS_SCENE * 480 * 4;
let focusedBody = null;

// A low neutral fill keeps the Earth surface inspectable without a glare post-process.
const fillLight = new BABYLON.HemisphericLight('Neutral scene fill', new BABYLON.Vector3(0, 1, 0), scene);
fillLight.intensity = 0.08;
fillLight.diffuse = new BABYLON.Color3(0.38, 0.45, 0.62);
fillLight.groundColor = new BABYLON.Color3(0.01, 0.02, 0.05);

function createStars(worldScale = 1) {
  // A small procedural star field provides depth without competing with the globe.
  const stars = new BABYLON.ParticleSystem('welcome star field', 900, scene);
  const starExtent = 70 * worldScale;
  stars.particleTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+9Q2a7wAAAABJRU5ErkJggg==', scene);
  stars.minEmitBox = new BABYLON.Vector3(-starExtent, -starExtent, -starExtent);
  stars.maxEmitBox = new BABYLON.Vector3(starExtent, starExtent, starExtent);
  stars.minSize = 0.018 * worldScale;
  stars.maxSize = 0.06 * worldScale;
  stars.minLifeTime = 999999;
  stars.maxLifeTime = 999999;
  stars.emitRate = 900;
  stars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  stars.color1 = new BABYLON.Color4(0.72, 0.84, 1, 0.65);
  stars.color2 = new BABYLON.Color4(1, 0.85, 0.62, 0.55);
  stars.gravity = BABYLON.Vector3.Zero();
  stars.direction1 = BABYLON.Vector3.Zero();
  stars.direction2 = BABYLON.Vector3.Zero();
  stars.start();
}

createStars(WORLD_SCALE);
const celestial = createCelestialSystem({ BABYLON, scene, earthRadiusScene: EARTH_RADIUS_SCENE });
const WELCOME_TIME_SCALE = 60;
const clock = createSimulationClock({ timeScale: WELCOME_TIME_SCALE }); // Welcome view: 1 real second advances 1 simulated minute.
let launchTimeRate = 1;

function setLaunchTimeRate(rate) {
  launchTimeRate = Math.max(0, Number(rate) || 0);
  clock.setTimeScale(launchTimeRate);
  timeRateLabelNode.textContent = `${launchTimeRate}× ${launchTimeRate === 0 ? 'PAUSED' : 'REAL TIME'}`;
  timeControlStatusNode.textContent = launchTimeRate === 0 ? 'Simulation paused. Press 1× to resume.' : `1 real second = ${launchTimeRate} simulated second${launchTimeRate === 1 ? '' : 's'}.`;
  timeButtons.forEach(button => button.classList.toggle('selected', Number(button.dataset.timeRate) === launchTimeRate));
}

timeButtons.forEach(button => button.addEventListener('click', () => setLaunchTimeRate(button.dataset.timeRate)));

celestial.update(0);
earthTargetFix();

function earthTargetFix() {
  celestial.earth.computeWorldMatrix(true);
  camera.setTarget(celestial.earth.getAbsolutePosition());
  camera.radius = 14 * WORLD_SCALE;
}

function followEarthTarget() {
  const launch = rocketSystem?.getLaunchState?.();
  if (launch && rocketSystem.getRocketRoot?.()) {
    camera.target.copyFrom(rocketSystem.getRocketRoot().getAbsolutePosition());
    return;
  }
  if (focusedBody) {
    camera.target.copyFrom(focusedBody.getAbsolutePosition());
    return;
  }
  const selected = launchWizard?.getSelectedPlatform?.();
  const focusNode = selected ? launchWizard.platformMarkers.get(selected.id) : celestial.earth;
  camera.target.copyFrom(focusNode?.getAbsolutePosition?.() || celestial.earth.getAbsolutePosition());
}

function enforceMainCameraClearance() {
  const cameraPosition = camera.globalPosition.clone();
  const bodies = [
    [celestial.earth, celestial.earthRadiusScene],
    [celestial.moon, celestial.moonRadiusScene],
    [celestial.sun, celestial.sunRadiusScene]
  ];
  for (const [body, radius] of bodies) {
    if (!body?.isEnabled?.()) continue;
    const center = body.getAbsolutePosition();
    const offset = cameraPosition.subtract(center);
    const distance = offset.length();
    const minimumDistance = radius + Math.max(2, radius * .015);
    if (distance < minimumDistance) {
      const safeDirection = distance > .000001 ? offset.scale(1 / distance) : BABYLON.Vector3.Up();
      camera.setPosition(center.add(safeDirection.scale(minimumDistance)));
      cameraPosition.copyFrom(camera.globalPosition);
    }
  }
  const root = rocketSystem?.getRocketRoot?.();
  if (root?.isEnabled?.()) {
    root.computeWorldMatrix(true);
    const bounds = root.getHierarchyBoundingVectors(true);
    const center = bounds.min.add(bounds.max).scale(.5);
    const halfExtents = bounds.max.subtract(bounds.min).scale(.5);
    const rocketRadius = halfExtents.length();
    const offset = camera.globalPosition.subtract(center);
    const distance = offset.length();
    const minimumDistance = rocketRadius + Math.max(2, rocketRadius * .08);
    if (distance < minimumDistance) {
      const safeDirection = distance > .000001 ? offset.scale(1 / distance) : BABYLON.Vector3.Up();
      camera.setPosition(center.add(safeDirection.scale(minimumDistance)));
    }
  }
}

function updateLaunchAtmosphere(platform) {
  const altitudeM = platform.elevationM ?? 0;
  const atmosphere = isaAtmosphereAt(altitudeM);
  atmosphereAltitudeNode.textContent = `${altitudeM.toLocaleString()} m MSL`;
  airDensityNode.textContent = `${atmosphere.densityKgM3.toFixed(3)} kg/m³`;
  airPressureNode.textContent = `${Math.round(atmosphere.pressurePa).toLocaleString()} Pa`;
  airTemperatureNode.textContent = `${atmosphere.temperatureK.toFixed(2)} K · ${(atmosphere.temperatureK - 273.15).toFixed(1)} °C`;
}

const platformMarkerRoot = new BABYLON.TransformNode('launch platform marker root', scene);
platformMarkerRoot.parent = celestial.earth;
const launchWizard = createLaunchWizard({
  BABYLON, scene, earthRadiusScene: celestial.earthRadiusScene, platforms: LAUNCH_PLATFORMS, defaultPlatformId: 'kourou-ela3',
  platformListNode, countrySelectNode, countryBenefitNode, selectedPlatformNode, statusNode, camera, markerRoot: platformMarkerRoot,
  latLonToEarthVector,
  onPlatformSelected: (platform, userInitiated) => {
    focusedBody = null;
    updateLaunchAtmosphere(platform);
    if (userInitiated) {
      continueToRocketNode.disabled = false;
      continueToRocketNode.textContent = 'Continue · choose a crewed rocket';
      statusNode.textContent = `launch platform confirmed · ${platform.name}`;
    }
  }
});
const defaultLaunchPlatform = launchWizard.getSelectedPlatform();
continueToRocketNode.disabled = !defaultLaunchPlatform;
continueToRocketNode.textContent = defaultLaunchPlatform ? 'Continue · choose a crewed rocket' : 'Select a launch platform first';
const rocketSystem = createRocketSystem({
  BABYLON, scene, rocketListNode, rocketInfoNode, rocketComponentsNode, separationButtonNode, launchButtonNode,
  vehicleCatalog: LAUNCH_VEHICLES, camera, getSelectedPlatform: launchWizard.getSelectedPlatform, earth: celestial.earth,
  previewCanvas: rocketPreviewCanvas, tabletStatusNode
});
const crewCabinCamera = new BABYLON.FreeCamera('crew cabin camera · main Babylon scene', new BABYLON.Vector3(0, 0, 0), scene);
crewCabinCamera.minZ = .001;
crewCabinCamera.fov = .82;
let inspectingCrewCamera = false;
const crewCameraOrientation = {yawDeg: 0, pitchDeg: 0, rollDeg: 0};
function updateCrewOrientationLabels() {
  crewYawValueNode.textContent = `${crewCameraOrientation.yawDeg}°`;
  crewPitchValueNode.textContent = `${crewCameraOrientation.pitchDeg}°`;
  crewRollValueNode.textContent = `${crewCameraOrientation.rollDeg}°`;
}
function applyCrewCameraOrientation() {
  if (!crewCabinCamera.rotationQuaternion) return;
  const offset = BABYLON.Quaternion.RotationYawPitchRoll(
    BABYLON.Tools.ToRadians(crewCameraOrientation.yawDeg),
    BABYLON.Tools.ToRadians(crewCameraOrientation.pitchDeg),
    BABYLON.Tools.ToRadians(crewCameraOrientation.rollDeg)
  );
  crewCabinCamera.rotationQuaternion = crewCabinCamera.rotationQuaternion.multiply(offset);
}
function setCrewOrientation(axis, value) {
  crewCameraOrientation[axis] = Number(value) || 0;
  updateCrewOrientationLabels();
  window.__CREW_CAMERA_ORIENTATION = {...crewCameraOrientation};
}
function resetCrewOrientation() {
  crewCameraOrientation.yawDeg = 0;
  crewCameraOrientation.pitchDeg = 0;
  crewCameraOrientation.rollDeg = 0;
  crewYawNode.value = '0';
  crewPitchNode.value = '0';
  crewRollNode.value = '0';
  updateCrewOrientationLabels();
  window.__CREW_CAMERA_ORIENTATION = {...crewCameraOrientation};
}
updateCrewOrientationLabels();
window.__CREW_CAMERA_ORIENTATION = {...crewCameraOrientation};
crewYawNode.addEventListener('input', event => setCrewOrientation('yawDeg', event.target.value));
crewPitchNode.addEventListener('input', event => setCrewOrientation('pitchDeg', event.target.value));
crewRollNode.addEventListener('input', event => setCrewOrientation('rollDeg', event.target.value));
resetCrewOrientationNode.addEventListener('click', resetCrewOrientation);
function setCrewCameraInspection(enabled) {
  inspectingCrewCamera = Boolean(enabled);
  if (inspectingCrewCamera) {
    camera.detachControl(canvas);
    scene.activeCamera = crewCabinCamera;
    rocketSystem.setCrewCameraOcclusionHidden(true);
    celestial.atmosphere.setEnabled(false);
    celestial.nightGlow.setEnabled(false);
    celestial.earthClouds.setEnabled(false);
    inspectCrewCameraNode.textContent = 'Return to external flight camera';
    crewOrientationControlsNode.classList.remove('hidden');
    statusNode.textContent = 'real crew cabin camera · main Babylon scene';
  } else {
    scene.activeCamera = camera;
    rocketSystem.setCrewCameraOcclusionHidden(false);
    celestial.atmosphere.setEnabled(true);
    celestial.nightGlow.setEnabled(true);
    celestial.earthClouds.setEnabled(true);
    camera.attachControl(canvas, true);
    inspectCrewCameraNode.textContent = 'Inspect real crew camera';
    crewOrientationControlsNode.classList.add('hidden');
    statusNode.textContent = 'external flight camera · rocket focus retained';
  }
}
inspectCrewCameraNode.addEventListener('click', () => setCrewCameraInspection(!inspectingCrewCamera));
const flightView = createFlightView({canvas: flightViewCanvas, sourceCanvas: canvas});

function bodyFocusRadius(body) {
  if (body === celestial.sun) return Math.max(celestial.sunRadiusScene * 2.8, 100);
  if (body === celestial.moon) return Math.max(celestial.moonRadiusScene * 6, 60);
  return Math.max(celestial.earthRadiusScene * 2.8, 30);
}

function focusCelestialBody(body) {
  focusedBody = body;
  camera.setTarget(body.getAbsolutePosition());
  camera.radius = bodyFocusRadius(body);
  statusNode.textContent = `${body.metadata.celestialName} focus · click another body to change target`;
}

function pickedCelestialBody() {
  const pick = scene.pick(scene.pointerX, scene.pointerY, mesh => Boolean(mesh?.metadata?.celestialName));
  return pick?.hit ? (pick.pickedMesh.metadata.celestialTarget || pick.pickedMesh) : null;
}

scene.onPointerObservable.add(pointerInfo => {
  if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
    const body = pickedCelestialBody();
    if (!body) {
      planetLabelNode.classList.add('hidden');
      return;
    }
    planetLabelNode.textContent = body.metadata.celestialName;
    planetLabelNode.style.left = `${scene.pointerX}px`;
    planetLabelNode.style.top = `${scene.pointerY}px`;
    planetLabelNode.classList.remove('hidden');
  }
  if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK) {
    const body = pickedCelestialBody();
    if (body && !rocketSystem.getLaunchState?.()) focusCelestialBody(body);
  }
});

continueToRocketNode.addEventListener('click', () => {
  const platform = launchWizard.getSelectedPlatform();
  if (!platform) return;
  launchPanelNode.classList.add('hidden');
  rocketDockNode.classList.remove('hidden');
  rocketSystem.resizePreview();
  rocketPanelNode.classList.remove('hidden');
  const marker = launchWizard.platformMarkers.get(platform.id);
  rocketSystem.focusGround(marker);
  rocketSystem.selectVehicleById('ariane-6-crew-concept');
  statusNode.textContent = `ground focus ready · Ariane 6 crew concept loaded for ${platform.name}`;
  continueToRocketNode.textContent = 'Platform confirmed · rocket selection open';
});

function prepareLaunchEnvironment() {
  [celestial.moon, celestial.sun, celestial.earthOrbit, celestial.moonOrbit].forEach(node => node?.setEnabled(false));
  camera.maxZ = EARTH_RADIUS_SCENE * 12;
  camera.minZ = .01;
  const marker = launchWizard.platformMarkers.get(launchWizard.getSelectedPlatform()?.id);
  rocketSystem.focusGround(marker);
  statusNode.textContent = 'launch frame initialized · simulation clock 1× real time · ground to 100 km atmosphere boundary';
}

function updateFlightTelemetry() {
  const state = rocketSystem.getLaunchState?.();
  if (!state) return;
  telemetryStateNode.textContent = state.phase.replaceAll('-', ' ').toUpperCase();
  telemetryTimeNode.textContent = `${state.elapsed.toFixed(1)} s`;
  telemetryAltitudeNode.textContent = `${Math.max(0, state.altitudeKm).toFixed(1)} km`;
  telemetrySpeedNode.textContent = `${state.speedKmS.toFixed(3)} km/s`;
  telemetryRadiusNode.textContent = `${state.radiusKm.toFixed(1)} km`;
  telemetryTraceNode.textContent = `${rocketSystem.getFlightTrace?.().pointCount || 0} points`;
  rocketSystem.updateCrewCamera(crewCabinCamera, state);
  applyCrewCameraOrientation();
  flightView.update(state);
  telemetryNoteNode.textContent = state.phase === 'stable-leo' ? 'Real crew-cabin camera view. Earth and vehicle attitude are rendered from the live Babylon camera.' : 'Real crew-cabin camera view. Forward window follows the live vehicle attitude.';
}

function renderCrewTrackingFrame() {
  const previousCamera = scene.activeCamera;
  const alreadyInspecting = inspectingCrewCamera;
  const environmentNodes = [celestial.atmosphere, celestial.nightGlow, celestial.earthClouds];
  const environmentState = environmentNodes.map(node => [node, node?.isEnabled?.() ?? false]);
  if (!alreadyInspecting) {
    scene.activeCamera = crewCabinCamera;
    rocketSystem.setCrewCameraOcclusionHidden(true);
    environmentNodes.forEach(node => node?.setEnabled(false));
  }
  scene.render();
  flightView.mirror();
  if (!alreadyInspecting) {
    rocketSystem.setCrewCameraOcclusionHidden(false);
    environmentState.forEach(([node, enabled]) => node?.setEnabled(enabled));
    scene.activeCamera = previousCamera;
    scene.render();
  }
}

function restoreMoonFlightView() {
  [celestial.moon, celestial.sun, celestial.earthOrbit, celestial.moonOrbit].forEach(node => node?.setEnabled(true));
  camera.maxZ = EARTH_RADIUS_SCENE * 480 * 4;
  rocketSystem.focusRocket();
  statusNode.textContent = 'stable low Earth orbit · rocket focus retained · Earth–Moon view restored';
}

function disposeWelcomeLaunchPreparation() {
  launchWizard.setMarkersVisible(false);
  platformMarkerRoot.dispose(false, true);
  rocketSystem.disposeLaunchPreparation?.();
  launchPanelNode.classList.add('hidden');
  rocketDockNode.classList.add('hidden');
  planetLabelNode.classList.add('hidden');
  window.__LAUNCH_SCENE_MEMORY_CLEANED = true;
}

function purgeThreeDScene() {
  camera.detachControl(canvas);
  for (const postProcess of scene.postProcesses.slice()) postProcess.dispose();
  for (const mesh of scene.meshes.slice()) mesh.dispose(false, true);
  for (const node of scene.transformNodes.slice()) node.dispose(false, true);
  for (const light of scene.lights.slice()) light.dispose();
  for (const activeCamera of scene.cameras.slice()) activeCamera.dispose();
  for (const material of scene.materials.slice()) material.dispose(true, true);
  scene.activeCamera = null;
  canvas.style.visibility = 'hidden';
  sceneSurfaceNode.classList.add('empty');
  scenePurged = true;
  window.__LAUNCH_SCENE_3D_OBJECT_COUNT = scene.meshes.length + scene.transformNodes.length + scene.lights.length + scene.cameras.length;
  window.__LAUNCH_SCENE_3D_PURGED = true;
  engine.clear(new BABYLON.Color4(0, 0, 0, 1), true, true);
  engine.stopRenderLoop();
  engine.dispose();
}

let scenePurged = false;
function startLaunchSequence() {
  setLaunchTimeRate(1);
  prepareLaunchEnvironment();
  flightTelemetryNode.classList.remove('hidden');
  timeControlPanelNode.classList.remove('hidden');
  flightView.resize();
  const started = rocketSystem.launchToOrbit({
    onPhaseChange: phase => {
      const labels = {
        liftoff: 'liftoff · launch frame active',
        'atmospheric-ascent': 'atmospheric ascent · climbing toward 100 km',
        'orbital-insertion': 'orbital insertion · targeting 200 km LEO',
        'stable-leo': 'stable low Earth orbit achieved'
      };
      statusNode.textContent = labels[phase] || phase;
    },
    onOrbitAchieved: restoreMoonFlightView
  });
  if (started) {
    rocketSystem.focusRocket();
    updateFlightTelemetry();
  } else statusNode.textContent = 'select a crewed rocket before launch';
}

let launchTransitioning = false;
launchButtonNode.addEventListener('click', () => {
  if (launchTransitioning || !rocketSystem.getSelectedVehicle?.()) return;
  launchTransitioning = true;
  launchButtonNode.disabled = true;
  statusNode.textContent = 'preparing launch scene · releasing welcome resources';
  sceneTransitionNode.classList.add('active');
  window.__LAUNCH_SCENE_TRANSITION = 'fading-out';
  window.setTimeout(() => {
    const launchPlatform = launchWizard.getSelectedPlatform();
    const launchVehicle = rocketSystem.getSelectedVehicle?.();
    disposeWelcomeLaunchPreparation();
    purgeThreeDScene();
    canvas.style.visibility = 'visible';
    sceneSurfaceNode.classList.remove('empty');
    const launchScene = createLaunchScene({
      BABYLON, canvas, platform: launchPlatform, vehicle: launchVehicle,
      sourceReference: 'https://www.ekathimerini.com/wp-content/uploads/2022/08/NASA-MOON-ROCKET-0-960x600.jpg'
    });
    window.__SELECTED_LAUNCH_PLATFORM = launchPlatform;
    window.__SELECTED_LAUNCH_VEHICLE = launchVehicle;
    statusNode.textContent = `launch platform scene ready · ${launchPlatform?.name || 'selected site'}`;
    sceneTransitionNode.classList.add('revealing');
    window.__LAUNCH_SCENE_TRANSITION = 'ground-launch-scene-active';
    sceneTransitionNode.classList.remove('active', 'revealing');
    sceneTransitionNode.style.transition = 'none';
    sceneTransitionNode.style.opacity = '0';
    launchTransitioning = false;
  }, 460);
});

updateLaunchAtmosphere(launchWizard.getSelectedPlatform());


let textureReadyReported = false;
function updateStatus() {
  if (celestial.texturesReady() && !textureReadyReported) {
    textureReadyReported = true;
    assetNode.textContent = 'local Earth texture ready';
    if (!launchWizard.getSelectedPlatform()) statusNode.textContent = 'Earth–Moon system online';
  }
}

// Public diagnostics make every milestone human-reviewable in the browser console.
window.__BABYLON_WELCOME_READY = true;
window.__BABYLON_SCENE = scene;
window.__BABYLON_ENGINE = engine;
window.__SIMULATION_CLOCK = clock;
window.__CELESTIAL_SYSTEM = celestial;
window.__SCALE_MODEL = celestial.scaleModel;
window.__WORLD_SCALE = WORLD_SCALE;
window.__SET_LAUNCH_TIME_RATE = setLaunchTimeRate;
window.__FLIGHT_VIEW = flightView;
window.__CREW_CABIN_CAMERA = crewCabinCamera;
window.__ROCKET_SYSTEM = rocketSystem;
window.__STEP_SIMULATION = (realDeltaSeconds = 1 / 60) => { const simulationSeconds = clock.tick(realDeltaSeconds); celestial.update(simulationSeconds); rocketSystem.stepLaunch(realDeltaSeconds * (rocketSystem.getLaunchState?.() ? launchTimeRate : 1)); updateFlightTelemetry(); followEarthTarget(); enforceMainCameraClearance(); renderCrewTrackingFrame(); return { simulationSeconds, moonPosition: celestial.moon.getAbsolutePosition().asArray(), earthPosition: celestial.earth.getAbsolutePosition().asArray(), launchState: rocketSystem.getLaunchState?.() }; };
window.__EARTH_WELCOME = {
  earth: celestial.earth,
  moon: celestial.moon,
  sun: celestial.sun,
  scaleModel: celestial.scaleModel,
  atmosphere: celestial.atmosphere,
  earthOrbit: celestial.earthOrbit,
  moonOrbit: celestial.moonOrbit,
  camera,
  earthRadiusScene: celestial.earthRadiusScene,
  moonRadiusScene: celestial.moonRadiusScene,
  physicalRadiusM: ATMOSPHERE.earthMeanRadiusM,
  platformMarkers: launchWizard.platformMarkers,
  rocketSystem,
  getSelectedPlatform: launchWizard.getSelectedPlatform,
  getSelectedCountry: launchWizard.getSelectedCountry,
  getSelectedRocket: rocketSystem.getSelectedVehicle
};

let lastFrameTime = performance.now();
function renderFrame() {
  if (scenePurged) return;
  const now = performance.now();
  const realDeltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  const simulationSeconds = clock.tick(realDeltaSeconds);
  celestial.update(simulationSeconds);
  rocketSystem.stepLaunch(realDeltaSeconds * (rocketSystem.getLaunchState?.() ? launchTimeRate : 1));
  updateFlightTelemetry();
  followEarthTarget();
  updateStatus();
  enforceMainCameraClearance();
  renderCrewTrackingFrame();
}
// A timer-backed loop keeps the simulation advancing even in hosts that suspend Babylon's RAF loop.
renderFrame();
window.__SIMULATION_TIMER = window.setInterval(renderFrame, 1000 / 60);

window.addEventListener('resize', () => {
  if (!scenePurged) {
    engine.resize();
    flightView.resize();
  }
});
