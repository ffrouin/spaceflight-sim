// Launch wizard presentation and globe interaction.
// Main goal: make country-first site comparison consistent between list selection and marker picking.
// Technique: group immutable platform records, expose benefits, and route all selection through one state transition.

const COUNTRY_BENEFITS = Object.freeze({
  'China': 'Multiple launch regions support different orbital inclinations; Wenchang adds low-latitude access while Jiuquan supports inland launch operations.',
  'French Guiana': 'Very close to the equator, providing strong eastward rotational assistance for low-inclination missions.',
  'India': 'Low-latitude east-coast access is favorable for eastward launches, with a long-established orbital launch complex.',
  'Japan': 'Island geography provides ocean launch corridors and mature orbital launch operations, with good access to polar and inclined missions.',
  'Kazakhstan': 'A major inland orbital range with extensive heritage and broad launch azimuth history, but higher latitude reduces the equatorial boost.',
  'New Zealand': 'Southern-hemisphere ocean access is useful for high-inclination and constellation missions with open downrange sectors.',
  'United States': 'A broad network covers eastward, polar, and high-inclination missions, with different sites optimized for different azimuths.'
});

const PLATFORM_BENEFITS = Object.freeze({
  'kennedy-lc39a': 'East-coast location: strong Earth-rotation benefit for eastward launches and direct access to low-inclination trajectories.',
  'cape-slc40': 'East-coast orbital corridor with established commercial launch infrastructure and strong low-inclination access.',
  'vandenberg-slc4e': 'West-coast site optimized for polar and high-inclination trajectories over the Pacific.',
  'wallops-pad0a': 'Atlantic range supports orbital missions without overflying densely populated land during ascent.',
  'pacific-spaceport-alaska': 'High-latitude Pacific location supports polar and sun-synchronous mission geometries.',
  'kourou-ela3': 'Near-equatorial latitude maximizes the rotational velocity contribution for eastward launches.',
  'baikonur-gagarins-start': 'Large established range and extensive launch heritage; inland geography requires carefully managed downrange zones.',
  'jiuquan': 'Inland range with broad launch heritage and access to a wide range of orbital inclinations.',
  'wenchang': 'Low-latitude coastal site with ocean downrange and improved Earth-rotation assistance for eastward launches.',
  'tanegashima': 'Coastal island range with ocean downrange and mature heavy-launch integration facilities.',
  'satish-dhawan': 'East-coast range with ocean downrange and a useful low-latitude rotational contribution.',
  'rocket-lab-lc1': 'Open-ocean eastward corridor and southern latitude support for constellation and high-inclination missions.'
});

export function createLaunchWizard({BABYLON, scene, earthRadiusScene, platforms, platformListNode, countrySelectNode, countryBenefitNode, selectedPlatformNode, statusNode, camera, markerRoot, latLonToEarthVector}) {
  const platformMarkers = new Map();
  let selectedPlatform = null;
  let selectedCountry = '';

  const countries = [...new Set(platforms.map(platform => platform.country))].sort();
  countrySelectNode.innerHTML = countries.map(country => `<option value="${country}">${country}</option>`).join('');

  function platformBenefit(platform) {
    return PLATFORM_BENEFITS[platform.id] || 'Compare latitude, orbital inclination access, downrange safety, and local launch infrastructure.';
  }

  function renderCountry(country) {
    selectedCountry = country;
    countrySelectNode.value = country;
    countryBenefitNode.textContent = COUNTRY_BENEFITS[country] || 'Compare the available platforms by latitude, orbital access, downrange geography, and infrastructure.';
    platformListNode.innerHTML = '';
    for (const platform of platforms.filter(item => item.country === country)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'platform-option';
      button.dataset.platformId = platform.id;
      button.innerHTML = `<strong>${platform.name}</strong><span>${platform.type} · ${platform.operator}</span>`;
      button.addEventListener('click', () => selectPlatform(platform));
      platformListNode.appendChild(button);
    }
    if (!platforms.some(platform => platform.id === selectedPlatform?.id && platform.country === country)) {
      const first = platforms.find(platform => platform.country === country);
      if (first) selectPlatform(first, false);
    } else {
      selectPlatform(selectedPlatform, false);
    }
  }

  function selectPlatform(platform, focus = true) {
    selectedPlatform = platform;
    if (selectedCountry !== platform.country) renderCountry(platform.country);
    for (const [id, marker] of platformMarkers) {
      const active = id === platform.id;
      marker.material.emissiveColor = active ? new BABYLON.Color3(.3, 1, .68) : new BABYLON.Color3(.08, .55, .95);
      marker.scaling.setAll(active ? 1.55 : 1);
      marker.metadata.selected = active;
    }
    document.querySelectorAll('.platform-option').forEach(button => button.classList.toggle('selected', button.dataset.platformId === platform.id));
    selectedPlatformNode.innerHTML = `<strong>${platform.name}</strong><div>${platform.country} · ${platform.type}<br>${platform.operator}<br>Coordinates: ${platform.lat.toFixed(4)}°, ${platform.lon.toFixed(4)}°<br><b>Why choose it:</b> ${platformBenefit(platform)}<br><small>Data source: ${platform.source}</small></div>`;
    statusNode.textContent = `launch platform selected · ${platform.name}`;
    if (focus) {
      const target = platformMarkers.get(platform.id).getAbsolutePosition();
      camera.setTarget(target);
      camera.radius = 10;
    }
  }

  for (const platform of platforms) {
    const marker = BABYLON.MeshBuilder.CreateSphere(`launch platform · ${platform.id}`, {diameter: .075, segments: 16}, scene);
    marker.parent = markerRoot;
    marker.position.copyFrom(latLonToEarthVector(BABYLON, platform.lat, platform.lon, earthRadiusScene * 1.018));
    marker.isPickable = true;
    marker.metadata = {platformId: platform.id, selected: false, label: platform.name};
    const material = new BABYLON.StandardMaterial(`launch platform material · ${platform.id}`, scene);
    material.diffuseColor = new BABYLON.Color3(.1, .65, 1);
    material.emissiveColor = new BABYLON.Color3(.08, .55, .95);
    material.disableLighting = true;
    marker.material = material;
    platformMarkers.set(platform.id, marker);
  }

  countrySelectNode.addEventListener('change', () => renderCountry(countrySelectNode.value));
  scene.onPointerObservable.add(pointerInfo => {
    if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
    const platform = platforms.find(item => item.id === pointerInfo.pickInfo?.pickedMesh?.metadata?.platformId);
    if (platform) selectPlatform(platform);
  });

  renderCountry(countries[0]);
  return {platformMarkers, getSelectedPlatform: () => selectedPlatform, getSelectedCountry: () => selectedCountry, selectPlatform, renderCountry, platformBenefit};
}
