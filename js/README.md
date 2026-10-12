# Welcome page modules

- `main.js` creates the Babylon scene, camera, lighting, textured Earth, atmosphere shells, ground reference, and runtime diagnostics.
- The atmospheric model starts at ground level (`0 m MSL`) using the International Standard Atmosphere sea-level reference values.

Runtime handles:

- `window.__BABYLON_WELCOME_READY`
- `window.__BABYLON_SCENE`
- `window.__BABYLON_ENGINE`
- `window.__ATMOSPHERE_MODEL`
- `window.__EARTH_WELCOME`
