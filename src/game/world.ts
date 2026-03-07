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
  return {
    config: defaultConfig,
    phase: 'loading',
    input: { ...emptyInputState },
    player: {
      radius: calculateRadius(defaultConfig.baseRadius, defaultConfig.baseMass, defaultConfig.growthFactor),
      mass: defaultConfig.baseMass,
      velocity: new Vector3(),
      score: 0,
      attachedPickups: [],
    },
    pickups: [],
    elapsed: 0,
  };
}
