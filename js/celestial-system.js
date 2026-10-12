// Babylon celestial-system construction and animation.
// Main goal: keep Earth, Moon, atmosphere, Sun, and orbit guides in one shared visual frame.
// Technique: Earth-centered local launch geometry is parented to Earth; Earth and Moon move from one simulation clock.

export function createCelestialSystem({BABYLON, scene, earthRadiusScene = 3}) {
  const solarRoot = new BABYLON.TransformNode('welcome solar-system root', scene);
  // Main goal: keep the visible body ratios and center-to-center distances inspectable.
  // Technique: derive every scene value from Earth radius instead of using unrelated visual guesses.
  const EARTH_RADIUS_KM = 6371;
  const MOON_RADIUS_KM = 1737.4;
  const SUN_RADIUS_KM = 696340;
  const MOON_DISTANCE_KM = 384400;
  const ASTRONOMICAL_UNIT_KM = 149597870.7;
  const earthOrbitRadius = earthRadiusScene * ASTRONOMICAL_UNIT_KM / EARTH_RADIUS_KM;
  const moonOrbitRadius = earthRadiusScene * MOON_DISTANCE_KM / EARTH_RADIUS_KM;
  const moonRadiusScene = earthRadiusScene * MOON_RADIUS_KM / EARTH_RADIUS_KM;
  const sunRadiusScene = earthRadiusScene * SUN_RADIUS_KM / EARTH_RADIUS_KM;
  const earthOrbitPeriodSeconds = 365.256 * 86_400;
  const moonOrbitPeriodSeconds = 27.321661 * 86_400;
  const earthRotationPeriodSeconds = 86_164.0905;

  const sun = BABYLON.MeshBuilder.CreateSphere('Sun reference', {diameter: sunRadiusScene * 2, segments: 48}, scene);
  sun.parent = solarRoot;
  const sunMaterial = new BABYLON.StandardMaterial('Sun reference material', scene);
  sunMaterial.emissiveColor = new BABYLON.Color3(1, .86, .52);
  sunMaterial.disableLighting = true;
  sun.material = sunMaterial;

  const earthOrbit = BABYLON.MeshBuilder.CreateTorus('Earth solar orbit guide', {diameter: earthOrbitRadius * 2, thickness: .018, tessellation: 160}, scene);
  earthOrbit.parent = solarRoot;
  const earthOrbitMaterial = new BABYLON.StandardMaterial('Earth orbit guide material', scene);
  earthOrbitMaterial.emissiveColor = new BABYLON.Color3(.1, .42, .75);
  earthOrbitMaterial.alpha = .38;
  earthOrbitMaterial.disableLighting = true;
  earthOrbit.material = earthOrbitMaterial;
  earthOrbit.metadata = {orbitType: 'earth-solar', label: 'Earth solar orbit guide'};

  const earthOrbitRoot = new BABYLON.TransformNode('Earth orbital position root', scene);
  earthOrbitRoot.parent = solarRoot;
  const earth = BABYLON.MeshBuilder.CreateSphere('Earth', {diameter: earthRadiusScene * 2, segments: 96}, scene);
  earth.parent = earthOrbitRoot;
  earth.position.x = earthOrbitRadius;
  const earthMaterial = new BABYLON.PBRMaterial('Earth physically based surface', scene);
  earthMaterial.albedoTexture = new BABYLON.Texture('assets/earth-day.jpg', scene, true, false);
  earthMaterial.bumpTexture = new BABYLON.Texture('assets/earth-normal.jpg', scene, true, false);
  earthMaterial.metallicTexture = new BABYLON.Texture('assets/earth-specular.jpg', scene, true, false);
  earthMaterial.metallic = 0.04;
  earthMaterial.roughness = 0.78;
  earthMaterial.environmentIntensity = 0.18;
  earth.material = earthMaterial;
  earth.isPickable = false;

  const atmosphere = BABYLON.MeshBuilder.CreateSphere('Earth atmosphere', {diameter: earthRadiusScene * 2.045, segments: 96}, scene);
  atmosphere.parent = earth;
  const atmosphereMaterial = new BABYLON.StandardMaterial('Earth atmosphere scattering shell', scene);
  atmosphereMaterial.diffuseColor = new BABYLON.Color3(.12, .42, 1);
  atmosphereMaterial.emissiveColor = new BABYLON.Color3(.05, .16, .58);
  atmosphereMaterial.alpha = .095;
  atmosphereMaterial.backFaceCulling = false;
  atmosphereMaterial.disableLighting = true;
  atmosphereMaterial.needDepthPrePass = true;
  atmosphereMaterial.zOffset = -2;
  atmosphere.material = atmosphereMaterial;
  atmosphere.isPickable = false;

  const nightGlow = BABYLON.MeshBuilder.CreateSphere('Earth limb glow', {diameter: earthRadiusScene * 2.07, segments: 64}, scene);
  nightGlow.parent = earth;
  const glowMaterial = new BABYLON.StandardMaterial('Earth blue limb glow', scene);
  glowMaterial.emissiveColor = new BABYLON.Color3(.015, .1, .48);
  glowMaterial.alpha = .04;
  glowMaterial.backFaceCulling = false;
  glowMaterial.disableLighting = true;
  glowMaterial.zOffset = -1;
  nightGlow.material = glowMaterial;
  nightGlow.isPickable = false;

  const earthGroundMarker = BABYLON.MeshBuilder.CreateTorus('Earth ground reference', {diameter: earthRadiusScene * 2.008, thickness: .006, tessellation: 128}, scene);
  earthGroundMarker.parent = earth;
  earthGroundMarker.rotation.x = Math.PI / 2;
  const groundMaterial = new BABYLON.StandardMaterial('Ground reference material', scene);
  groundMaterial.emissiveColor = new BABYLON.Color3(.1, .48, .8);
  groundMaterial.alpha = .28;
  groundMaterial.disableLighting = true;
  earthGroundMarker.material = groundMaterial;
  earthGroundMarker.isPickable = false;

  const moon = BABYLON.MeshBuilder.CreateSphere('Moon', {diameter: moonRadiusScene * 2, segments: 48}, scene);
  moon.parent = earth;
  const moonMaterial = new BABYLON.PBRMaterial('Moon surface material', scene);
  moonMaterial.albedoColor = new BABYLON.Color3(.48, .5, .54);
  moonMaterial.roughness = .94;
  moon.material = moonMaterial;
  moon.isPickable = false;

  const moonOrbit = BABYLON.MeshBuilder.CreateTorus('Moon orbit guide', {diameter: moonOrbitRadius * 2, thickness: .014, tessellation: 128}, scene);
  moonOrbit.parent = earth;
  const moonOrbitMaterial = new BABYLON.StandardMaterial('Moon orbit guide material', scene);
  moonOrbitMaterial.emissiveColor = new BABYLON.Color3(.6, .66, .78);
  moonOrbitMaterial.alpha = .42;
  moonOrbitMaterial.disableLighting = true;
  moonOrbit.material = moonOrbitMaterial;
  moonOrbit.metadata = {orbitType: 'moon-earth', label: 'Moon orbit guide'};

  const update = simulationSeconds => {
    const earthAngle = simulationSeconds / earthOrbitPeriodSeconds * Math.PI * 2;
    const moonAngle = simulationSeconds / moonOrbitPeriodSeconds * Math.PI * 2;
    const earthSpin = simulationSeconds / earthRotationPeriodSeconds * Math.PI * 2;
    earthOrbitRoot.rotation.y = earthAngle;
    earth.rotation.y = earthSpin;
    nightGlow.rotation.y = earthSpin * .88;
    earthGroundMarker.rotation.z = earthSpin * .15;
    moon.position.set(Math.cos(moonAngle) * moonOrbitRadius, 0.16 * Math.sin(moonAngle * .5), Math.sin(moonAngle) * moonOrbitRadius);
    moon.rotation.y = -moonAngle;
  };

  return {
    solarRoot, sun, earthOrbit, earthOrbitRoot, earth, moon, atmosphere, nightGlow, earthGroundMarker, moonOrbit,
    earthMaterial, moonMaterial, earthRadiusScene, moonRadiusScene, sunRadiusScene, earthOrbitRadius, moonOrbitRadius,
    scaleModel: {
      earthRadiusKm: EARTH_RADIUS_KM, moonRadiusKm: MOON_RADIUS_KM, sunRadiusKm: SUN_RADIUS_KM,
      moonDistanceKm: MOON_DISTANCE_KM, astronomicalUnitKm: ASTRONOMICAL_UNIT_KM,
      sunToEarthRadiusRatio: sunRadiusScene / earthRadiusScene,
      moonToEarthRadiusRatio: moonRadiusScene / earthRadiusScene,
      moonDistanceEarthRadii: moonOrbitRadius / earthRadiusScene,
      earthSunDistanceEarthRadii: earthOrbitRadius / earthRadiusScene
    },
    update,
    texturesReady: () => Boolean(earthMaterial.albedoTexture?.isReady() && earthMaterial.bumpTexture?.isReady() && earthMaterial.metallicTexture?.isReady())
  };
}
