# Agent Plan

## Phase 1: Planet Locomotion
- Replace flat plane with spherical world traversal.
- Add radius-based movement tuning curves.
- Done when player can circle planet continuously.

## Phase 2: Biomes + Hazards
- Implement forest/city/suburb sectors on one sphere.
- Add ocean/lake hazard detection and respawn penalty.
- Done when water collision triggers respawn and mass reduction.

## Phase 3: UI/Game States
- Add loading progress bar.
- Add pause menu on `Esc` with reset + mute.
- Done when load, pause, play, respawn, and win states are visible.

## Phase 4: Audio
- Load audio track manifest and start active track.
- Support mute toggle in menu.
- Done when track loops and mute state is reflected in UI.

## Phase 5: Asset Pipeline Scale
- Expand manifest metadata (`biome`, `styleTags`, `qualityScore`).
- Add validation report checks and workflow docs.
- Done when 20 hero assets are represented in manifest and validation passes.
