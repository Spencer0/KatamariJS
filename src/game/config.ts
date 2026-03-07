import type { GameConfig } from './types';

export const defaultConfig: GameConfig = {
  targetWinRadius: 4.5,
  pickupAttachFactor: 0.95,
  baseRadius: 0.6,
  baseMass: 8,
  moveAcceleration: 12,
  maxSpeed: 8,
  drag: 0.92,
  boostMultiplier: 1.5,
  growthFactor: 0.095,
};
