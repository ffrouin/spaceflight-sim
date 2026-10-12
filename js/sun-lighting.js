// Sun-origin lighting and lens/atmosphere presentation.
// Main goal: reproduce the reference image's hard sun direction, bright rim, and controlled lens flare.
// Technique: point light for terminator, Fresnel atmosphere emission, GlowLayer, and a procedural flare texture.

export function createSunLighting({BABYLON, scene, sunMesh, sunLight, atmosphereMaterial}) {
  sunLight.intensity = 3.8;
  sunLight.range = 100;
  sunLight.diffuse = new BABYLON.Color3(1, .9, .72);

  const fresnel = new BABYLON.FresnelParameters();
  fresnel.bias = .08;
  fresnel.power = 3.2;
  fresnel.leftColor = new BABYLON.Color3(.01, .04, .22);
  fresnel.rightColor = new BABYLON.Color3(.25, .72, 1);
  atmosphereMaterial.emissiveFresnelParameters = fresnel;
  atmosphereMaterial.alpha = .075;

  const glowLayer = new BABYLON.GlowLayer('Sun and atmospheric rim glow', scene, {blurKernelSize: 48});
  glowLayer.intensity = .28;
  glowLayer.addIncludedOnlyMesh(sunMesh);

  // A dynamic radial texture avoids adding another external asset for the flare.
  const flareTexture = new BABYLON.DynamicTexture('procedural sun flare texture', {width: 256, height: 256}, scene, false);
  const ctx = flareTexture.getContext();
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.12, 'rgba(255,244,202,.95)');
  gradient.addColorStop(.38, 'rgba(255,190,80,.35)');
  gradient.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  flareTexture.hasAlpha = true;
  flareTexture.update();

  const flareUrl = flareTexture.getContext().canvas.toDataURL('image/png');
  let lensFlareSystem = null;
  if (BABYLON.LensFlareSystem && BABYLON.LensFlare) {
    lensFlareSystem = new BABYLON.LensFlareSystem('Sun lens flare', sunMesh, scene);
    lensFlareSystem.borderLimit = .15;
    new BABYLON.LensFlare(.38, 0, new BABYLON.Color3(1, .78, .35), flareUrl, lensFlareSystem);
    new BABYLON.LensFlare(.12, .34, new BABYLON.Color3(.55, .75, 1), flareUrl, lensFlareSystem);
    new BABYLON.LensFlare(.08, .58, new BABYLON.Color3(1, .45, .2), flareUrl, lensFlareSystem);
    new BABYLON.LensFlare(.05, .82, new BABYLON.Color3(.35, .55, 1), flareUrl, lensFlareSystem);
  }

  return {glowLayer, lensFlareSystem, flareTexture};
}
