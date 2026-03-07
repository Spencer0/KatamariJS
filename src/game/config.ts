import { Matrix3 } from 'three';
import type { GameConfig } from './types';

const identityInertia = new Matrix3().set(
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
);

export const defaultConfig: GameConfig = {
  targetWinRadius: 4.8,
  pickupAttachFactor: 0.95,
  baseRadius: 0.6,
  baseMass: 8,
  boostMultiplier: 1.35,
  growthFactor: 0.095,
  worldGeometry: {
    planetRadius: 46,
    gravityStrength: 28,
    biomeBands: {
      forest: [-Math.PI, -Math.PI / 3],
      city: [-Math.PI / 3, Math.PI / 3],
      suburb: [Math.PI / 3, Math.PI],
    },
  },
  movementTuning: {
    accelCurveByRadius: [
      { radius: 0.6, value: 32 },
      { radius: 1.4, value: 37 },
      { radius: 2.8, value: 41 },
      { radius: 4.8, value: 46 },
    ],
    dragCurveByRadius: [
      { radius: 0.6, value: 0.985 },
      { radius: 1.4, value: 0.989 },
      { radius: 2.8, value: 0.992 },
      { radius: 4.8, value: 0.994 },
    ],
    maxSpeedCurveByRadius: [
      { radius: 0.6, value: 9 },
      { radius: 1.4, value: 11 },
      { radius: 2.8, value: 13 },
      { radius: 4.8, value: 15 },
    ],
    settleTorque: 8.2,
    contactDamping: 2.2,
    maxAngularSpeed: 12,
    supportSampleCount: 64,
    torqueStrength: 14,
  },
  hazardZone: {
    type: 'water',
    surfaceMask: 'oceans-and-lakes',
    penalty: 0.18,
  },
  respawnPolicy: {
    mode: 'quick',
    sizePenaltyPct: 0.12,
    safeSpawnResolver: 'nearest-biome-safe-point',
  },
};

export const baseInertiaTensor = identityInertia;
