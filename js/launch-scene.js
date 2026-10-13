// Launch-scene renderer.
// Main goal: rebuild a clean ground launch environment after the welcome scene is purged.
// Technique: create a dedicated Babylon engine/scene with a procedural crawler, service tower,
// exhaust pad, landscape, and the selected vehicle assembled from its immutable component data.

export function createLaunchScene({BABYLON, canvas, platform, vehicle, sourceReference}) {
  const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer: true, stencil: true}, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(.003, .008, .02, 1);
  scene.metadata = {
    sceneType: 'ground-launch-scene',
    platformId: platform?.id || null,
    platformName: platform?.name || null,
    vehicleId: vehicle?.id || null,
    sourceReference
  };

  BABYLON.Effect.ShadersStore.launchSkyGradientVertexShader = `
    precision highp float;
    attribute vec3 position;
    uniform mat4 worldViewProjection;
    varying vec3 vDirection;
    void main(void) {
      vDirection = normalize(position);
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;
  BABYLON.Effect.ShadersStore.launchSkyGradientFragmentShader = `
    precision highp float;
    uniform float spaceFactor;
    varying vec3 vDirection;
    void main(void) {
      float elevation = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 topBlue = vec3(0.004, 0.035, 0.15);
      vec3 horizonBlue = vec3(0.025, 0.22, 0.62);
      vec3 lowerBlue = vec3(0.06, 0.34, 0.78);
      vec3 color = mix(horizonBlue, topBlue, smoothstep(0.38, 0.72, elevation));
      color = mix(lowerBlue, color, smoothstep(0.0, 0.32, elevation));
      color = mix(color, vec3(0.001, 0.003, 0.012), spaceFactor);
      gl_FragColor = vec4(color, 1.0);
    }
  `;
  const skyGradientMaterial = new BABYLON.ShaderMaterial('launch earth sky gradient material', scene, {vertex: 'launchSkyGradient', fragment: 'launchSkyGradient'}, {attributes: ['position'], uniforms: ['worldViewProjection', 'spaceFactor']});
  skyGradientMaterial.backFaceCulling = false;
  skyGradientMaterial.disableDepthWrite = true;
  skyGradientMaterial.setFloat('spaceFactor', 0);
  const skyGradientLayer = BABYLON.MeshBuilder.CreateSphere('launch earth sky gradient', {diameter: 150_000, segments: 32, sideOrientation: BABYLON.Mesh.BACKSIDE}, scene);
  skyGradientLayer.material = skyGradientMaterial;
  skyGradientLayer.isPickable = false;
  skyGradientLayer.infiniteDistance = true;
  skyGradientLayer.renderingGroupId = 0;
  const skyGradientState = {altitudeKm: 0, spaceFactor: 0};
  function updateSkyGradient(altitudeKm) {
    const factor = BABYLON.Scalar.Clamp((altitudeKm - 15) / 85, 0, 1);
    skyGradientState.altitudeKm = altitudeKm;
    skyGradientState.spaceFactor = factor;
    skyGradientMaterial.setFloat('spaceFactor', factor);
    scene.clearColor = new BABYLON.Color4(.001, .003, .012, 1);
  }
  updateSkyGradient(0);
  const camera = new BABYLON.ArcRotateCamera(
    'launch scene camera', -Math.PI * .68, Math.PI * .34, 220,
    new BABYLON.Vector3(0, 35, 0), scene
  );
  camera.lowerRadiusLimit = 55;
  camera.upperRadiusLimit = 700;
  camera.lowerBetaLimit = .08;
  camera.upperBetaLimit = Math.PI * .49;
  camera.minZ = .05;
  camera.maxZ = 3000;
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  const skyFill = new BABYLON.HemisphericLight('launch scene sky fill', new BABYLON.Vector3(0, 1, 0), scene);
  skyFill.intensity = .95;
  skyFill.groundColor = new BABYLON.Color3(.06, .08, .1);
  const sun = new BABYLON.DirectionalLight('launch scene sun', new BABYLON.Vector3(-.5, -1, .35), scene);
  sun.position = new BABYLON.Vector3(-240, 320, -180);
  sun.intensity = 2.2;

  const colors = {
    ground: new BABYLON.Color3(.07, .095, .065),
    soil: new BABYLON.Color3(.18, .145, .085),
    concrete: new BABYLON.Color3(.32, .35, .34),
    steel: new BABYLON.Color3(.25, .29, .30),
    darkSteel: new BABYLON.Color3(.08, .10, .11),
    safety: new BABYLON.Color3(.82, .53, .10),
    rocket: new BABYLON.Color3(.78, .80, .78),
    orange: new BABYLON.Color3(.72, .28, .07),
    white: new BABYLON.Color3(.9, .9, .84),
    black: new BABYLON.Color3(.04, .045, .045)
  };

  function material(name, color, options = {}) {
    const result = new BABYLON.StandardMaterial(name, scene);
    result.diffuseColor = color;
    result.specularColor = options.specular || new BABYLON.Color3(.12, .14, .15);
    result.roughness = options.roughness ?? .78;
    if (options.transparent) {
      result.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      result.useAlphaFromDiffuseTexture = false;
    } else {
      result.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
      result.useAlphaFromDiffuseTexture = false;
    }
    if (options.emissive) result.emissiveColor = options.emissive;
    return result;
  }

  const groundMaterial = material('launch landscape', colors.ground, {roughness: 1, specular: new BABYLON.Color3(.008, .01, .008)});
  const soilMaterial = material('launch soil', colors.soil, {roughness: 1, specular: new BABYLON.Color3(.006, .005, .003)});
  const concreteMaterial = material('launch concrete', colors.concrete);
  const steelMaterial = material('launch steel', colors.steel, {roughness: .6});
  const darkSteelMaterial = material('launch dark steel', colors.darkSteel);
  const safetyMaterial = material('launch safety paint', colors.safety);
  const rocketMaterial = material('launch vehicle white', colors.rocket, {roughness: .48});
  const orangeMaterial = material('launch vehicle orange', colors.orange, {roughness: .52});
  const blackMaterial = material('launch vehicle black', colors.black);

  const groundExtentMultiplier = 100;
  const ground = BABYLON.MeshBuilder.CreateGround('launch landscape ground', {width: 1200 * groundExtentMultiplier, height: 1200 * groundExtentMultiplier, subdivisions: 32}, scene);
  ground.material = groundMaterial;
  const apron = BABYLON.MeshBuilder.CreateBox('launch site soil apron', {width: 520, depth: 360, height: 2}, scene);
  apron.position.y = -.96;
  apron.material = soilMaterial;

  for (let i = 0; i < 14; i += 1) {
    const dune = BABYLON.MeshBuilder.CreateCylinder(`landscape berm ${i}`, {diameter: 20 + (i % 4) * 8, height: 2 + (i % 3), tessellation: 16}, scene);
    const angle = i / 14 * Math.PI * 2;
    const radius = 170 + (i % 3) * 36;
    dune.position.set(Math.cos(angle) * radius, 1, Math.sin(angle) * radius);
    dune.scaling.y = .35;
    dune.material = i % 2 ? groundMaterial : soilMaterial;
  }

  const pad = BABYLON.MeshBuilder.CreateCylinder('launch platform concrete pad', {diameter: 120, height: 4, tessellation: 64}, scene);
  pad.position.y = 2;
  pad.material = concreteMaterial;
  const padInner = BABYLON.MeshBuilder.CreateCylinder('launch platform exhaust opening', {diameter: 42, height: 4.4, tessellation: 48}, scene);
  padInner.position.y = 2.25;
  padInner.material = darkSteelMaterial;
  const trench = BABYLON.MeshBuilder.CreateBox('launch exhaust trench', {width: 34, depth: 72, height: 6}, scene);
  trench.position.set(0, -.2, 22);
  trench.material = blackMaterial;

  function box(name, dimensions, position, mat, rotation = null) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, dimensions, scene);
    mesh.position.copyFrom(position);
    if (rotation) mesh.rotation.copyFrom(rotation);
    mesh.material = mat;
    return mesh;
  }
  function cylinder(name, diameter, height, position, mat, rotation = null) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(name, {diameter, height, tessellation: 24}, scene);
    mesh.position.copyFrom(position);
    if (rotation) mesh.rotation.copyFrom(rotation);
    mesh.material = mat;
    return mesh;
  }

  const crawlerBase = box('crawler transporter deck', {width: 92, depth: 34, height: 8}, new BABYLON.Vector3(0, 10, 0), darkSteelMaterial);
  crawlerBase.metadata = {launchpadPart: 'crawler-transporter'};
  for (const side of [-1, 1]) {
    const track = box(`crawler track ${side}`, {width: 82, depth: 10, height: 12}, new BABYLON.Vector3(0, 7, side * 25), steelMaterial);
    track.metadata = {launchpadPart: 'crawler-track'};
    for (let i = -4; i <= 4; i += 1) {
      const wheel = cylinder(`crawler wheel ${side} ${i}`, 7, 10, new BABYLON.Vector3(i * 9, 7, side * 30), darkSteelMaterial, new BABYLON.Vector3(Math.PI / 2, 0, 0));
      wheel.metadata = {launchpadPart: 'crawler-wheel'};
    }
  }
  box('crawler upper deck', {width: 74, depth: 28, height: 4}, new BABYLON.Vector3(0, 16, 0), steelMaterial);

  const towerX = 48;
  for (const x of [towerX - 7, towerX + 7]) {
    for (const z of [-7, 7]) {
      box('mobile launch tower vertical', {width: 2.4, depth: 2.4, height: 118}, new BABYLON.Vector3(x, 70, z), steelMaterial);
    }
  }
  for (let y = 18; y <= 126; y += 12) {
    box('mobile launch tower crossbeam', {width: 18, depth: 2, height: 1.8}, new BABYLON.Vector3(towerX, y, -7), darkSteelMaterial);
    box('mobile launch tower crossbeam', {width: 18, depth: 2, height: 1.8}, new BABYLON.Vector3(towerX, y, 7), darkSteelMaterial);
  }
  box('mobile launch tower top', {width: 18, depth: 18, height: 3}, new BABYLON.Vector3(towerX, 130, 0), steelMaterial);

  const accessArmRoots = [];
  for (let y = 35; y <= 105; y += 18) {
    const armRoot = new BABYLON.TransformNode(`crew access arm root ${y}`, scene);
    armRoot.position.set(towerX, y, 0);
    const arm = box('crew access arm', {width: 32, depth: 3, height: 2.2}, new BABYLON.Vector3(-16, 0, 0), safetyMaterial);
    arm.parent = armRoot;
    arm.rotation.z = .08;
    const armEndRoot = new BABYLON.TransformNode(`crew access arm extremity root ${y}`, scene);
    armEndRoot.parent = armRoot;
    armEndRoot.position.set(-32, 0, 0);
    const platform = box('crew access platform', {width: 8, depth: 12, height: 2}, new BABYLON.Vector3(-4, -1.5, 0), steelMaterial);
    platform.parent = armEndRoot;
    const endRail = box('crew access arm extremity rail', {width: 8, depth: .45, height: 2.2}, new BABYLON.Vector3(-4, 1.3, -3.1), safetyMaterial);
    endRail.parent = armEndRoot;
    armRoot.metadata = {launchpadPart: 'crew-access-arm', hingeY: y, targetFallDegrees: 45};
    armEndRoot.metadata = {launchpadPart: 'crew-access-arm-extremity', retractsBeforeFall: true};
    accessArmRoots.push({root: armRoot, extremity: armEndRoot});
  }
  for (let i = -3; i <= 3; i += 1) {
    box('umbilical service pipe', {width: 2, depth: 2, height: 92}, new BABYLON.Vector3(towerX + i * 2.5, 68, -10), darkSteelMaterial);
  }

  const componentOrder = vehicle?.components?.filter(item => item.kind !== 'booster').sort((a, b) => {
    const order = {'core-stage': 1, 'upper-stage': 2, interstage: 3, 'crew-capsule': 4, 'orbital-module': 5, 'escape-system': 6, 'escape-tower': 7};
    return (order[a.kind] || 4) - (order[b.kind] || 4);
  }) || [];
  const physicalHeight = componentOrder.reduce((sum, item) => sum + (item.heightM || 0), 0);
  const welcomeEarthRadiusScene = 999;
  const visualBoost = 5_000;
  const visualScale = (welcomeEarthRadiusScene * 2 / (2 * 6_371_000)) * visualBoost;
  const rocketRoot = new BABYLON.TransformNode(`launch rocket assembly · ${vehicle?.id || 'selected vehicle'}`, scene);
  rocketRoot.position.set(0, 20, 0);
  const rocketColors = {
    'crew-capsule': new BABYLON.Color3(.62, .72, .82),
    'orbital-module': new BABYLON.Color3(.36, .52, .7),
    'upper-stage': new BABYLON.Color3(.72, .75, .78),
    'core-stage': new BABYLON.Color3(.82, .83, .78),
    'booster': new BABYLON.Color3(.42, .46, .5),
    'escape-tower': new BABYLON.Color3(.9, .42, .22),
    'escape-system': new BABYLON.Color3(.9, .42, .22),
    interstage: new BABYLON.Color3(.25, .3, .36)
  };
  const rocketMaterialFor = (component) => {
    const result = new BABYLON.StandardMaterial(`launch rocket material · ${component.id}`, scene);
    result.diffuseColor = rocketColors[component.kind] || new BABYLON.Color3(.55, .58, .62);
    result.metallic = component.kind === 'crew-capsule' ? .35 : .18;
    result.roughness = .62;
    return result;
  };
  const createRocketPart = component => {
    const diameter = Math.max(.012, component.diameterM * visualScale);
    const height = Math.max(.018, component.heightM * visualScale);
    let part;
    if (component.kind === 'crew-capsule' || component.kind === 'orbital-module') {
      part = BABYLON.MeshBuilder.CreateCylinder(`selected rocket ${component.id}`, {diameterTop: diameter * .68, diameterBottom: diameter, height, tessellation: 32}, scene);
    } else if (component.kind === 'escape-tower' || component.kind === 'escape-system') {
      part = BABYLON.MeshBuilder.CreateCylinder(`selected rocket ${component.id}`, {diameter: diameter * .34, height, tessellation: 20}, scene);
    } else {
      part = BABYLON.MeshBuilder.CreateCylinder(`selected rocket ${component.id}`, {diameter, height, tessellation: 32}, scene);
    }
    part.material = rocketMaterialFor(component);
    part.metadata = {...component, physicalHeightM: component.heightM, physicalDiameterM: component.diameterM, visualBoost, sceneRole: 'selected-launch-vehicle'};
    part.isPickable = false;
    part.parent = rocketRoot;
    return {part, height};
  };
  const rocketParts = [];
  const rocketPartById = new Map();
  const isMissionCore = component => component.kind === 'crew-capsule' || component.kind === 'orbital-module' || component.kind === 'core-stage' || component.kind === 'upper-stage' || component.id.includes('crew-deck');
  let rocketCursor = 0;
  for (const component of componentOrder) {
    const {part, height} = createRocketPart(component);
    part.position.y = rocketCursor + height / 2;
    rocketCursor += height;
    rocketParts.push(part);
    rocketPartById.set(component.id, part);
  }
  const boosters = vehicle?.components?.filter(item => item.kind === 'booster') || [];
  boosters.forEach((component, index) => {
    const {part, height} = createRocketPart(component);
    const angle = index / Math.max(1, boosters.length) * Math.PI * 2;
    const ring = Math.max(.04, component.diameterM * visualScale * .82);
    part.position.set(Math.cos(angle) * ring, height / 2, Math.sin(angle) * ring);
    rocketParts.push(part);
    rocketPartById.set(component.id, part);
  });
  const rocketHeight = Math.max(physicalHeight * visualScale, 1);
  const engineBurnRoot = new BABYLON.TransformNode('rocket engine burn root', scene);
  engineBurnRoot.parent = rocketRoot;
  const engineBurnMaterial = material('rocket adjustable engine burn', new BABYLON.Color3(1, .18, .025), {transparent: true, emissive: new BABYLON.Color3(1, .08, .01)});
  engineBurnMaterial.alpha = .88;
  engineBurnMaterial.backFaceCulling = false;
  const engineBurnMeshes = [];
  const burnCount = Math.max(1, Math.min(5, boosters.length + 1));
  for (let index = 0; index < burnCount; index += 1) {
    const angle = index / Math.max(1, burnCount) * Math.PI * 2;
    const radius = index === 0 ? 0 : Math.max(.05, (vehicle?.diameterM || 3) * visualScale * .28);
    const flame = BABYLON.MeshBuilder.CreateCylinder(`rocket engine burn ${index + 1}`, {diameterTop: Math.max(.02, (vehicle?.diameterM || 3) * visualScale * .12), diameterBottom: Math.max(.04, (vehicle?.diameterM || 3) * visualScale * .3), height: Math.max(.4, rocketHeight * .24), tessellation: 20}, scene);
    flame.parent = engineBurnRoot;
    flame.position.set(Math.cos(angle) * radius, -Math.max(.2, rocketHeight * .12), Math.sin(angle) * radius);
    flame.material = engineBurnMaterial;
    flame.isPickable = false;
    flame.setEnabled(false);
    engineBurnMeshes.push(flame);
  }
  const burnState = {strength: 0, active: false, throttle: 1};
  const atmosphereTopM = 100_000;
  const lowerAtmosphereM = 12_000;
  const atmosphereRadiusScene = atmosphereTopM * visualScale;
  const lowerAtmosphereRadiusScene = lowerAtmosphereM * visualScale;
  const atmosphereMaterial = material('launch atmosphere blue haze', new BABYLON.Color3(.08, .24, .62), {roughness: 1, transparent: true});
  atmosphereMaterial.disableLighting = true;
  atmosphereMaterial.emissiveColor = new BABYLON.Color3(.035, .12, .38);
  atmosphereMaterial.alpha = .065;
  atmosphereMaterial.backFaceCulling = false;
  const atmosphereShell = BABYLON.MeshBuilder.CreateSphere('launch atmosphere 100 km boundary', {diameter: atmosphereRadiusScene * 2, segments: 32, sideOrientation: BABYLON.Mesh.BACKSIDE}, scene);
  atmosphereShell.material = atmosphereMaterial;
  atmosphereShell.isPickable = false;
  atmosphereShell.metadata = {sceneRole: 'atmosphere-layer', physicalAltitudeM: atmosphereTopM, atmosphereToRocketHeightRatio: atmosphereTopM / Math.max(vehicle?.heightM || 1, 1)};
  const lowerAtmosphereMaterial = material('launch lower atmosphere haze', new BABYLON.Color3(.12, .36, .8), {roughness: 1, transparent: true});
  lowerAtmosphereMaterial.disableLighting = true;
  lowerAtmosphereMaterial.emissiveColor = new BABYLON.Color3(.05, .18, .48);
  lowerAtmosphereMaterial.alpha = .04;
  lowerAtmosphereMaterial.backFaceCulling = false;
  const lowerAtmosphereShell = BABYLON.MeshBuilder.CreateSphere('launch lower atmosphere 12 km layer', {diameter: lowerAtmosphereRadiusScene * 2, segments: 32, sideOrientation: BABYLON.Mesh.BACKSIDE}, scene);
  lowerAtmosphereShell.material = lowerAtmosphereMaterial;
  lowerAtmosphereShell.isPickable = false;
  lowerAtmosphereShell.metadata = {sceneRole: 'lower-atmosphere-layer', physicalAltitudeM: lowerAtmosphereM, atmosphereToRocketHeightRatio: lowerAtmosphereM / Math.max(vehicle?.heightM || 1, 1)};

  const atmosphereLayer = new BABYLON.Layer('launch atmosphere visual layer', null, scene, false);
  atmosphereLayer.color = new BABYLON.Color4(.015, .12, .5, .18);
  atmosphereLayer.texture = null;
  atmosphereLayer.metadata = {sceneRole: 'atmosphere-layer', physicalAltitudeM: atmosphereTopM};

  camera.target = new BABYLON.Vector3(0, 20 + rocketHeight * .52, 0);
  camera.radius = Math.max(150, rocketHeight * 2.5);
  camera.alpha = -Math.PI * .68;
  camera.beta = Math.PI * .46;
  camera.maxZ = atmosphereRadiusScene * 1.4;
  const minimumCameraGroundClearance = 1.5;
  const launchBaseY = rocketRoot.position.y;
  const flightModel = vehicle?.flightModel || {
    initialMassKg: 100000,
    dryMassKg: 20000,
    propellantMassKg: 80000,
    thrustSeaLevelN: 1500000,
    thrustVacuumN: 1650000,
    specificImpulseSeaLevelS: 300,
    specificImpulseVacuumS: 340,
    engines: 'generic fallback engine model',
    approximate: true
  };
  const gravityConstant = 9.80665;
  const earthRadiusM = 6_371_000;
  const earthRotationRateRadS = 7.2921159e-5;
  const siteLatitudeDeg = Number(platform?.lat) || 0;
  const siteLongitudeDeg = Number(platform?.lon) || 0;
  const siteElevationM = Math.max(0, Number(platform?.elevationM) || 0);
  const siteRotationalVelocityMps = earthRotationRateRadS * (earthRadiusM + siteElevationM) * Math.cos(siteLatitudeDeg * Math.PI / 180);
  const launchSiteAdvantageKmS = siteRotationalVelocityMps / 1000;
  let throttle = 1;
  const launchState = {
    phase: 'prelaunch',
    elapsed: 0,
    altitudeKm: 0,
    verticalSpeedKmS: 0,
    horizontalSpeedKmS: launchSiteAdvantageKmS,
    speedKmS: launchSiteAdvantageKmS,
    radiusKm: 6371,
    siteLatitudeDeg,
    siteLongitudeDeg,
    siteElevationM,
    launchSiteAdvantageKmS,
    tracePointCount: 0,
    separationCount: 0,
    separatedComponentIds: [],
    fuelKg: flightModel.propellantMassKg,
    fuelFraction: 1,
    massKg: flightModel.initialMassKg,
    jettisonedMassKg: 0,
    accelerationMps2: 0,
    accelerationG: 0,
    fuelBurnKgS: 0,
    throttle: 1,
    burnStrength: 0,
    burnActive: false,
    extremityRetractProgress: 0,
    extremityRetracted: false,
    accessArmAngleDeg: 4.6,
    engines: flightModel.engines,
    started: false,
    aborted: false
  };
  const separatedStates = new Map();
  function separateComponent(component) {
    const part = rocketPartById.get(component.id);
    if (!part || separatedStates.has(component.id)) return;
    part.computeWorldMatrix(true);
    const worldPosition = part.getAbsolutePosition().clone();
    part.parent = null;
    part.position.copyFrom(worldPosition);
    const outward = new BABYLON.Vector3(worldPosition.x, 0, worldPosition.z);
    if (outward.lengthSquared() < .000001) outward.copyFrom(BABYLON.Axis.X);
    outward.normalize();
    const detachableCount = (vehicle?.components || []).filter(item => item.detachable && !isMissionCore(item)).length;
    const jettisonMassKg = detachableCount > 0 ? (flightModel.jettisonableMassKg || 0) / detachableCount : 0;
    launchState.jettisonedMassKg += jettisonMassKg;
    separatedStates.set(component.id, {
      component,
      part,
      position: worldPosition,
      jettisonMassKg,
      velocity: outward.scale(.12).add(new BABYLON.Vector3(0, -.035, 0))
    });
    launchState.separationCount += 1;
    launchState.separatedComponentIds = [...separatedStates.keys()];
  }
  function applyLaunchSeparations() {
    for (const component of vehicle?.components || []) {
      if (!component.detachable || component.detachAtS == null || isMissionCore(component)) continue;
      if (launchState.elapsed >= component.detachAtS) separateComponent(component);
    }
  }
  function stepSeparatedComponents(deltaSeconds) {
    for (const state of separatedStates.values()) {
      state.velocity.y -= .004 * deltaSeconds;
      state.position.addInPlace(state.velocity.scale(deltaSeconds));
      state.part.position.copyFrom(state.position);
      state.part.rotation.x += deltaSeconds * .12;
      state.part.rotation.z += deltaSeconds * .08;
    }
  }
  const launchPhaseCallbacks = new Set();
  function setLaunchPhase(phase) {
    if (launchState.phase === phase) return;
    launchState.phase = phase;
    launchPhaseCallbacks.forEach(callback => callback(phase, {...launchState}));
  }
  function updateLaunchpadMechanisms() {
    const extremityProgress = launchState.started ? BABYLON.Scalar.Clamp(launchState.elapsed / 3, 0, 1) : 0;
    const armProgress = launchState.started ? BABYLON.Scalar.Clamp((launchState.elapsed - 3) / 5, 0, 1) : 0;
    const smoothExtremity = extremityProgress * extremityProgress * (3 - 2 * extremityProgress);
    const smoothArm = armProgress * armProgress * (3 - 2 * armProgress);
    launchState.extremityRetractProgress = smoothExtremity;
    launchState.extremityRetracted = smoothExtremity >= 1;
    launchState.accessArmAngleDeg = Math.abs((.08 + (Math.PI / 4 - .08) * smoothArm) * 180 / Math.PI);
    for (const {root, extremity} of accessArmRoots) {
      extremity.position.x = -32 + 14 * smoothExtremity;
      root.rotation.z = .08 + (Math.PI / 4 - .08) * smoothArm;
    }
  }
  function updateEngineBurnVisual() {
    const referenceFlow = Math.max(1, flightModel.thrustSeaLevelN / (flightModel.specificImpulseSeaLevelS * gravityConstant));
    const strength = launchState.started && !launchState.aborted && launchState.fuelKg > 0 ? BABYLON.Scalar.Clamp((launchState.fuelBurnKgS / referenceFlow) * throttle, 0, 1) : 0;
    burnState.strength = strength;
    burnState.active = strength > .001;
    burnState.throttle = throttle;
    launchState.burnStrength = strength;
    launchState.burnActive = burnState.active;
    engineBurnMaterial.alpha = .12 + strength * .76;
    engineBurnMaterial.emissiveColor = new BABYLON.Color3(1, .04 + strength * .35, .005);
    engineBurnMeshes.forEach((flame, index) => {
      flame.setEnabled(burnState.active);
      flame.scaling.y = .2 + strength * (index === 0 ? 2.2 : 1.7);
      flame.scaling.x = .45 + strength * .55;
      flame.scaling.z = .45 + strength * .55;
    });
  }
  function updateLaunchPresentation() {
    const altitudeKm = launchState.altitudeKm;
    if (launchState.aborted) {
      setLaunchPhase('aborted');
    } else if (altitudeKm < 10) {
      setLaunchPhase('liftoff');
    } else if (altitudeKm < 100) {
      setLaunchPhase('atmospheric-ascent');
    } else if (altitudeKm < 200 || launchState.speedKmS < 7.79) {
      setLaunchPhase('orbital-insertion');
    } else {
      setLaunchPhase('stable-leo');
    }
    launchState.radiusKm = 6371 + altitudeKm;
    launchState.fuelFraction = flightModel.propellantMassKg > 0 ? launchState.fuelKg / flightModel.propellantMassKg : 0;
    launchState.throttle = throttle;
    updateSkyGradient(altitudeKm);
    launchState.tracePointCount = launchState.started ? Math.max(1, Math.floor(launchState.elapsed * 10)) : 0;
    updateLaunchpadMechanisms();
    updateEngineBurnVisual();
    rocketRoot.position.y = launchBaseY + altitudeKm * 1000 * visualScale;
    camera.setTarget(new BABYLON.Vector3(rocketRoot.position.x, rocketRoot.position.y + rocketHeight * .52, rocketRoot.position.z));
    camera.radius = Math.max(150, rocketHeight * 3);
  }
  function integrateFlightDynamics(deltaSeconds) {
    const altitudeM = launchState.altitudeKm * 1000;
    const densityRatio = Math.exp(-altitudeM / 8500);
    const vacuumBlend = BABYLON.Scalar.Clamp(altitudeM / 100000, 0, 1);
    const baseThrust = flightModel.thrustSeaLevelN + (flightModel.thrustVacuumN - flightModel.thrustSeaLevelN) * vacuumBlend;
    const coreThrust = flightModel.coreStageThrustSeaLevelN ? flightModel.coreStageThrustSeaLevelN * (.92 + .08 * vacuumBlend) : baseThrust;
    const upperThrust = flightModel.upperStageThrustVacuumN || coreThrust;
    const upperStageActive = launchState.elapsed >= (flightModel.upperStageStartS || Infinity);
    const stageThrust = upperStageActive ? upperThrust : launchState.elapsed >= (flightModel.boosterSeparationS || Infinity) ? coreThrust : baseThrust;
    const commandedThrust = stageThrust * throttle;
    const nominalIsp = flightModel.specificImpulseSeaLevelS + (flightModel.specificImpulseVacuumS - flightModel.specificImpulseSeaLevelS) * vacuumBlend;
    const isp = upperStageActive ? (flightModel.upperStageSpecificImpulseS || nominalIsp) : nominalIsp;
    const mass = Math.max(flightModel.dryMassKg, launchState.massKg);
    const massFlow = commandedThrust > 0 ? commandedThrust / (isp * gravityConstant) : 0;
    const fuelBurn = Math.min(launchState.fuelKg, massFlow * deltaSeconds);
    const actualThrust = massFlow > 0 && fuelBurn > 0 ? commandedThrust * (fuelBurn / (massFlow * deltaSeconds)) : 0;
    launchState.fuelKg = Math.max(0, launchState.fuelKg - fuelBurn);
    launchState.massKg = Math.max(flightModel.dryMassKg, flightModel.dryMassKg + launchState.fuelKg - launchState.jettisonedMassKg);
    launchState.fuelBurnKgS = deltaSeconds > 0 ? fuelBurn / deltaSeconds : 0;
    const gravity = gravityConstant * Math.pow(6371 / Math.max(6371, 6371 + launchState.altitudeKm), 2);
    const thrustAcceleration = actualThrust / Math.max(1, launchState.massKg);
    const dragAcceleration = Math.min(12, .000004 * Math.pow(launchState.speedKmS * 1000, 2) * densityRatio);
    const netAcceleration = thrustAcceleration - gravity - dragAcceleration;
    launchState.accelerationMps2 = netAcceleration;
    launchState.accelerationG = netAcceleration / gravityConstant;
    if (altitudeM < 100000) {
      launchState.verticalSpeedKmS = Math.max(0, launchState.verticalSpeedKmS + netAcceleration * deltaSeconds / 1000);
      launchState.horizontalSpeedKmS = Math.max(0, launchState.horizontalSpeedKmS - dragAcceleration * deltaSeconds / 1000);
      launchState.speedKmS = Math.sqrt(launchState.verticalSpeedKmS ** 2 + launchState.horizontalSpeedKmS ** 2);
      launchState.altitudeKm += launchState.verticalSpeedKmS * deltaSeconds;
    } else {
      const horizontalAcceleration = Math.max(0, thrustAcceleration) * .92;
      launchState.verticalSpeedKmS = Math.max(0, launchState.verticalSpeedKmS + netAcceleration * .15 * deltaSeconds / 1000 - launchState.verticalSpeedKmS * .1 * deltaSeconds);
      launchState.horizontalSpeedKmS = Math.min(7.79, launchState.horizontalSpeedKmS + horizontalAcceleration * deltaSeconds / 1000);
      launchState.speedKmS = Math.sqrt(launchState.verticalSpeedKmS ** 2 + launchState.horizontalSpeedKmS ** 2);
      launchState.altitudeKm += launchState.verticalSpeedKmS * deltaSeconds;
    }
    if (launchState.altitudeKm >= 200 && launchState.speedKmS >= 7.79) {
      launchState.altitudeKm = 200;
      launchState.speedKmS = 7.79;
    }
    updateLaunchPresentation();
  }
  function startLaunch() {
    if (launchState.started) return false;
    launchState.started = true;
    launchState.aborted = false;
    launchState.elapsed = 0;
    launchState.altitudeKm = siteElevationM / 1000;
    launchState.verticalSpeedKmS = 0;
    launchState.horizontalSpeedKmS = launchSiteAdvantageKmS;
    launchState.speedKmS = launchSiteAdvantageKmS;
    launchState.fuelKg = flightModel.propellantMassKg;
    launchState.massKg = flightModel.initialMassKg;
    launchState.jettisonedMassKg = 0;
    launchState.accelerationMps2 = 0;
    launchState.accelerationG = 0;
    launchState.fuelBurnKgS = 0;
    launchState.separationCount = 0;
    launchState.separatedComponentIds = [];
    setLaunchPhase('liftoff');
    updateLaunchPresentation();
    return true;
  }
  function abortLaunch() {
    if (!launchState.started || launchState.phase === 'stable-leo' || launchState.phase === 'aborted') return false;
    launchState.aborted = true;
    updateLaunchPresentation();
    return true;
  }
  function setThrottle(percent) {
    throttle = BABYLON.Scalar.Clamp(Number(percent) / 100, 0, 1);
    launchState.throttle = throttle;
    return throttle;
  }
  function stepLaunch(deltaSeconds) {
    const delta = Math.max(0, Number(deltaSeconds) || 0);
    if (!launchState.started || launchState.aborted) {
      stepSeparatedComponents(delta);
      return {...launchState};
    }
    if (launchState.phase === 'stable-leo') {
      launchState.accelerationMps2 = 0;
      launchState.accelerationG = 0;
      launchState.fuelBurnKgS = 0;
      stepSeparatedComponents(delta);
      return {...launchState};
    }
    launchState.elapsed += delta;
    integrateFlightDynamics(delta);
    applyLaunchSeparations();
    stepSeparatedComponents(delta);
    return {...launchState};
  }
  function onLaunchPhaseChange(callback) {
    if (typeof callback === 'function') launchPhaseCallbacks.add(callback);
    return () => launchPhaseCallbacks.delete(callback);
  }
  scene.onBeforeRenderObservable.add(() => {
    if (camera.globalPosition.y < minimumCameraGroundClearance) {
      camera.beta = Math.min(camera.beta, Math.PI * .48);
    }
  });

  const launchScene = {
    engine,
    scene,
    camera,
    platform,
    vehicle,
    rocketRoot,
    rocketParts,
    ground,
    groundExtentMultiplier,
    minimumCameraGroundClearance,
    atmosphereShell,
    lowerAtmosphereShell,
    atmosphereLayer,
    skyGradientLayer,
    skyGradientMaterial,
    skyGradientState,
    updateSkyGradient,
    atmosphereTopM,
    lowerAtmosphereM,
    atmosphereRadiusScene,
    lowerAtmosphereRadiusScene,
    atmosphereToRocketHeightRatio: atmosphereTopM / Math.max(vehicle?.heightM || 1, 1),
    launchState,
    startLaunch,
    abortLaunch,
    stepLaunch,
    onLaunchPhaseChange,
    getLaunchState: () => ({...launchState}),
    setThrottle,
    flightModel,
    getSeparatedComponents: () => [...separatedStates.keys()],
    visualScale,
    sourceReference,
    dispose() {
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    }
  };
  window.__LAUNCH_SCENE = launchScene;
  window.__LAUNCH_SCENE_READY = true;
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize(), {passive: true});
  engine.resize();
  scene.render();
  return launchScene;
}
