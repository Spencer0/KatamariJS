# Tech Spec

## Stack
- Vite + TypeScript + Three.js
- Runtime validation with Zod
- Testing with Vitest

## Runtime Architecture
- `Game` owns renderer, scene, camera, world state, and update loop.
- Systems execute in fixed order each frame:
  1. InputSystem
  2. MovementSystem
  3. PickupSystem
  4. GrowthSystem
  5. CameraSystem
  6. UISystem

## Hybrid Physics Model
- Lightweight player motion integration (velocity + damping).
- Pickup interaction uses scripted sphere-overlap checks.
- No full rigidbody world in v1.

## Data Flow
- Asset manifest (`public/assets/assets.manifest.json`) is loaded at startup.
- Manifest entries hydrate pickup descriptors.
- Runtime logic uses descriptors; render meshes can be swapped without gameplay code changes.

## Performance Targets
- Desktop target: 60 FPS.
- Mobile target: >=30 FPS.
- V1 object count: ~50 pickups.

## Failure Handling
- If `.glb` load fails, spawn primitive fallback mesh and continue.
- Invalid manifest schema throws a startup-visible error.
