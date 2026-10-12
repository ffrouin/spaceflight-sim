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

export function createRocketSystem({BABYLON, scene, rocketListNode, rocketInfoNode, rocketComponentsNode, separationButtonNode, vehicleCatalog, camera, getSelectedPlatform, earth}) {
  const visualBoost = 15_000;
  const metersToScene = (earthRadiusScene, meters) => (earthRadiusScene * 2 / (2 * 6_371_000)) * meters * visualBoost;
  let selectedVehicle = null;
  let rocketRoot = null;
  let componentNodes = new Map();
  let flightSeconds = 0;

  function materialFor(kind, id) {
    const material = new BABYLON.StandardMaterial(`rocket material · ${id}`, scene);
    material.diffuseColor = COLORS[kind] || new BABYLON.Color3(.55, .58, .62);
    material.metallic = kind === 'crew-capsule' ? .35 : .18;
    material.roughness = .62;
    return material;
  }

  function makeComponentMesh(component, scale) {
    const diameter = Math.max(.012, component.diameterM * scale);
    const height = Math.max(.018, component.heightM * scale);
    let mesh;
    if (component.kind === 'crew-capsule' || component.kind === 'orbital-module') {
      mesh = BABYLON.MeshBuilder.CreateCylinder(component.name, {diameterTop: diameter * .68, diameterBottom: diameter, height, tessellation: 32}, scene);
    } else if (component.kind === 'escape-tower' || component.kind === 'escape-system') {
      mesh = BABYLON.MeshBuilder.CreateCylinder(component.name, {diameter: diameter * .34, height, tessellation: 20}, scene);
    } else {
      mesh = BABYLON.MeshBuilder.CreateCylinder(component.name, {diameter, height, tessellation: 32}, scene);
    }
    mesh.material = materialFor(component.kind, component.id);
    mesh.metadata = {...component, physicalHeightM: component.heightM, physicalDiameterM: component.diameterM, visualBoost};
    mesh.isPickable = false;
    return mesh;
  }

  function clearRocket() {
    if (rocketRoot) rocketRoot.dispose(false, true);
    rocketRoot = null;
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
    rocketRoot.metadata = {vehicleId: vehicle.id, visualBoost, heightM: vehicle.heightM, diameterM: vehicle.diameterM, visualHeightScene: vehicle.heightM * scale, visualDiameterScene: vehicle.diameterM * scale};
    separationButtonNode.disabled = vehicle.components.every(item => !item.detachable);
    renderVehicleInfo(vehicle);
    focusGround(marker, rocketRoot.metadata.visualHeightScene);
  }

  function focusGround(marker = selectedPlatformGround(), visualHeightScene = null) {
    if (!marker) return;
    const target = marker.getAbsolutePosition();
    camera.setTarget(target);
    // Keep the selected rocket large enough in frame without changing physical dimensions.
    camera.radius = Math.max(visualHeightScene ? visualHeightScene * 5 : earth.getBoundingInfo().boundingSphere.radius * .75, .1);
  }

  function renderVehicleInfo(vehicle) {
    const certification = vehicle.operationalCrewRating ? 'Operational human-flight architecture' : 'Crewed concept / certification not implied';
    rocketInfoNode.innerHTML = `<strong>${vehicle.name}</strong><div>${vehicle.launcher}<br>${vehicle.heightM} m tall · ${vehicle.diameterM} m diameter<br>${certification}<br><small>${vehicle.humanFlightNote}</small><br><small>Visual readability boost: ${visualBoost.toLocaleString()}× over physical Earth-relative mesh scale.</small></div>`;
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

  return {buildRocket, focusGround, setFlightSeconds, getSelectedVehicle: () => selectedVehicle, getRocketRoot: () => rocketRoot, getFlightSeconds: () => flightSeconds, visualBoost};
}
