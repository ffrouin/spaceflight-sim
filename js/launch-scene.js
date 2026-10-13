// Launch-scene renderer.
// Main goal: rebuild a clean ground launch environment after the welcome scene is purged.
// Technique: create a dedicated Babylon engine/scene with a procedural crawler, service tower,
// exhaust pad, landscape, and the selected vehicle assembled from its immutable component data.

export function createLaunchScene({BABYLON, canvas, platform, vehicle, sourceReference}) {
  const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer: true, stencil: true}, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(.015, .025, .04, 1);
  scene.metadata = {
    sceneType: 'ground-launch-scene',
    platformId: platform?.id || null,
    platformName: platform?.name || null,
    vehicleId: vehicle?.id || null,
    sourceReference
  };

  const camera = new BABYLON.ArcRotateCamera(
    'launch scene camera', -Math.PI * .68, Math.PI * .34, 220,
    new BABYLON.Vector3(0, 35, 0), scene
  );
  camera.lowerRadiusLimit = 55;
  camera.upperRadiusLimit = 700;
  camera.lowerBetaLimit = .08;
  camera.upperBetaLimit = Math.PI * .47;
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

  for (let y = 35; y <= 105; y += 18) {
    const arm = box('crew access arm', {width: 40, depth: 3, height: 2.2}, new BABYLON.Vector3(towerX - 20, y, 0), safetyMaterial);
    arm.rotation.z = .08;
    box('crew access platform', {width: 8, depth: 12, height: 2}, new BABYLON.Vector3(towerX - 41, y - 1.5, 0), steelMaterial);
  }
  for (let i = -3; i <= 3; i += 1) {
    box('umbilical service pipe', {width: 2, depth: 2, height: 92}, new BABYLON.Vector3(towerX + i * 2.5, 68, -10), darkSteelMaterial);
  }

  const componentOrder = vehicle?.components?.filter(item => item.kind !== 'booster').sort((a, b) => {
    const order = {'core-stage': 1, 'upper-stage': 2, interstage: 3, 'crew-capsule': 4, 'orbital-module': 5, 'escape-system': 6, 'escape-tower': 7};
    return (order[a.kind] || 4) - (order[b.kind] || 4);
  }) || [];
  const physicalHeight = componentOrder.reduce((sum, item) => sum + (item.heightM || 0), 0);
  const visualScale = Math.min(1, 92 / Math.max(physicalHeight, 1));
  const rocketParts = [];
  let rocketCursor = 20;
  const componentMaterial = kind => kind === 'escape-tower' || kind === 'escape-system' ? orangeMaterial : kind === 'core-stage' ? orangeMaterial : kind === 'interstage' ? blackMaterial : rocketMaterial;
  for (const component of componentOrder) {
    const height = Math.max(.5, (component.heightM || 1) * visualScale);
    const diameter = Math.max(1.2, (component.diameterM || 1) * visualScale);
    const part = cylinder(`selected rocket ${component.id}`, diameter, height, new BABYLON.Vector3(0, rocketCursor + height / 2, 0), componentMaterial(component.kind));
    part.metadata = {...component, sceneRole: 'selected-launch-vehicle'};
    rocketParts.push(part);
    rocketCursor += height;
  }
  const boosters = vehicle?.components?.filter(item => item.kind === 'booster') || [];
  boosters.forEach((component, index) => {
    const height = Math.max(.5, (component.heightM || 1) * visualScale);
    const diameter = Math.max(1.2, (component.diameterM || 1) * visualScale);
    const x = (index - (boosters.length - 1) / 2) * Math.max(7, diameter * 1.35);
    const booster = cylinder(`selected rocket booster ${component.id}`, diameter, height, new BABYLON.Vector3(x, 20 + height / 2, 0), orangeMaterial);
    booster.metadata = {...component, sceneRole: 'selected-launch-vehicle'};
    rocketParts.push(booster);
  });

  const rocketHeight = Math.max(physicalHeight * visualScale, 1);
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
  camera.beta = Math.PI * .34;
  camera.maxZ = atmosphereRadiusScene * 1.25;
  const minimumCameraGroundClearance = 1.5;
  scene.onBeforeRenderObservable.add(() => {
    if (camera.globalPosition.y < minimumCameraGroundClearance) {
      camera.beta = Math.min(camera.beta, Math.PI * .46);
    }
  });

  const launchScene = {
    engine,
    scene,
    camera,
    platform,
    vehicle,
    rocketParts,
    ground,
    groundExtentMultiplier,
    minimumCameraGroundClearance,
    atmosphereShell,
    lowerAtmosphereShell,
    atmosphereLayer,
    atmosphereTopM,
    lowerAtmosphereM,
    atmosphereRadiusScene,
    lowerAtmosphereRadiusScene,
    atmosphereToRocketHeightRatio: atmosphereTopM / Math.max(vehicle?.heightM || 1, 1),
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
