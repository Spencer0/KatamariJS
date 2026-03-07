import type { GameConfig, PlayerBallState, PickupEntity } from './types';

export function canAttachPickup(playerRadius: number, pickupRadius: number, config: GameConfig): boolean {
  return pickupRadius <= playerRadius * config.pickupAttachFactor;
}

export function calculateRadius(baseRadius: number, mass: number, growthFactor: number): number {
  return baseRadius + Math.sqrt(Math.max(0, mass)) * growthFactor;
}

export function applyPickupToPlayer(player: PlayerBallState, pickup: PickupEntity, config: GameConfig): void {
  player.mass += pickup.mass;
  player.score += pickup.valueTier * 100;
  player.radius = calculateRadius(config.baseRadius, player.mass, config.growthFactor);
  player.attachedPickups.push(pickup);
}

export function reachedWinCondition(playerRadius: number, targetWinRadius: number): boolean {
  return playerRadius >= targetWinRadius;
}
