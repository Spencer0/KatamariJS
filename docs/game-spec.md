# Game Spec

## Goal
Ship a Katamari-inspired vertical slice for web (desktop + mobile): spherical traversal, collect, grow, avoid water, and win.

## Core Loop
1. Player rolls around a spherical planet.
2. Pickups below the size threshold attach to the ball.
3. Attached pickups increase mass and radius, unlocking larger objects.
4. Water hazards trigger quick respawn with size penalty.
5. Reach target radius to win the run.

## World
- Planet is continuous (no hard world edge).
- Three large biomes: `forest`, `city`, `suburb`.
- Oceans and lakes are lethal hazard zones.

## Player States
- `loading`: manifests/assets are loading with progress bar.
- `playing`: core loop active.
- `paused`: escape menu with reset + mute.
- `respawning`: transient state after water fall.
- `won`: victory state.

## Controls
- Desktop: `WASD`/arrows to move, `Shift` boost, `Esc` pause.
- Mobile: left touch move, right touch camera.
- Gamepad compatible with left stick + south button boost.

## Audio
- Single AI-generated/original style BGM loop via audio manifest.
- Mute toggle in pause menu.
