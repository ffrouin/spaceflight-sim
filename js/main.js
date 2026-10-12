// Main welcome-page coordinator.
// Main goal: connect the Babylon scene, real launch-site selection, and one shared simulation clock.
// Technique: keep domain logic in modules and let this file only coordinate browser/UI/runtime wiring.

import { ATMOSPHERE, isaAtmosphereAt } from './atmosphere-model.js';
import { LAUNCH_PLATFORMS, latLonToEarthVector } from './launch-platforms.js';
import { createLaunchWizard } from './launch-wizard.js';
import { createSunLighting } from './sun-lighting.js';
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

// Expose the physical launch reference for the later wizard stages and review tooling.
window.__ATMOSPHERE_MODEL = { constants: ATMOSPHERE, atAltitude: isaAtmosphereAt };
window.__LAUNCH_PLATFORMS = LAUNCH_PLATFORMS;

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

// The camera initially follows Earth so the launch-site markers remain readable.
const camera = new BABYLON.ArcRotateCamera('Earth inspection camera', -Math.PI * 0.58, Math.PI * 0.38, 9.4, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 4.1;
camera.upperRadiusLimit = 32;
camera.wheelDeltaPercentage = 0.012;
camera.minZ = 0.01;
camera.maxZ = 1000;

// The Sun and a restrained fill light make the texture terminator visible without flattening it.
const sunLight = new BABYLON.PointLight('Sun key light', new BABYLON.Vector3(-9, 5, -11), scene);
sunLight.intensity = 2.2;
sunLight.range = 100;
sunLight.diffuse = new BABYLON.Color3(1, 0.93, 0.82);
const fillLight = new BABYLON.HemisphericLight('Night-side fill', new BABYLON.Vector3(0, 1, 0), scene);
fillLight.intensity = 0.08;
fillLight.diffuse = new BABYLON.Color3(0.2, 0.34, 0.6);
fillLight.groundColor = new BABYLON.Color3(0.01, 0.02, 0.05);

function createStars() {
  // A small procedural star field provides depth without competing with the globe.
  const stars = new BABYLON.ParticleSystem('welcome star field', 900, scene);
  stars.particleTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+9Q2a7wAAAABJRU5ErkJggg==', scene);
  stars.minEmitBox = new BABYLON.Vector3(-70, -70, -70);
  stars.maxEmitBox = new BABYLON.Vector3(70, 70, 70);
  stars.minSize = 0.018;
  stars.maxSize = 0.06;
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

createStars();
const celestial = createCelestialSystem({ BABYLON, scene, earthRadiusScene: 3 });
let sunPresentation;
try {
  sunPresentation = createSunLighting({ BABYLON, scene, sunMesh: celestial.sun, sunLight, atmosphereMaterial: celestial.atmosphere.material });
} catch (error) {
  window.__SUN_LIGHTING_ERROR = error?.stack || String(error);
  console.error('Sun lighting setup failed', error);
}
const clock = createSimulationClock({ timeScale: 3600 }); // 1 real second advances 1 simulated hour for visible system motion.
celestial.update(0);
earthTargetFix();

function earthTargetFix() {
  celestial.earth.computeWorldMatrix(true);
  camera.setTarget(celestial.earth.getAbsolutePosition());
}

const platformMarkerRoot = new BABYLON.TransformNode('launch platform marker root', scene);
platformMarkerRoot.parent = celestial.earth;
const launchWizard = createLaunchWizard({
  BABYLON, scene, earthRadiusScene: celestial.earthRadiusScene, platforms: LAUNCH_PLATFORMS,
  platformListNode, countrySelectNode, countryBenefitNode, selectedPlatformNode, statusNode, camera, markerRoot: platformMarkerRoot,
  latLonToEarthVector
});


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
window.__SUN_LIGHTING = sunPresentation;
window.__STEP_SIMULATION = (realDeltaSeconds = 1 / 60) => { const simulationSeconds = clock.tick(realDeltaSeconds); celestial.update(simulationSeconds); scene.render(); return { simulationSeconds, moonPosition: celestial.moon.getAbsolutePosition().asArray(), earthPosition: celestial.earth.getAbsolutePosition().asArray() }; };
window.__EARTH_WELCOME = {
  earth: celestial.earth,
  moon: celestial.moon,
  atmosphere: celestial.atmosphere,
  earthOrbit: celestial.earthOrbit,
  moonOrbit: celestial.moonOrbit,
  camera,
  earthRadiusScene: celestial.earthRadiusScene,
  moonRadiusScene: celestial.moonRadiusScene,
  physicalRadiusM: ATMOSPHERE.earthMeanRadiusM,
  platformMarkers: launchWizard.platformMarkers,
  getSelectedPlatform: launchWizard.getSelectedPlatform,
  getSelectedCountry: launchWizard.getSelectedCountry
};

let lastFrameTime = performance.now();
function renderFrame() {
  const now = performance.now();
  const realDeltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  const simulationSeconds = clock.tick(realDeltaSeconds);
  celestial.update(simulationSeconds);
  updateStatus();
  scene.render();
}
// A timer-backed loop keeps the simulation advancing even in hosts that suspend Babylon's RAF loop.
renderFrame();
window.__SIMULATION_TIMER = window.setInterval(renderFrame, 1000 / 60);

window.addEventListener('resize', () => engine.resize());
