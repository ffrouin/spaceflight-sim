# Welcome page modules

- `main.js` — browser coordinator: camera, lights, launch-wizard DOM, marker picking, diagnostics, and the render loop.
- `celestial-system.js` — Earth, Moon, Sun, atmosphere, and Earth/Moon orbit guides.
- `launch-platforms.js` — real launch-platform records and the corrected equirectangular-texture coordinate conversion.
- `atmosphere-model.js` — ground-zero ISA reference model.
- `simulation-clock.js` — shared simulation time used by Earth rotation, Earth orbit, and Moon orbit.

Each module begins with a short goal/technique comment so the implementation remains reviewable by a human.

Runtime handles:

- `window.__BABYLON_WELCOME_READY`
- `window.__BABYLON_SCENE`
- `window.__BABYLON_ENGINE`
- `window.__ATMOSPHERE_MODEL`
- `window.__EARTH_WELCOME`
