// Crew vehicle assembly and staging preview.
// Main goal: let the user choose a human-flight vehicle after selecting a launch site.
// Technique: build a Babylon root from immutable component records, keep physical dimensions separate
// from a documented readability scale, and hide detachable components at declared flight times.

const COLORS = Object.freeze({
  'crew-capsule': new BABYLON.Color3(.62, .72, .82),
  'orbital-module': new BABYLON.Color3(.36, .52, .7),
  'upper-stage': new BABYLON.Color3(.72, .75, .78),
  'core-stage': new BABYLON.Color3(.82, .83, .78),
  'booster': new BABYLON.Color3(.42, .46, .5),
  'escape-tower': new BABYLON.Color3(.9, .42, .22),
  'escape-system': new BABYLON.Color3(.9, .42, .22),
  'interstage': new BABYLON.Color3(.25, .3, .36)
});

export function createRocketSystem({BABYLON, scene, rocketListNode, rocketInfoNode, rocketComponentsNode, separationButtonNode, vehicleCatalog, camera, getSelectedPlatform, earth, previewCanvas, tabletStatusNode}) {
  const visualBoost = 5_000;
  const metersToScene = (earthRadiusScene, meters) => (earthRadiusScene * 2 / (2 * 6_371_000)) * meters * visualBoost;
  const previewEngine = previewCanvas ? new BABYLON.Engine(previewCanvas, true, {preserveDrawingBuffer: false, stencil: true}, true) : null;
  const previewScene = previewEngine ? new BABYLON.Scene(previewEngine) : null;
  const previewCamera = previewScene ? new BABYLON.ArcRotateCamera('tablet preview camera', -Math.PI * .58, Math.PI * .37, 5, new BABYLON.Vector3(0, 1.5, 0), previewScene) : null;
  const previewRoot = previewScene ? new BABYLON.TransformNode('tablet rocket preview assembly', previewScene) : null;
  const previewComponentNodes = new Map();
  if (previewScene) {
    previewScene.clearColor = new BABYLON.Color4(.005, .012, .028, 1);
    previewCamera.attachControl(previewCanvas, true);
    previewCamera.lowerRadiusLimit = 1;
    previewCamera.upperRadiusLimit = 20;
    previewScene.activeCamera = previewCamera;
    const key = new BABYLON.HemisphericLight('tablet preview fill', new BABYLON.Vector3(0, 1, 0), previewScene);
    key.intensity = .55;
    const rim = new BABYLON.DirectionalLight('tablet preview rim', new BABYLON.Vector3(-.5, -.8, -.4), previewScene);
    rim.intensity = 1.2;
  }
  let selectedVehicle = null;
  let rocketRoot = null;
  let componentNodes = new Map();
  let orbitGuide = null;
  let flightSeconds = 0;

  function materialFor(kind, id, targetScene = scene) {
    const material = new BABYLON.StandardMaterial(`rocket material · ${id} · ${targetScene === scene ? 'world' : 'tablet'}`, targetScene);
    material.diffuseColor = COLORS[kind] || new BABYLON.Color3(.55, .58, .62);
    material.metallic = kind === 'crew-capsule' ? .35 : .18;
    material.roughness = .62;
    return material;
  }

  function makeComponentMesh(component, scale, targetScene = scene) {
    const diameter = Math.max(.012, component.diameterM * scale);
    const height = Math.max(.018, component.heightM * scale);
    let mesh;
    if (component.kind === 'crew-capsule' || component.kind === 'orbital-module') {
      mesh = BABYLON.MeshBuilder.CreateCylinder(component.name, {diameterTop: diameter * .68, diameterBottom: diameter, height, tessellation: 32}, targetScene);
    } else if (component.kind === 'escape-tower' || component.kind === 'escape-system') {
      mesh = BABYLON.MeshBuilder.CreateCylinder(component.name, {diameter: diameter * .34, height, tessellation: 20}, targetScene);
    } else {
      mesh = BABYLON.MeshBuilder.CreateCylinder(component.name, {diameter, height, tessellation: 32}, targetScene);
    }
    mesh.material = materialFor(component.kind, component.id, targetScene);
    mesh.metadata = {...component, physicalHeightM: component.heightM, physicalDiameterM: component.diameterM, visualBoost};
    mesh.isPickable = false;
    return mesh;
  }

  function clearRocket() {
    if (rocketRoot) rocketRoot.dispose(false, true);
    if (orbitGuide) orbitGuide.dispose(false, true);
    rocketRoot = null;
    orbitGuide = null;
    componentNodes = new Map();
    separationButtonNode.disabled = true;
    separationButtonNode.textContent = 'Preview next separation';
  }

  function selectedPlatformGround() {
    const platform = getSelectedPlatform();
    if (!platform) return null;
    const marker = window.__EARTH_WELCOME?.platformMarkers?.get(platform.id);
    return marker || null;
  }

  function orderedComponents(vehicle) {
    const order = {'core-stage': 1, 'upper-stage': 2, 'interstage': 3, 'crew-capsule': 4, 'orbital-module': 5, 'escape-system': 6, 'escape-tower': 7};
    return vehicle.components.filter(item => item.kind !== 'booster').sort((a, b) => (order[a.kind] || 4) - (order[b.kind] || 4));
  }

  function clearPreview() {
    if (!previewRoot) return;
    previewRoot.getChildMeshes().forEach(mesh => mesh.dispose(false, true));
    previewComponentNodes.clear();
  }

  function renderPreview(vehicle) {
    if (!previewScene || !previewRoot || !previewCamera) return;
    clearPreview();
    const scale = Math.min(.032, 3.4 / vehicle.heightM);
    const boosters = vehicle.components.filter(item => item.kind === 'booster');
    let cursor = 0;
    for (const component of orderedComponents(vehicle)) {
      const node = makeComponentMesh(component, scale, previewScene);
      node.parent = previewRoot;
      const height = Math.max(.018, component.heightM * scale);
      node.position.y = cursor + height / 2;
      cursor += height;
      previewComponentNodes.set(component.id, node);
    }
    boosters.forEach((component, index) => {
      const node = makeComponentMesh(component, scale, previewScene);
      node.parent = previewRoot;
      const height = Math.max(.018, component.heightM * scale);
      const angle = index / Math.max(1, boosters.length) * Math.PI * 2;
      const ring = Math.max(.04, component.diameterM * scale * .82);
      node.position.set(Math.cos(angle) * ring, height / 2, Math.sin(angle) * ring);
      previewComponentNodes.set(component.id, node);
    });
    const center = cursor / 2;
    previewCamera.setTarget(new BABYLON.Vector3(0, center, 0));
    previewCamera.radius = Math.max(4.2, cursor * 1.65);
    if (tabletStatusNode) tabletStatusNode.textContent = vehicle.id.replaceAll('-', ' ').toUpperCase();
    previewScene.render();
  }

  function updatePreviewSeparations(seconds) {
    for (const component of selectedVehicle?.components || []) {
      const node = previewComponentNodes.get(component.id);
      if (node && component.detachable && component.detachAtS != null) node.setEnabled(seconds < component.detachAtS);
    }
    if (previewScene) previewScene.render();
  }

  function resizePreview() {
    if (previewEngine) previewEngine.resize();
    if (previewScene) previewScene.render();
  }

  function buildRocket(vehicle) {
    clearRocket();
    selectedVehicle = vehicle;
    flightSeconds = 0;
    const marker = selectedPlatformGround();
    if (!marker) return;
    const normal = marker.position.normalizeToNew();
    rocketRoot = new BABYLON.TransformNode(`rocket assembly · ${vehicle.id}`, scene);
    rocketRoot.parent = earth;
    rocketRoot.position.copyFrom(marker.position.add(normal.scale(.04)));
    const rotationAxis = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), normal);
    if (rotationAxis.lengthSquared() > .000001) {
      rotationAxis.normalize();
      rocketRoot.rotationQuaternion = BABYLON.Quaternion.RotationAxis(rotationAxis, Math.acos(BABYLON.Scalar.Clamp(BABYLON.Vector3.Dot(BABYLON.Vector3.Up(), normal), -1, 1)));
    }

    const scale = metersToScene(window.__CELESTIAL_SYSTEM.earthRadiusScene, 1);
    const boosters = vehicle.components.filter(item => item.kind === 'booster');
    const stack = vehicle.components.filter(item => item.kind !== 'booster').sort((a, b) => {
      const order = {'core-stage': 1, 'upper-stage': 2, 'interstage': 3, 'crew-capsule': 4, 'orbital-module': 5, 'escape-system': 6, 'escape-tower': 7};
      return (order[a.kind] || 4) - (order[b.kind] || 4);
    });
    let cursor = 0;
    for (const component of stack) {
      const node = makeComponentMesh(component, scale);
      node.parent = rocketRoot;
      const h = Math.max(.018, component.heightM * scale);
      node.position.y = cursor + h / 2;
      cursor += h;
      componentNodes.set(component.id, node);
    }
    boosters.forEach((component, index) => {
      const node = makeComponentMesh(component, scale);
      node.parent = rocketRoot;
      const h = Math.max(.018, component.heightM * scale);
      const angle = index / Math.max(1, boosters.length) * Math.PI * 2;
      const ring = Math.max(.04, component.diameterM * scale * .82);
      node.position.set(Math.cos(angle) * ring, h / 2, Math.sin(angle) * ring);
      componentNodes.set(component.id, node);
    });
    const earthRadiusScene = earth.getBoundingInfo().boundingSphere.radius;
    const atmosphereTopAltitudeScene = earthRadiusScene * 100 / 6371;
    const stableOrbitAltitudeScene = earthRadiusScene * 200 / 6371;
    orbitGuide = BABYLON.MeshBuilder.CreateTorus('planned low Earth orbit guide', {
      diameter: (earthRadiusScene + stableOrbitAltitudeScene) * 2,
      thickness: Math.max(.02, earthRadiusScene * .001),
      tessellation: 160
    }, scene);
    orbitGuide.parent = earth;
    const orbitMaterial = new BABYLON.StandardMaterial('planned low Earth orbit material', scene);
    orbitMaterial.emissiveColor = new BABYLON.Color3(.18, .72, 1);
    orbitMaterial.alpha = .38;
    orbitMaterial.disableLighting = true;
    orbitGuide.material = orbitMaterial;
    orbitGuide.metadata = {
      orbitType: 'planned-low-earth-orbit',
      atmosphereTopAltitudeKm: 100,
      stableOrbitAltitudeKm: 200,
      atmosphereTopAltitudeScene,
      stableOrbitAltitudeScene
    };

    rocketRoot.metadata = {vehicleId: vehicle.id, visualBoost, heightM: vehicle.heightM, diameterM: vehicle.diameterM, visualHeightScene: vehicle.heightM * scale, visualDiameterScene: vehicle.diameterM * scale, flightProfile: {firstPhase: 'ascent through atmosphere', atmosphereTopAltitudeKm: 100, secondPhase: 'circular low Earth orbit', stableOrbitAltitudeKm: 200}};
    separationButtonNode.disabled = vehicle.components.every(item => !item.detachable);
    renderVehicleInfo(vehicle);
    renderPreview(vehicle);
    focusGround(marker, rocketRoot.metadata.visualHeightScene);
  }

  function focusGround(marker = selectedPlatformGround(), visualHeightScene = null) {
    if (!marker) return;
    const target = marker.getAbsolutePosition();
    camera.setTarget(target);
    // Keep the selected rocket large enough in frame without changing physical dimensions.
    camera.radius = Math.max(visualHeightScene ? visualHeightScene * 4 : earth.getBoundingInfo().boundingSphere.radius * 2.05, earth.getBoundingInfo().boundingSphere.radius * 2.05);
  }

  function renderVehicleInfo(vehicle) {
    const certification = vehicle.operationalCrewRating ? 'Operational human-flight architecture' : 'Crewed concept / certification not implied';
    rocketInfoNode.innerHTML = `<strong>${vehicle.name}</strong><div>${vehicle.launcher}<br>${vehicle.heightM} m tall · ${vehicle.diameterM} m diameter<br>${certification}<br><small>${vehicle.humanFlightNote}</small><br><small>Flight profile: ascent through the atmosphere → stable circular orbit at 200 km.</small><br><small>Rendering scale: ${visualBoost.toLocaleString()}× visual readability boost; physical dimensions remain in the vehicle metadata.</small></div>`;
    rocketComponentsNode.innerHTML = vehicle.components.map(component => `<div class="component-row" data-component-id="${component.id}"><strong>${component.name}</strong><span>${component.heightM} m × ${component.diameterM} m · ${component.detachable ? `separates at ${component.detachAtS}s` : 'retained during flight'}</span></div>`).join('');
  }

  function setFlightSeconds(seconds) {
    flightSeconds = Math.max(0, seconds);
    for (const component of selectedVehicle?.components || []) {
      const node = componentNodes.get(component.id);
      if (!node || !component.detachable || component.detachAtS == null) continue;
      node.setEnabled(flightSeconds < component.detachAtS);
      const row = rocketComponentsNode.querySelector(`[data-component-id="${component.id}"]`);
      row?.classList.toggle('detached', flightSeconds >= component.detachAtS);
    }
    separationButtonNode.disabled = !selectedVehicle || !selectedVehicle.components.some(item => item.detachable && item.detachAtS > flightSeconds);
    separationButtonNode.textContent = separationButtonNode.disabled ? 'All planned separations previewed' : `Preview next separation · ${Math.round(nextSeparationTime() - flightSeconds)} s`;
    updatePreviewSeparations(flightSeconds);
  }

  function nextSeparationTime() {
    return Math.min(...(selectedVehicle?.components || []).filter(item => item.detachable && item.detachAtS > flightSeconds).map(item => item.detachAtS), Infinity);
  }

  separationButtonNode.addEventListener('click', () => setFlightSeconds(nextSeparationTime()));

  rocketListNode.innerHTML = vehicleCatalog.map(vehicle => `<button type="button" class="rocket-option" data-rocket-id="${vehicle.id}"><strong>${vehicle.name}</strong><span>${vehicle.country} · ${vehicle.heightM} m · ${vehicle.operationalCrewRating ? 'human-rated architecture' : 'crewed concept'}</span></button>`).join('');
  rocketListNode.querySelectorAll('.rocket-option').forEach(button => button.addEventListener('click', () => {
    const vehicle = vehicleCatalog.find(item => item.id === button.dataset.rocketId);
    rocketListNode.querySelectorAll('.rocket-option').forEach(item => item.classList.toggle('selected', item === button));
    buildRocket(vehicle);
  }));

  return {buildRocket, focusGround, setFlightSeconds, resizePreview, getSelectedVehicle: () => selectedVehicle, getRocketRoot: () => rocketRoot, getOrbitGuide: () => orbitGuide, getFlightSeconds: () => flightSeconds, visualBoost};
}
