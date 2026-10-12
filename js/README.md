# Welcome page modules

- `main.js` — browser coordinator: camera, neutral scene lighting, launch-wizard DOM, marker picking, diagnostics, and the render loop.
- `celestial-system.js` — Earth, Moon, physically ratioed Sun, atmosphere, and Earth/Moon orbit guides.
- `launch-wizard.js` — country grouping, location comparison benefits, marker creation, and shared selection state.
- `launch-platforms.js` — real launch-platform records and the corrected equirectangular-texture coordinate conversion.
- `atmosphere-model.js` — ground-zero ISA reference model.
- `simulation-clock.js` — shared simulation time used by Earth rotation, Earth orbit, and Moon orbit.

## Scale model

`celestial-system.js` derives scene geometry from Earth radius rather than arbitrary visual values:

- Earth radius: 6,371 km reference
- Moon radius: 1,737.4 km reference (`0.2727×` Earth radius)
- Sun radius: 696,340 km reference (`109.30×` Earth radius)
- Moon center distance: 384,400 km (`60.34×` Earth radius)
- Earth–Sun distance: 1 AU (`23,481.07×` Earth radius)

The welcome camera starts in a readable local Earth inspection view. Zooming out toward roughly `110` scene units reveals the correctly separated Earth–Moon system; the Sun remains available as a physically sized, Sun-centered reference and can be inspected through the runtime scale diagnostics. No lens flare or glare post-process is installed.

Each module begins with a short goal/technique comment so the implementation remains reviewable by a human.

Runtime handles:

- `window.__BABYLON_WELCOME_READY`
- `window.__BABYLON_SCENE`
- `window.__BABYLON_ENGINE`
- `window.__ATMOSPHERE_MODEL`
- `window.__EARTH_WELCOME`
