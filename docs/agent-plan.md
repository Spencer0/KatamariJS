# Agent Plan

## Phase 1: Project Bootstrap
- Initialize Vite + TypeScript + Three.js.
- Add lint/test/typecheck scripts and CI-ready commands.
- Done when build/test/typecheck pass locally.

## Phase 2: Data Contracts
- Implement shared interfaces and manifest schema validation.
- Add starter manifest and sample entries.
- Done when manifest tests cover invalid/missing fields.

## Phase 3: Playable Loop
- Implement player movement, pickup attachment, growth, and win state.
- Add UI overlay for progress and victory.
- Done when level can be completed from fresh launch.

## Phase 4: Input Expansion
- Add mobile touch controls and gamepad mapping.
- Tune camera + movement parity across platforms.
- Done when desktop + mobile control paths both complete level.

## Phase 5: Asset Swap Reliability
- Ensure missing glb uses primitive fallback.
- Add integration test validating swap behavior without gameplay code edits.
- Done when replacing one manifest path changes visuals only.
