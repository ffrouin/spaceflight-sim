# Welcome page modules

- `main.js` — browser coordinator: camera, neutral scene lighting, launch-wizard DOM, marker picking, diagnostics, and the render loop.
- `celestial-system.js` — Earth, Moon, physically ratioed Sun, atmosphere, and Earth/Moon orbit guides.
- `launch-wizard.js` — country grouping, location comparison benefits, marker creation, and shared selection state.
- `launch-platforms.js` — real launch-platform records and the corrected equirectangular-texture coordinate conversion.
- `atmosphere-model.js` — ground-zero ISA reference model.
- `simulation-clock.js` — shared simulation time used by Earth rotation, Earth orbit, and Moon orbit.
- `launch-vehicles.js` — immutable crewed-vehicle and detachable-component records.
- `rocket-system.js` — Babylon assembly, ground focus, live flight trace, tangent orbital insertion, and staged-component preview.
- `flight-view.js` — lightweight live-linked onboard camera monitor for the telemetry panel.
- `assets/solar-system-scope-sun-2k.jpg` and `assets/solar-system-scope-moon-2k.jpg` — Solar System Scope Sun/Moon maps, stored locally for stable Babylon loading; attribution is required under the source pack's CC BY 4.0 terms.

## Scale model

`celestial-system.js` derives scene geometry from Earth radius rather than arbitrary visual values. The browser world unit is enlarged by `333×` for a wide Earth/atmosphere launch frame while keeping the rocket silhouette much smaller than the planet:

- Earth radius: 6,371 km reference → `999` scene units
- Moon radius: 1,737.4 km reference (`0.2727×` Earth radius)
- Sun radius: 696,340 km reference (`109.30×` Earth radius)
- Moon center distance: 384,400 km (`60.34×` Earth radius)
- Earth–Sun visual distance: `480×` Earth radius (bounded presentation scale)
- Earth–Sun physical distance: 1 AU (`23,481.07×` Earth radius)
- Rocket component rendering: a `5,000×` readability boost is applied only to launcher meshes; physical dimensions remain authoritative in the vehicle catalog, while Earth size, atmosphere thickness, and the 200 km LEO target remain separate diagnostics.
- First flight phase: ascent through a 100 km atmosphere reference layer; second phase: smooth tangent orbital insertion into a stable circular low Earth orbit at 200 km, shown by the aligned planned LEO guide.
- The LEO scaffold uses `7.79 km/s` at 200 km altitude, giving an orbital period of approximately `5,300 s` / `88.3 minutes`; this keeps the orbital motion and Earth rotation on a coherent `1×` launch clock.
- Crew capsules, orbital modules, core stages, and upper stages are retained as the mission stack; boosters and escape hardware are the detachable preview components.
- Launch-platform markers scale with the enlarged Earth (`0.6%` of Earth radius) so the geographic map remains pickable and visible.
- Earth and Moon orbit guides scale their line thickness with Earth radius instead of retaining sub-pixel fixed widths.

- Earth axial tilt: `23.439°`
- Moon orbital inclination: `5.145°`

The Sun diameter and Earth/Moon diameter ratios remain physical. The Earth–Sun distance is intentionally compressed for stable browser rendering; the physical value remains exposed in `window.__SCALE_MODEL.physicalEarthSunDistanceEarthRadii`. The directional Sun light follows the current Sun-to-Earth vector and illuminates the textured Earth without any glare post-process. At new Moon, a physically scaled penumbra marker is placed on the Earth surface; its radius is derived from Moon radius, Earth radius, and the Moon center distance, rather than an arbitrary screen-sized decal.
Each module begins with a short goal/technique comment so the implementation remains reviewable by a human.

Runtime handles:

- `window.__BABYLON_WELCOME_READY`
- `window.__BABYLON_SCENE`
- `window.__BABYLON_ENGINE`
- `window.__ATMOSPHERE_MODEL`
- `window.__EARTH_WELCOME`
