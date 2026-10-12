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
  // The true AU is retained for diagnostics, but a bounded solar presentation distance avoids large-coordinate jitter.
  const SOLAR_VISUAL_DISTANCE_EARTH_RADII = 480;
  const earthOrbitRadius = earthRadiusScene * SOLAR_VISUAL_DISTANCE_EARTH_RADII;
  const physicalEarthSunDistanceEarthRadii = ASTRONOMICAL_UNIT_KM / EARTH_RADIUS_KM;
  const moonOrbitRadius = earthRadiusScene * MOON_DISTANCE_KM / EARTH_RADIUS_KM;
  const moonRadiusScene = earthRadiusScene * MOON_RADIUS_KM / EARTH_RADIUS_KM;
  const sunRadiusScene = earthRadiusScene * SUN_RADIUS_KM / EARTH_RADIUS_KM;
  const earthOrbitPeriodSeconds = 365.256 * 86_400;
  const moonOrbitPeriodSeconds = 27.321661 * 86_400;
  const earthRotationPeriodSeconds = 86_164.0905;
  const earthAxialTiltDeg = 23.439;
  const moonOrbitalInclinationDeg = 5.145;

  const sun = BABYLON.MeshBuilder.CreateSphere('Sun reference', {diameter: sunRadiusScene * 2, segments: 48}, scene);
  sun.parent = solarRoot;
  const sunMaterial = new BABYLON.StandardMaterial('Sun reference material', scene);
  sunMaterial.emissiveColor = new BABYLON.Color3(1, .86, .52);
  sunMaterial.disableLighting = true;
  sun.material = sunMaterial;

  const earthOrbit = BABYLON.MeshBuilder.CreateTorus('Earth solar orbit guide', {diameter: earthOrbitRadius * 2, thickness: Math.max(.018, earthRadiusScene * .0012), tessellation: 160}, scene);
  earthOrbit.parent = solarRoot;
  const earthOrbitMaterial = new BABYLON.StandardMaterial('Earth orbit guide material', scene);
  earthOrbitMaterial.emissiveColor = new BABYLON.Color3(.1, .42, .75);
  earthOrbitMaterial.alpha = .38;
  earthOrbitMaterial.disableLighting = true;
  earthOrbit.material = earthOrbitMaterial;
  earthOrbit.metadata = {orbitType: 'earth-solar', label: 'Earth solar orbit guide'};

  const earthOrbitRoot = new BABYLON.TransformNode('Earth orbital position root', scene);
  earthOrbitRoot.parent = solarRoot;
  const earthFrame = new BABYLON.TransformNode('Earth axial tilt frame', scene);
  earthFrame.parent = earthOrbitRoot;
  earthFrame.position.x = earthOrbitRadius;
  earthFrame.rotation.z = BABYLON.Tools.ToRadians(earthAxialTiltDeg);
  const earth = BABYLON.MeshBuilder.CreateSphere('Earth', {diameter: earthRadiusScene * 2, segments: 96}, scene);
  earth.parent = earthFrame;
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

  const moonOrbitRoot = new BABYLON.TransformNode('Moon inclined orbital frame', scene);
  moonOrbitRoot.parent = earthOrbitRoot;
  moonOrbitRoot.position.x = earthOrbitRadius;
  moonOrbitRoot.rotation.x = BABYLON.Tools.ToRadians(moonOrbitalInclinationDeg);
  const moon = BABYLON.MeshBuilder.CreateSphere('Moon', {diameter: moonRadiusScene * 2, segments: 48}, scene);
  moon.parent = moonOrbitRoot;
  const moonMaterial = new BABYLON.PBRMaterial('Moon surface material', scene);
  moonMaterial.albedoColor = new BABYLON.Color3(.48, .5, .54);
  moonMaterial.roughness = .94;
  moon.material = moonMaterial;
  moon.isPickable = false;

  const moonOrbit = BABYLON.MeshBuilder.CreateTorus('Moon orbit guide', {diameter: moonOrbitRadius * 2, thickness: Math.max(.014, earthRadiusScene * .003), tessellation: 128}, scene);
  moonOrbit.parent = moonOrbitRoot;
  const moonOrbitMaterial = new BABYLON.StandardMaterial('Moon orbit guide material', scene);
  moonOrbitMaterial.emissiveColor = new BABYLON.Color3(.6, .66, .78);
  moonOrbitMaterial.alpha = .42;
  moonOrbitMaterial.disableLighting = true;
  moonOrbit.material = moonOrbitMaterial;
  moonOrbit.metadata = {orbitType: 'moon-earth', label: 'Moon orbit guide'};

  // Physical Sun illumination is separate from the removed glare presentation.
  const sunLight = new BABYLON.DirectionalLight('Sun physical illumination', new BABYLON.Vector3(1, 0, 0), scene);
  sunLight.diffuse = new BABYLON.Color3(1, .94, .82);
  sunLight.specular = new BABYLON.Color3(1, .9, .72);
  sunLight.intensity = 1.8;
  sunLight.shadowMinZ = 0.1;
  sunLight.shadowMaxZ = 4000;

  // The eclipse marker is a physically scaled penumbra indicator, enabled only for a Sun–Moon–Earth alignment.
  const moonShadow = BABYLON.MeshBuilder.CreateDisc('Moon penumbra on Earth', {radius: 1, tessellation: 48, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, scene);
  const moonShadowMaterial = new BABYLON.StandardMaterial('Moon penumbra material', scene);
  moonShadowMaterial.diffuseColor = new BABYLON.Color3(.005, .008, .015);
  moonShadowMaterial.emissiveColor = new BABYLON.Color3(.002, .003, .006);
  moonShadowMaterial.alpha = .34;
  moonShadowMaterial.disableLighting = true;
  moonShadowMaterial.backFaceCulling = false;
  moonShadow.material = moonShadowMaterial;
  moonShadow.isPickable = false;
  moonShadow.isVisible = false;
  moonShadow.metadata = {type: 'lunar-eclipse-penumbra'};

  const updateMoonShadow = () => {
    const earthPosition = earth.getAbsolutePosition();
    const moonPosition = moon.getAbsolutePosition();
    const sunPosition = sun.getAbsolutePosition();
    const sunToEarthDirection = earthPosition.subtract(sunPosition).normalize();
    const moonFromEarth = moonPosition.subtract(earthPosition);
    const moonDistance = moonFromEarth.length();
    const axisProjection = BABYLON.Vector3.Dot(moonFromEarth, sunToEarthDirection);
    const crossAxisDistance = moonFromEarth.subtract(sunToEarthDirection.scale(axisProjection)).length();
    const moonIsSunward = axisProjection < 0;
    const alignmentLimit = moonRadiusScene * 1.2;
    const eclipsing = moonIsSunward && crossAxisDistance <= alignmentLimit;
    moonShadow.isVisible = eclipsing;
    if (!eclipsing) return;
    const directionToMoon = moonFromEarth.normalize();
    const penumbraRadius = Math.max(.004, moonRadiusScene * earthRadiusScene / moonDistance);
    moonShadow.position.copyFrom(earthPosition.add(directionToMoon.scale(earthRadiusScene * 1.006)));
    moonShadow.scaling.set(penumbraRadius, penumbraRadius, penumbraRadius);
    moonShadow.lookAt(moonShadow.position.add(directionToMoon));
    moonShadow.metadata.penumbraRadiusScene = penumbraRadius;
    moonShadow.metadata.axisOffsetScene = crossAxisDistance;
  };

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
    earth.computeWorldMatrix(true);
    moon.computeWorldMatrix(true);
    const sunPosition = sun.getAbsolutePosition();
    const earthPosition = earth.getAbsolutePosition();
    sunLight.position.copyFrom(sunPosition);
    sunLight.direction.copyFrom(earthPosition.subtract(sunPosition).normalize());
    updateMoonShadow();
  };

  return {
    solarRoot, sun, sunLight, moonShadow, earthOrbit, earthOrbitRoot, earthFrame, earth, atmosphere, nightGlow, earthGroundMarker, moonOrbitRoot, moon, moonOrbit,
    earthMaterial, moonMaterial, earthRadiusScene, moonRadiusScene, sunRadiusScene, earthOrbitRadius, moonOrbitRadius,
    earthAxialTiltDeg, moonOrbitalInclinationDeg,
    scaleModel: {
      earthRadiusKm: EARTH_RADIUS_KM, moonRadiusKm: MOON_RADIUS_KM, sunRadiusKm: SUN_RADIUS_KM,
      moonDistanceKm: MOON_DISTANCE_KM, astronomicalUnitKm: ASTRONOMICAL_UNIT_KM,
      sunToEarthRadiusRatio: sunRadiusScene / earthRadiusScene,
      moonToEarthRadiusRatio: moonRadiusScene / earthRadiusScene,
      moonDistanceEarthRadii: moonOrbitRadius / earthRadiusScene,
      earthSunDistanceEarthRadii: earthOrbitRadius / earthRadiusScene,
      physicalEarthSunDistanceEarthRadii,
      earthAxialTiltDeg,
      moonOrbitalInclinationDeg,
      solarDistanceIsVisuallyCompressed: true
    },
    update,
    texturesReady: () => Boolean(earthMaterial.albedoTexture?.isReady() && earthMaterial.bumpTexture?.isReady() && earthMaterial.metallicTexture?.isReady())
  };
}
