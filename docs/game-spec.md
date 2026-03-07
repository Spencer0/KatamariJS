# Game Spec

## Goal
Ship a Katamari-inspired v1 playable loop for web (desktop + mobile): roll, collect, grow, and win.

## Core Loop
1. Player rolls the ball over a small map.
2. Pickups that are below the size threshold attach to the ball.
3. Attached pickups increase mass and effective radius.
4. Player reaches the win radius to finish the level.

## Player States
- `loading`: Asset manifest and scene setup.
- `playing`: Core loop active.
- `won`: Win overlay shown with restart action.

## Controls
- Desktop: `WASD` or arrow keys for movement, `Shift` boost.
- Mobile: left-side virtual joystick for movement, right-side drag for camera yaw.
- Gamepad (v1-compatible): left stick movement, south button boost.

## Pickup Rules
- Pickup eligibility: `pickupRadius <= playerRadius * pickupAttachFactor`.
- Eligible pickups attach and stop simulating independently.
- Ineligible pickups remain in world.
- Value tiers and mass contribute to score + growth.

## Win Condition
- Win when effective player radius reaches `targetWinRadius`.

## Non-goals
- Multiplayer, persistence, backend services, authored story content.
