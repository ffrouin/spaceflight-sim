// Sea-level launch environment model.
// Main goal: make ground-zero atmospheric assumptions explicit and reusable.
// Technique: International Standard Atmosphere troposphere equation for the first 11 km.

export const ATMOSPHERE = Object.freeze({
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

export function isaAtmosphereAt(altitudeM = 0) {
  const h = Math.max(0, Number(altitudeM));
  const temperatureK = ATMOSPHERE.seaLevelTemperatureK + ATMOSPHERE.lapseRateKPerM * Math.min(h, 11_000);
  const exponent = -ATMOSPHERE.gravityMps2 / (ATMOSPHERE.lapseRateKPerM * ATMOSPHERE.specificGasConstantAir);
  const pressurePa = ATMOSPHERE.seaLevelPressurePa * Math.pow(temperatureK / ATMOSPHERE.seaLevelTemperatureK, exponent);
  const densityKgM3 = pressurePa / (ATMOSPHERE.specificGasConstantAir * temperatureK);
  return { altitudeM: h, temperatureK, pressurePa, densityKgM3 };
}
