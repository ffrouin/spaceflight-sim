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

export function createRocketSystem({BABYLON, scene, rocketListNode, rocketInfoNode, rocketComponentsNode, separationButtonNode, launchButtonNode, vehicleCatalog, camera, getSelectedPlatform, earth, previewCanvas, tabletStatusNode}) {
  const visualBoost = 5_000;
  const metersToScene = (earthRadiusScene, meters) => (earthRadiusScene * 2 / (2 * 6_371_000)) * meters * visualBoost;
  const previewEngine = previewCanvas ? new BABYLON.Engine(previewCanvas, true, {preserveDrawingBuffer: false, stencil: true}, true) : null;
  const previewScene = previewEngine ? new BABYLON.Scene(previewEngine) : null;
  const previewCamera = previewScene ? new BABYLON.ArcRotateCamera('tablet preview camera', -Math.PI * .58, Math.PI * .37, 5, new BABYLON.Vector3(0, 1.5, 0), previewScene) : null;
  const previewRoot = previewScene ? new BABYLON.TransformNode('tablet rocket preview assembly', previewScene) : null;
  const previewComponentNodes = new Map();
  const previewDetachedStates = new Map();
  const previewGravity = 2.5;
  let previewClockSeconds = 0;
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
  if (previewScene) window.setInterval(() => stepPreview(1 / 30), 33);
  let selectedVehicle = null;
  let rocketRoot = null;
  let componentNodes = new Map();
  let orbitGuide = null;
  let flightSeconds = 0;
  let launchState = null;
  let flightTrace = null;
  let flightTracePoints = [];
  let crewCameraLocalLookDirection = null;

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
    if (flightTrace) flightTrace.dispose(false, true);
    rocketRoot = null;
    orbitGuide = null;
    flightTrace = null;
    flightTracePoints = [];
    launchState = null;
    crewCameraLocalLookDirection = null;
    componentNodes = new Map();
    separationButtonNode.disabled = true;
    separationButtonNode.textContent = 'Preview next separation';
    if (launchButtonNode) launchButtonNode.disabled = true;
  }

  function selectedPlatformGround() {
    const platform = getSelectedPlatform();
    if (!platform) return null;
    const marker = window.__EARTH_WELCOME?.platformMarkers?.get(platform.id);
    return marker || null;
  }

  function isMissionCore(component) {
    return component.kind === 'crew-capsule' || component.kind === 'orbital-module' || component.kind === 'core-stage' || component.kind === 'upper-stage' || component.id.includes('crew-deck');
  }

  function orderedComponents(vehicle) {
    const order = {'core-stage': 1, 'upper-stage': 2, 'interstage': 3, 'crew-capsule': 4, 'orbital-module': 5, 'escape-system': 6, 'escape-tower': 7};
    return vehicle.components.filter(item => item.kind !== 'booster').sort((a, b) => (order[a.kind] || 4) - (order[b.kind] || 4));
  }

  function clearPreview() {
    if (!previewRoot) return;
    for (const node of previewComponentNodes.values()) node.dispose(false, true);
    previewComponentNodes.clear();
    previewDetachedStates.clear();
    previewClockSeconds = 0;
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

  function stepPreview(deltaSeconds) {
    if (!previewScene || previewDetachedStates.size === 0) return;
    previewClockSeconds += deltaSeconds;
    for (const state of previewDetachedStates.values()) {
      state.velocity.y -= previewGravity * deltaSeconds;
      state.position.addInPlace(state.velocity.scale(deltaSeconds));
      state.node.position.copyFrom(state.position);
      state.node.rotation.x += deltaSeconds * .7;
      state.node.rotation.z += deltaSeconds * .45;
    }
    previewScene.render();
  }

  function updatePreviewSeparations(seconds) {
    for (const [index, component] of (selectedVehicle?.components || []).entries()) {
      const node = previewComponentNodes.get(component.id);
      if (!node || !component.detachable || component.detachAtS == null || isMissionCore(component)) continue;
      const shouldDetach = seconds >= component.detachAtS;
      const state = previewDetachedStates.get(component.id);
      if (shouldDetach && !state) {
        const initialPosition = node.position.clone();
        node.parent = null;
        node.position.copyFrom(initialPosition);
        node.setEnabled(true);
        const angle = index * 1.7;
        previewDetachedStates.set(component.id, {
          node,
          position: initialPosition,
          velocity: new BABYLON.Vector3(Math.cos(angle) * .55, .85, Math.sin(angle) * .55),
          detachAtS: component.detachAtS
        });
      } else if (!shouldDetach && state) {
        node.parent = previewRoot;
        node.position.copyFrom(state.position);
        previewDetachedStates.delete(component.id);
      }
    }
    if (tabletStatusNode && previewDetachedStates.size) tabletStatusNode.textContent = `GRAVITY PREVIEW · ${Math.round(seconds)} S`;
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
    const earthRadiusScene = window.__CELESTIAL_SYSTEM?.earthRadiusScene || earth.getBoundingInfo().boundingSphere.radius;
    const atmosphereTopAltitudeScene = earthRadiusScene * 100 / 6371;
    const stableOrbitAltitudeScene = earthRadiusScene * 200 / 6371;
    orbitGuide = BABYLON.MeshBuilder.CreateTorus('planned low Earth orbit guide', {
      diameter: (earthRadiusScene + stableOrbitAltitudeScene) * 2,
      thickness: Math.max(.02, earthRadiusScene * .001),
      tessellation: 160
    }, scene);
    orbitGuide.parent = earth;
    const launchNormal = marker.position.normalizeToNew();
    let launchTangent = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), launchNormal);
    if (launchTangent.lengthSquared() < .000001) launchTangent = BABYLON.Vector3.Cross(BABYLON.Vector3.Right(), launchNormal);
    launchTangent.normalize();
    const orbitPlaneNormal = BABYLON.Vector3.Cross(launchNormal, launchTangent).normalize();
    const orbitRotationAxis = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), orbitPlaneNormal);
    if (orbitRotationAxis.lengthSquared() > .000001) {
      orbitRotationAxis.normalize();
      orbitGuide.rotationQuaternion = BABYLON.Quaternion.RotationAxis(orbitRotationAxis, Math.acos(BABYLON.Scalar.Clamp(BABYLON.Vector3.Dot(BABYLON.Vector3.Up(), orbitPlaneNormal), -1, 1)));
    }
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

    rocketRoot.metadata = {vehicleId: vehicle.id, visualBoost, heightM: vehicle.heightM, diameterM: vehicle.diameterM, visualHeightScene: vehicle.heightM * scale, visualDiameterScene: vehicle.diameterM * scale, flightProfile: {firstPhase: 'ascent through atmosphere', atmosphereTopAltitudeKm: 100, secondPhase: 'tangent orbital insertion', stableOrbitAltitudeKm: 200, insertionAngularRateRadS: 7.79 / (6371 + 200), orbitalVelocityKmS: 7.79, orbitalPeriodSeconds: 2 * Math.PI * (6371 + 200) / 7.79}};
    separationButtonNode.disabled = vehicle.components.every(item => !item.detachable);
    if (launchButtonNode) launchButtonNode.disabled = false;
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
    rocketInfoNode.innerHTML = `<strong>${vehicle.name}</strong><div>${vehicle.launcher}<br>${vehicle.heightM} m tall · ${vehicle.diameterM} m diameter<br>${certification}<br><small>${vehicle.humanFlightNote}</small><br><small>Flight profile: ascent through the atmosphere → tangent orbital insertion → stable circular orbit at 200 km.</small><br><small>Rendering scale: ${visualBoost.toLocaleString()}× visual readability boost; physical dimensions remain in the vehicle metadata.</small></div>`;
    rocketComponentsNode.innerHTML = vehicle.components.map(component => `<div class="component-row" data-component-id="${component.id}"><strong>${component.name}</strong><span>${component.heightM} m × ${component.diameterM} m · ${isMissionCore(component) ? 'retained as primary crew vehicle' : component.detachable ? `separates at ${component.detachAtS}s` : 'retained during flight'}</span></div>`).join('');
  }

  function setRocketPose(position, flightDirection = position.normalizeToNew()) {
    rocketRoot.position.copyFrom(position);
    const direction = flightDirection.normalizeToNew();
    const rotationAxis = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), direction);
    if (rotationAxis.lengthSquared() > .000001) {
      rotationAxis.normalize();
      rocketRoot.rotationQuaternion = BABYLON.Quaternion.RotationAxis(rotationAxis, Math.acos(BABYLON.Scalar.Clamp(BABYLON.Vector3.Dot(BABYLON.Vector3.Up(), direction), -1, 1)));
    }
  }

  function updateCrewCamera(camera, state = launchState) {
    if (!camera || !rocketRoot || !selectedVehicle) return false;
    const scale = metersToScene(window.__CELESTIAL_SYSTEM.earthRadiusScene, 1);
    const stack = selectedVehicle.components.filter(item => item.kind !== 'booster').sort((a, b) => {
      const order = {'core-stage': 1, 'upper-stage': 2, 'interstage': 3, 'crew-capsule': 4, 'orbital-module': 5, 'escape-system': 6, 'escape-tower': 7};
      return (order[a.kind] || 4) - (order[b.kind] || 4);
    });
    const cabinIndex = stack.findIndex(component => component.kind === 'crew-capsule');
    if (cabinIndex < 0) return false;
    const cabin = stack[cabinIndex];
    const vehicleTopScene = stack.reduce((sum, component) => sum + component.heightM, 0) * scale;
    const externalNoseClearanceScene = Math.max(.04, 4 * scale);
    const lateralWindowOffsetScene = Math.max(.08, selectedVehicle.diameterM * scale * 8);
    rocketRoot.computeWorldMatrix(true);
    const rootWorldPosition = rocketRoot.getAbsolutePosition();
    const rootRight = rocketRoot.getDirection(BABYLON.Axis.X).normalize();
    const rootForward = rocketRoot.getDirection(BABYLON.Axis.Y).normalize();
    let cameraWorldPosition = rootWorldPosition.add(rootForward.scale(vehicleTopScene + externalNoseClearanceScene)).add(rootRight.scale(lateralWindowOffsetScene));
    const rocketBounds = rocketRoot.getHierarchyBoundingVectors(true);
    const rocketCenter = rocketBounds.min.add(rocketBounds.max).scale(.5);
    const rocketRadius = rocketBounds.max.subtract(rocketBounds.min).scale(.5).length();
    const rocketOffset = cameraWorldPosition.subtract(rocketCenter);
    if (rocketOffset.length() < rocketRadius + 2) {
      const safeDirection = rocketOffset.length() > .000001 ? rocketOffset.normalizeToNew() : rootForward;
      cameraWorldPosition = rocketCenter.add(safeDirection.scale(rocketRadius + 2));
    }
    const earthCenter = earth.getAbsolutePosition();
    const earthRadius = window.__CELESTIAL_SYSTEM?.earthRadiusScene || earth.getBoundingInfo().boundingSphere.radius;
    const earthOffset = cameraWorldPosition.subtract(earthCenter);
    if (earthOffset.length() < earthRadius + 2) {
      const safeDirection = earthOffset.length() > .000001 ? earthOffset.normalizeToNew() : rootForward;
      cameraWorldPosition = earthCenter.add(safeDirection.scale(earthRadius + 2));
    }
    camera.parent = null;
    camera.position.copyFrom(cameraWorldPosition);
    // Keep the camera in world space to avoid precision loss from a parented camera at the enlarged Earth scale.
    const rootInverse = rocketRoot.getWorldMatrix().clone();
    rootInverse.invert();
    const localForwardDirection = BABYLON.Vector3.TransformNormal(rootForward, rootInverse).normalize();
    let localLookDirection = localForwardDirection;
    if (!crewCameraLocalLookDirection && state && (state.phase === 'orbital-insertion' || state.phase === 'stable-leo')) {
      const earthDirection = earth.getAbsolutePosition().subtract(cameraWorldPosition).normalize();
      const localEarthDirection = BABYLON.Vector3.TransformNormal(earthDirection, rootInverse).normalize();
      crewCameraLocalLookDirection = localEarthDirection;
    }
    localLookDirection = crewCameraLocalLookDirection || localForwardDirection;
    const rootRotation = rocketRoot.getWorldMatrix().getRotationMatrix();
    const worldLookDirection = BABYLON.Vector3.TransformNormal(localLookDirection, rootRotation).normalize();
    const cameraRotationAxis = BABYLON.Vector3.Cross(BABYLON.Axis.Z, worldLookDirection);
    if (cameraRotationAxis.lengthSquared() > .000001) {
      cameraRotationAxis.normalize();
      camera.rotationQuaternion = BABYLON.Quaternion.RotationAxis(cameraRotationAxis, Math.acos(BABYLON.Scalar.Clamp(BABYLON.Vector3.Dot(BABYLON.Axis.Z, worldLookDirection), -1, 1)));
    } else {
      camera.rotationQuaternion = BABYLON.Quaternion.Identity();
    }
    camera.computeWorldMatrix(true);
    camera.minZ = .001;
    camera.fov = .82;
    camera.metadata = {mount: 'outside-ahead-of-crew-cabin', viewMode: 'rigid-earth-horizon-window', vehicleId: selectedVehicle.id, cabinComponentId: cabin.id, externalNoseClearanceScene, lateralWindowOffsetScene, mountDistanceScene: BABYLON.Vector3.Distance(camera.getWorldMatrix().getTranslation(), rootWorldPosition)};
    return true;
  }

  function focusRocket() {
    if (!rocketRoot) return false;
    camera.setTarget(rocketRoot.getAbsolutePosition());
    camera.radius = Math.max(42, rocketRoot.metadata?.visualHeightScene * 4 || 120);
    camera.minZ = .01;
    return true;
  }

  function launchToOrbit(callbacks = {}) {
    if (!rocketRoot || !selectedVehicle || launchState) return false;
    const startPosition = rocketRoot.position.clone();
    const startNormal = startPosition.normalizeToNew();
    let tangent = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), startNormal);
    if (tangent.lengthSquared() < .000001) tangent = BABYLON.Vector3.Cross(BABYLON.Vector3.Right(), startNormal);
    tangent.normalize();
    const orbitRadiusKm = 6371 + 200;
    const orbitalVelocityKmS = 7.79;
    const orbitAngularRate = orbitalVelocityKmS / orbitRadiusKm;
    const earthRadiusScene = window.__CELESTIAL_SYSTEM?.earthRadiusScene || earth.getBoundingInfo().boundingSphere.radius;
    crewCameraLocalLookDirection = null;
    launchState = {
      elapsed: 0,
      phase: 'liftoff',
      startPosition,
      startNormal,
      tangent,
      atmosphereRadius: earthRadiusScene * (1 + 100 / 6371),
      orbitRadius: earthRadiusScene * (1 + 200 / 6371),
      ascentDuration: 8,
      orbitDuration: 6,
      insertionAngularRate: orbitAngularRate,
      orbitalVelocityKmS,
      orbitalPeriodSeconds: Math.PI * 2 / orbitAngularRate,
      callbacks,
      orbitAngle: 0,
      orbitReported: false,
      earthRadiusScene,
      altitudeKm: 0,
      radiusKm: 6371,
      speedKmS: 0,
      previousPosition: startPosition.clone()
    };
    flightTracePoints = [startPosition.clone()];
    flightTrace = BABYLON.MeshBuilder.CreateLines('live launch flight trace', {points: flightTracePoints, colors: flightTracePoints.map(() => new BABYLON.Color4(.25, .85, 1, .9))}, scene);
    flightTrace.parent = earth;
    flightTrace.metadata = {traceType: 'live-launch-flight', phase: 'ground-to-leo'};
    if (launchButtonNode) {
      launchButtonNode.disabled = true;
      launchButtonNode.textContent = 'Launch sequence active';
    }
    setFlightSeconds(0);
    callbacks.onPhaseChange?.('liftoff');
    return true;
  }

  function stepLaunch(deltaSeconds) {
    if (!launchState || !rocketRoot) return launchState;
    launchState.elapsed += deltaSeconds;
    const state = launchState;
    let radius;
    let phase;
    if (state.elapsed < state.ascentDuration) {
      const t = state.elapsed / state.ascentDuration;
      radius = BABYLON.Scalar.Lerp(state.startPosition.length(), state.atmosphereRadius, t * t);
      phase = 'atmospheric-ascent';
    } else if (state.elapsed < state.ascentDuration + state.orbitDuration) {
      const t = (state.elapsed - state.ascentDuration) / state.orbitDuration;
      const smooth = t * t * (3 - 2 * t);
      radius = BABYLON.Scalar.Lerp(state.atmosphereRadius, state.orbitRadius, smooth);
      state.orbitAngle = t * state.insertionAngularRate * state.orbitDuration;
      phase = 'orbital-insertion';
    } else {
      phase = 'stable-leo';
      state.orbitAngle += deltaSeconds * state.insertionAngularRate;
      radius = state.orbitRadius;
    }
    if (phase !== state.phase) {
      state.phase = phase;
      state.callbacks.onPhaseChange?.(phase);
    }
    const position = state.startNormal.scale(Math.cos(state.orbitAngle)).add(state.tangent.scale(Math.sin(state.orbitAngle))).scale(radius);
    const displacement = position.subtract(state.previousPosition);
    const tangentDirection = state.startNormal.scale(-Math.sin(state.orbitAngle)).add(state.tangent.scale(Math.cos(state.orbitAngle))).normalize();
    const flightDirection = displacement.lengthSquared() > .000001
      ? displacement
      : (phase === 'stable-leo' ? tangentDirection : position.normalizeToNew());
    state.flightDirection = flightDirection.normalizeToNew();
    state.radialDirection = position.normalizeToNew();
    state.speedKmS = deltaSeconds > 0 ? displacement.length() * 6371 / state.earthRadiusScene / deltaSeconds : (phase === 'stable-leo' ? state.orbitalVelocityKmS : 0);
    state.previousPosition.copyFrom(position);
    state.radiusKm = radius * 6371 / state.earthRadiusScene;
    state.altitudeKm = state.radiusKm - 6371;
    setRocketPose(position, flightDirection.lengthSquared() > .000001 ? flightDirection : position);
    if (!flightTracePoints.length || BABYLON.Vector3.Distance(flightTracePoints[flightTracePoints.length - 1], position) > 2) {
      flightTracePoints.push(position.clone());
      flightTrace = BABYLON.MeshBuilder.CreateLines('live launch flight trace', {points: flightTracePoints, colors: flightTracePoints.map(() => new BABYLON.Color4(.25, .85, 1, .9)), instance: flightTrace}, scene);
      flightTrace.parent = earth;
      flightTrace.metadata = {traceType: 'live-launch-flight', pointCount: flightTracePoints.length, phase: state.phase};
    }
    setFlightSeconds(Math.max(0, state.elapsed * 12));
    if (phase === 'stable-leo' && !state.orbitReported) {
      state.orbitReported = true;
      state.callbacks.onOrbitAchieved?.();
    }
    return state;
  }

  function setFlightSeconds(seconds) {
    flightSeconds = Math.max(0, seconds);
    for (const component of selectedVehicle?.components || []) {
      const node = componentNodes.get(component.id);
      if (!node || !component.detachable || component.detachAtS == null || isMissionCore(component)) continue;
      node.setEnabled(flightSeconds < component.detachAtS);
      const row = rocketComponentsNode.querySelector(`[data-component-id="${component.id}"]`);
      row?.classList.toggle('detached', flightSeconds >= component.detachAtS);
    }
    separationButtonNode.disabled = !selectedVehicle || !selectedVehicle.components.some(item => item.detachable && item.detachAtS > flightSeconds);
    separationButtonNode.textContent = separationButtonNode.disabled ? 'All planned separations previewed' : `Preview next separation · ${Math.round(nextSeparationTime() - flightSeconds)} s`;
    updatePreviewSeparations(flightSeconds);
  }

  function nextSeparationTime() {
    return Math.min(...(selectedVehicle?.components || []).filter(item => item.detachable && !isMissionCore(item) && item.detachAtS > flightSeconds).map(item => item.detachAtS), Infinity);
  }

  separationButtonNode.addEventListener('click', () => setFlightSeconds(nextSeparationTime()));

  function selectVehicleById(vehicleId) {
    const button = rocketListNode.querySelector(`[data-rocket-id="${vehicleId}"]`);
    if (!button) return false;
    button.click();
    return true;
  }

  rocketListNode.innerHTML = vehicleCatalog.map(vehicle => `<button type="button" class="rocket-option" data-rocket-id="${vehicle.id}"><strong>${vehicle.name}</strong><span>${vehicle.country} · ${vehicle.heightM} m · ${vehicle.operationalCrewRating ? 'human-rated architecture' : 'crewed concept'}</span></button>`).join('');
  rocketListNode.querySelectorAll('.rocket-option').forEach(button => button.addEventListener('click', () => {
    const vehicle = vehicleCatalog.find(item => item.id === button.dataset.rocketId);
    rocketListNode.querySelectorAll('.rocket-option').forEach(item => item.classList.toggle('selected', item === button));
    buildRocket(vehicle);
  }));

  function setCrewCameraOcclusionHidden(hidden) {
    [rocketRoot, orbitGuide, flightTrace].forEach(node => node?.setEnabled(!hidden));
  }

  return {buildRocket, selectVehicleById, focusGround, focusRocket, updateCrewCamera, setCrewCameraOcclusionHidden, setFlightSeconds, launchToOrbit, stepLaunch, resizePreview, getPreviewState: () => ({gravitySceneUnitsPerSecondSquared: previewGravity, clockSeconds: previewClockSeconds, detachedComponentIds: [...previewDetachedStates.keys()]}), getFlightTrace: () => ({mesh: flightTrace, pointCount: flightTracePoints.length, points: flightTracePoints.map(point => point.asArray())}), getLaunchState: () => launchState, getSelectedVehicle: () => selectedVehicle, getRocketRoot: () => rocketRoot, getOrbitGuide: () => orbitGuide, getFlightSeconds: () => flightSeconds, visualBoost};
}
