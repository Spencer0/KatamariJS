# Tech Spec

## Stack
- Vite + TypeScript + Three.js
- Zod runtime validation
- Vitest + Playwright tests

## Runtime Architecture
- `Game` orchestrates scene, world state, and phased startup.
- Systems run in order:
  1. InputSystem
  2. MovementSystem (spherical tangent locomotion)
  3. PickupSystem
  4. GrowthSystem
  5. Hazard/Respawn check
  6. CameraSystem
  7. UISystem

## World + Movement
- Player constrained to planet surface (`planetRadius + playerRadius`).
- Movement velocity is projected to tangent plane every frame.
- Curved movement tuning uses radius-based interpolation curves.

## Biomes + Hazards
- Planet sectors map to `forest`, `city`, `suburb`.
- Water masks (ocean belt + lake patches) trigger quick respawn + mass penalty.

## Loading + UI
- Loading progress tracks manifest fetch, pickup spawn, and audio setup.
- Escape toggles pause state and menu.

## Audio
- Audio manifest driven.
- Current active track uses synth-loop fallback path (`synth://...`).

## Failure Handling
- Missing `.glb` falls back to primitive mesh.
- Manifest parse errors fail startup stage but keep app alive for debugging.
