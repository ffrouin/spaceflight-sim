# Spaceflight Sim

A new ground-up spaceflight simulation prototype built around a clear separation between physical simulation, rendering, and user interface.

## Project goals

- Earth-centered mission physics with Earth and Moon gravity.
- Live spacecraft flight integrated from the physical state.
- Solar-system context for orientation and mission planning.
- Physically meaningful distances and relationships where practical.
- Readable spacecraft and trajectory visualization without changing physics.
- Small, reviewable JavaScript modules.
- Deterministic tests and visible runtime diagnostics at every milestone.

## Restart principles

1. Begin with the smallest visible Babylon scene: Earth, Moon, camera, and one light.
2. Verify rendering before adding Rapier, textures, solar context, or UI panels.
3. Keep physics coordinates separate from presentation coordinates.
4. Do not apply a global scene-scale multiplier to solve readability problems.
5. Add one subsystem at a time and verify it before continuing.
6. Keep each milestone runnable and commit it before starting the next one.

## Planned milestones

- [ ] Minimal Babylon canvas and visible Earth/Moon scene.
- [ ] Camera controls and deterministic focus tests.
- [ ] Earth/Moon physical model and Rapier integration.
- [ ] Rocket mesh, launch state, and live flight.
- [ ] Trajectory planning and visualization.
- [ ] Solar-system reference context.
- [ ] Textures, clouds, lighting, and labels.
- [ ] Mission preparation and telemetry UI.
- [ ] Automated regression checks and documented release milestones.

## Development notes

The repository is intentionally restarted from a minimal baseline. Features should be introduced incrementally, with a working commit at each milestone. Physics values must not be changed merely to compensate for rendering or camera problems.
