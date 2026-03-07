import { Vector3 } from 'three';
import { defaultConfig } from './config';
import { calculateRadius } from './logic';
import type { InputState, WorldState } from './types';

export const emptyInputState: InputState = {
  moveX: 0,
  moveY: 0,
  cameraX: 0,
  cameraY: 0,
  boost: false,
};

export function createInitialWorld(): WorldState {
  const startRadius = calculateRadius(defaultConfig.baseRadius, defaultConfig.baseMass, defaultConfig.growthFactor);

  return {
    config: defaultConfig,
    phase: 'loading',
    input: { ...emptyInputState },
    player: {
      radius: startRadius,
      mass: defaultConfig.baseMass,
      velocity: new Vector3(),
      score: 0,
      attachedPickups: [],
      respawnCount: 0,
    },
    pickups: [],
    elapsed: 0,
    loading: {
      total: 1,
      loaded: 0,
      stageLabel: 'Starting up',
    },
    isMuted: false,
    playerPosition: new Vector3(0, defaultConfig.worldGeometry.planetRadius + startRadius, 0),
  };
}
