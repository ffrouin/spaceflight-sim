// Main welcome-page coordinator.
// Main goal: connect the Babylon scene, real launch-site selection, and one shared simulation clock.
// Technique: keep domain logic in modules and let this file only coordinate browser/UI/runtime wiring.

import { ATMOSPHERE, isaAtmosphereAt } from './atmosphere-model.js';
import { LAUNCH_PLATFORMS, latLonToEarthVector } from './launch-platforms.js';
import { createLaunchWizard } from './launch-wizard.js';
import { LAUNCH_VEHICLES } from './launch-vehicles.js';
import { createRocketSystem } from './rocket-system.js';
import { createCelestialSystem } from './celestial-system.js';
import { createSimulationClock } from './simulation-clock.js';

const canvas = document.getElementById('renderCanvas');
const statusNode = document.getElementById('sceneStatus');
const assetNode = document.getElementById('assetStatus');
const errorNode = document.getElementById('error');
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
const telemetryNoteNode = document.getElementById('telemetryNote');

// Expose the physical launch reference for the later wizard stages and review tooling.
window.__ATMOSPHERE_MODEL = { constants: ATMOSPHERE, atAltitude: isaAtmosphereAt };
window.__LAUNCH_PLATFORMS = LAUNCH_PLATFORMS;
window.__LAUNCH_VEHICLES = LAUNCH_VEHICLES;

function fail(message) {
  errorNode.textContent = message;
  errorNode.classList.remove('hidden');
  statusNode.textContent = 'rendering unavailable';
}

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
const WELCOME_TIME_SCALE = 3600;
const clock = createSimulationClock({ timeScale: WELCOME_TIME_SCALE }); // Welcome view: 1 real second advances 1 simulated hour.
celestial.update(0);
earthTargetFix();

function earthTargetFix() {
  celestial.earth.computeWorldMatrix(true);
  camera.setTarget(celestial.earth.getAbsolutePosition());
  camera.radius = 14 * WORLD_SCALE;
}

function followEarthTarget() {
  const launch = rocketSystem?.getLaunchState?.();
  if (launch && launch.phase !== 'stable-leo' && rocketSystem.getRocketRoot?.()) {
    camera.target.copyFrom(rocketSystem.getRocketRoot().getAbsolutePosition());
    return;
  }
  const selected = launchWizard?.getSelectedPlatform?.();
  const focusNode = selected ? launchWizard.platformMarkers.get(selected.id) : celestial.earth;
  camera.target.copyFrom(focusNode?.getAbsolutePosition?.() || celestial.earth.getAbsolutePosition());
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
  BABYLON, scene, earthRadiusScene: celestial.earthRadiusScene, platforms: LAUNCH_PLATFORMS,
  platformListNode, countrySelectNode, countryBenefitNode, selectedPlatformNode, statusNode, camera, markerRoot: platformMarkerRoot,
  latLonToEarthVector,
  onPlatformSelected: (platform, userInitiated) => {
    updateLaunchAtmosphere(platform);
    if (userInitiated) {
      continueToRocketNode.disabled = false;
      continueToRocketNode.textContent = 'Continue · choose a crewed rocket';
      statusNode.textContent = `launch platform confirmed · ${platform.name}`;
    }
  }
});
const rocketSystem = createRocketSystem({
  BABYLON, scene, rocketListNode, rocketInfoNode, rocketComponentsNode, separationButtonNode, launchButtonNode,
  vehicleCatalog: LAUNCH_VEHICLES, camera, getSelectedPlatform: launchWizard.getSelectedPlatform, earth: celestial.earth,
  previewCanvas: rocketPreviewCanvas, tabletStatusNode
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
  statusNode.textContent = `ground focus ready · select a crewed rocket for ${platform.name}`;
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
  telemetryNoteNode.textContent = state.phase === 'stable-leo' ? 'Earth–Moon view restored; vehicle remains in low Earth orbit.' : 'Camera locked to the launch vehicle.';
}

function restoreMoonFlightView() {
  [celestial.moon, celestial.sun, celestial.earthOrbit, celestial.moonOrbit].forEach(node => node?.setEnabled(true));
  camera.maxZ = EARTH_RADIUS_SCENE * 480 * 4;
  camera.radius = 14 * WORLD_SCALE;
  camera.setTarget(celestial.earth.getAbsolutePosition());
  statusNode.textContent = 'stable low Earth orbit · Earth–Moon flight view restored';
}

launchButtonNode.addEventListener('click', () => {
  if (!rocketSystem.getSelectedVehicle?.()) return;
  clock.setTimeScale(1);
  prepareLaunchEnvironment();
  rocketDockNode.classList.add('hidden');
  flightTelemetryNode.classList.remove('hidden');
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
window.__ROCKET_SYSTEM = rocketSystem;
window.__STEP_SIMULATION = (realDeltaSeconds = 1 / 60) => { const simulationSeconds = clock.tick(realDeltaSeconds); celestial.update(simulationSeconds); rocketSystem.stepLaunch(realDeltaSeconds); updateFlightTelemetry(); followEarthTarget(); scene.render(); return { simulationSeconds, moonPosition: celestial.moon.getAbsolutePosition().asArray(), earthPosition: celestial.earth.getAbsolutePosition().asArray(), launchState: rocketSystem.getLaunchState?.() }; };
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
  const now = performance.now();
  const realDeltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  const simulationSeconds = clock.tick(realDeltaSeconds);
  celestial.update(simulationSeconds);
  rocketSystem.stepLaunch(realDeltaSeconds);
  updateFlightTelemetry();
  followEarthTarget();
  updateStatus();
  scene.render();
}
// A timer-backed loop keeps the simulation advancing even in hosts that suspend Babylon's RAF loop.
renderFrame();
window.__SIMULATION_TIMER = window.setInterval(renderFrame, 1000 / 60);

window.addEventListener('resize', () => engine.resize());
