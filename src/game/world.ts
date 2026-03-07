import { Matrix3, Quaternion, Vector3 } from 'three';
import { defaultConfig } from './config';
import { createCompositeBody, estimateRollingContact, recomputeCompositeBody } from './compositePhysics';
import { calculateRadius } from './logic';
import type { InputState, WorldState } from './types';

export const emptyInputState: InputState = {
  moveX: 0,
  moveY: 0,
  cameraX: 0,
  cameraY: 0,
  leftStickX: 0,
  leftStickY: 0,
  rightStickX: 0,
  rightStickY: 0,
  boost: false,
};

export function createInitialWorld(): WorldState {
  const startRadius = calculateRadius(defaultConfig.baseRadius, defaultConfig.baseMass, defaultConfig.growthFactor);
  const startPosition = new Vector3(0, defaultConfig.worldGeometry.planetRadius + startRadius, 0);
  const composite = createCompositeBody(startRadius);
  recomputeCompositeBody(composite, defaultConfig.baseMass);

  return {
    config: defaultConfig,
    phase: 'loading',
    input: { ...emptyInputState },
    player: {
      radius: startRadius,
      mass: defaultConfig.baseMass,
      velocity: new Vector3(),
      angularVelocity: new Vector3(),
      heading: new Vector3(0, 0, 1),
      orientation: new Quaternion(),
      comLocal: new Vector3(),
      inertiaLocal: new Matrix3().identity(),
      score: 0,
      attachedPickups: [],
      composite,
      rollingContact: estimateRollingContact(composite, new Quaternion(), startPosition, startPosition.clone().normalize()),
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
    playerPosition: startPosition,
  };
}
