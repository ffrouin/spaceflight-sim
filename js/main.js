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

const LAUNCH_PLATFORMS = Object.freeze([
  {id:'kennedy-lc39a', name:'Kennedy Space Center · LC-39A', country:'United States', lat:28.6084, lon:-80.6043, type:'Orbital launch pad', operator:'SpaceX / NASA', source:'NASA Kennedy Space Center'},
  {id:'cape-slc40', name:'Cape Canaveral · SLC-40', country:'United States', lat:28.5618, lon:-80.5772, type:'Orbital launch pad', operator:'SpaceX', source:'U.S. Space Force Cape Canaveral'},
  {id:'vandenberg-slc4e', name:'Vandenberg · SLC-4E', country:'United States', lat:34.6328, lon:-120.6108, type:'Polar / orbital launch pad', operator:'SpaceX / U.S. Space Force', source:'U.S. Space Force Vandenberg'},
  {id:'wallops-pad0a', name:'Wallops Flight Facility · Pad 0A', country:'United States', lat:37.8338, lon:-75.4881, type:'Orbital launch pad', operator:'Northrop Grumman / NASA', source:'NASA Wallops Flight Facility'},
  {id:'pacific-spaceport-alaska', name:'Pacific Spaceport Complex · Alaska', country:'United States', lat:57.435, lon:-152.339, type:'Orbital launch complex', operator:'Alaska Aerospace', source:'Pacific Spaceport Complex Alaska'},
  {id:'kourou-ela3', name:'Guiana Space Centre · ELA-3', country:'French Guiana', lat:5.236, lon:-52.769, type:'Orbital launch complex', operator:'Arianespace / CNES / ESA', source:'ESA Guiana Space Centre'},
  {id:'baikonur-gagarins-start', name:'Baikonur Cosmodrome · Site 1', country:'Kazakhstan', lat:45.920, lon:63.342, type:'Orbital launch pad', operator:'Roscosmos', source:'Roscosmos Baikonur Cosmodrome'},
  {id:'jiuquan', name:'Jiuquan Satellite Launch Center', country:'China', lat:40.960, lon:100.290, type:'Orbital launch center', operator:'China National Space Administration', source:'China National Space Administration'},
  {id:'wenchang', name:'Wenchang Spacecraft Launch Site', country:'China', lat:19.614, lon:110.951, type:'Orbital launch site', operator:'China National Space Administration', source:'China National Space Administration'},
  {id:'tanegashima', name:'Tanegashima Space Center', country:'Japan', lat:30.4008, lon:130.9767, type:'Orbital launch center', operator:'JAXA', source:'JAXA Tanegashima Space Center'},
  {id:'satish-dhawan', name:'Satish Dhawan Space Centre · Sriharikota', country:'India', lat:13.7199, lon:80.2304, type:'Orbital launch center', operator:'ISRO', source:'ISRO Satish Dhawan Space Centre'},
  {id:'rocket-lab-lc1', name:'Rocket Lab Launch Complex 1 · Mahia', country:'New Zealand', lat:-39.261, lon:177.864, type:'Orbital launch complex', operator:'Rocket Lab', source:'Rocket Lab Launch Complex 1'}
]);

function latLonToEarthVector(latitudeDeg, longitudeDeg, radius) {
  const lat = latitudeDeg * Math.PI / 180;
  const lon = longitudeDeg * Math.PI / 180;
  return new BABYLON.Vector3(radius * Math.cos(lat) * Math.sin(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.cos(lon));
}

window.__LAUNCH_PLATFORMS = LAUNCH_PLATFORMS;
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

const platformListNode = document.getElementById('platformList');
const selectedPlatformNode = document.getElementById('selectedPlatform');
const platformMarkerRoot = new BABYLON.TransformNode('launch platform marker root', scene);
platformMarkerRoot.parent = earth;
const platformMarkers = new Map();
let selectedPlatform = null;

function selectLaunchPlatform(platform, focus = true) {
  selectedPlatform = platform;
  for (const [id, marker] of platformMarkers) {
    const active = id === platform.id;
    marker.material.emissiveColor = active ? new BABYLON.Color3(0.3, 1, 0.68) : new BABYLON.Color3(0.08, 0.55, 0.95);
    marker.scaling.setAll(active ? 1.55 : 1);
    marker.metadata.selected = active;
  }
  document.querySelectorAll('.platform-option').forEach(button => button.classList.toggle('selected', button.dataset.platformId === platform.id));
  selectedPlatformNode.innerHTML = `<strong>${platform.name}</strong><div>${platform.country} · ${platform.type}<br>${platform.operator}<br>Coordinates: ${platform.lat.toFixed(4)}°, ${platform.lon.toFixed(4)}° · ${platform.source}</div>`;
  statusNode.textContent = `launch platform selected · ${platform.name}`;
  if (focus) {
    const target = platformMarkers.get(platform.id).getAbsolutePosition();
    camera.setTarget(target);
    camera.radius = 6.8;
  }
}

function createLaunchPlatformMarkers() {
  for (const platform of LAUNCH_PLATFORMS) {
    const marker = BABYLON.MeshBuilder.CreateSphere(`launch platform · ${platform.id}`, { diameter: 0.075, segments: 16 }, scene);
    marker.parent = platformMarkerRoot;
    marker.position.copyFrom(latLonToEarthVector(platform.lat, platform.lon, earthRadiusScene * 1.012));
    marker.isPickable = true;
    marker.metadata = { platformId: platform.id, selected: false, label: platform.name };
    const material = new BABYLON.StandardMaterial(`launch platform material · ${platform.id}`, scene);
    material.diffuseColor = new BABYLON.Color3(0.1, 0.65, 1);
    material.emissiveColor = new BABYLON.Color3(0.08, 0.55, 0.95);
    material.disableLighting = true;
    marker.material = material;
    platformMarkers.set(platform.id, marker);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'platform-option';
    button.dataset.platformId = platform.id;
    button.innerHTML = `<strong>${platform.name}</strong><span>${platform.country} · ${platform.type}</span>`;
    button.addEventListener('click', () => selectLaunchPlatform(platform));
    platformListNode.appendChild(button);
  }
  scene.onPointerObservable.add(pointerInfo => {
    if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
    const picked = pointerInfo.pickInfo?.pickedMesh;
    const platform = LAUNCH_PLATFORMS.find(item => item.id === picked?.metadata?.platformId);
    if (platform) selectLaunchPlatform(platform);
  });
  selectLaunchPlatform(LAUNCH_PLATFORMS[0], false);
}

createLaunchPlatformMarkers();

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
window.__EARTH_WELCOME = { earth, atmosphere, groundMarker, camera, earthRadiusScene, physicalRadiusM: ATMOSPHERE.earthMeanRadiusM, platformMarkers, getSelectedPlatform: () => selectedPlatform };

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
