const canvas = document.getElementById('renderCanvas');
const statusNode = document.getElementById('sceneStatus');
const assetNode = document.getElementById('assetStatus');
const errorNode = document.getElementById('error');

const ATMOSPHERE = Object.freeze({
  referenceAltitudeM: 0,
  earthMeanRadiusM: 6_371_000,
  seaLevelTemperatureK: 288.15,
  seaLevelPressurePa: 101_325,
  seaLevelDensityKgM3: 1.225,
  specificGasConstantAir: 287.05287,
  gravityMps2: 9.80665,
  lapseRateKPerM: -0.0065,
  nitrogenFraction: 0.7808,
  oxygenFraction: 0.2095,
  argonFraction: 0.0093,
  co2Fraction: 0.0004
});

function isaSeaLevelModel(altitudeM = 0) {
  const h = Math.max(0, Number(altitudeM));
  const T = ATMOSPHERE.seaLevelTemperatureK + ATMOSPHERE.lapseRateKPerM * Math.min(h, 11_000);
  const exponent = -ATMOSPHERE.gravityMps2 / (ATMOSPHERE.lapseRateKPerM * ATMOSPHERE.specificGasConstantAir);
  const pressure = ATMOSPHERE.seaLevelPressurePa * Math.pow(T / ATMOSPHERE.seaLevelTemperatureK, exponent);
  const density = pressure / (ATMOSPHERE.specificGasConstantAir * T);
  return { altitudeM: h, temperatureK: T, pressurePa: pressure, densityKgM3: density };
}

window.__ATMOSPHERE_MODEL = { constants: ATMOSPHERE, atAltitude: isaSeaLevelModel };

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

const camera = new BABYLON.ArcRotateCamera('Earth inspection camera', -Math.PI * 0.58, Math.PI * 0.38, 9.4, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 4.1;
camera.upperRadiusLimit = 28;
camera.wheelDeltaPercentage = 0.012;
camera.minZ = 0.01;
camera.maxZ = 1000;

const sun = new BABYLON.PointLight('Sun key light', new BABYLON.Vector3(-9, 5, -11), scene);
sun.intensity = 2.2;
sun.range = 100;
sun.diffuse = new BABYLON.Color3(1, 0.93, 0.82);
const fill = new BABYLON.HemisphericLight('Night-side fill', new BABYLON.Vector3(0, 1, 0), scene);
fill.intensity = 0.08;
fill.diffuse = new BABYLON.Color3(0.2, 0.34, 0.6);
fill.groundColor = new BABYLON.Color3(0.01, 0.02, 0.05);

function createStars() {
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
  return stars;
}

createStars();

const earthRadiusScene = 3;
const earth = BABYLON.MeshBuilder.CreateSphere('Earth', { diameter: earthRadiusScene * 2, segments: 96 }, scene);
const earthMaterial = new BABYLON.PBRMaterial('Earth physically based surface', scene);
earthMaterial.albedoTexture = new BABYLON.Texture('assets/earth-day.jpg', scene, true, false);
earthMaterial.bumpTexture = new BABYLON.Texture('assets/earth-normal.jpg', scene, true, false);
earthMaterial.metallicTexture = new BABYLON.Texture('assets/earth-specular.jpg', scene, true, false);
earthMaterial.metallic = 0.04;
earthMaterial.roughness = 0.78;
earthMaterial.environmentIntensity = 0.18;
earth.material = earthMaterial;
earth.isPickable = false;

const atmosphere = BABYLON.MeshBuilder.CreateSphere('Earth atmosphere', { diameter: earthRadiusScene * 2.055, segments: 96 }, scene);
const atmosphereMaterial = new BABYLON.StandardMaterial('Earth atmosphere scattering shell', scene);
atmosphereMaterial.diffuseColor = new BABYLON.Color3(0.12, 0.42, 1.0);
atmosphereMaterial.emissiveColor = new BABYLON.Color3(0.08, 0.22, 0.72);
atmosphereMaterial.alpha = 0.19;
atmosphereMaterial.backFaceCulling = false;
atmosphereMaterial.disableLighting = true;
atmosphereMaterial.needDepthPrePass = true;
atmosphereMaterial.zOffset = -2;
atmosphere.material = atmosphereMaterial;
atmosphere.isPickable = false;

const nightGlow = BABYLON.MeshBuilder.CreateSphere('Earth limb glow', { diameter: earthRadiusScene * 2.08, segments: 64 }, scene);
const glowMaterial = new BABYLON.StandardMaterial('Earth blue limb glow', scene);
glowMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.14, 0.7);
glowMaterial.alpha = 0.075;
glowMaterial.backFaceCulling = false;
glowMaterial.disableLighting = true;
glowMaterial.zOffset = -1;
nightGlow.material = glowMaterial;
nightGlow.isPickable = false;

const groundMarker = BABYLON.MeshBuilder.CreateTorus('Ground zero equator reference', { diameter: earthRadiusScene * 2.008, thickness: 0.006, tessellation: 128 }, scene);
const groundMaterial = new BABYLON.StandardMaterial('Ground zero marker material', scene);
groundMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.48, 0.8);
groundMaterial.alpha = 0.34;
groundMaterial.disableLighting = true;
groundMarker.material = groundMaterial;
groundMarker.rotation.x = Math.PI / 2;
groundMarker.isPickable = false;

let rotation = 0;
let textureReadyReported = false;
function updateStatus() {
  const ready = earthMaterial.albedoTexture?.isReady() && earthMaterial.bumpTexture?.isReady() && earthMaterial.metallicTexture?.isReady();
  if (ready && !textureReadyReported) {
    textureReadyReported = true;
    assetNode.textContent = 'local Earth texture ready';
    statusNode.textContent = 'Earth system online';
  }
}

window.__BABYLON_WELCOME_READY = true;
window.__BABYLON_SCENE = scene;
window.__BABYLON_ENGINE = engine;
window.__EARTH_WELCOME = { earth, atmosphere, groundMarker, camera, earthRadiusScene, physicalRadiusM: ATMOSPHERE.earthMeanRadiusM };

engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  rotation += dt * 0.035;
  earth.rotation.y = rotation;
  atmosphere.rotation.y = rotation * 0.92;
  nightGlow.rotation.y = rotation * 0.88;
  groundMarker.rotation.z = rotation * 0.15;
  updateStatus();
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
