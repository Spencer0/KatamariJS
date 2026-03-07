import { Spherical, Vector3 } from 'three';
import type { AssetManifestEntry, BiomeType, CurvePoint, GameConfig, GrowthTier, PlayerBallState, PickupEntity } from './types';

const spherical = new Spherical();

export function canAttachPickup(playerRadius: number, pickupRadius: number, config: GameConfig): boolean {
  const tier = resolveGrowthTier(playerRadius, config.growthTiers);
  const threshold = Math.min(playerRadius * config.pickupAttachFactor, tier.maxPickupRadius);
  return pickupRadius <= threshold;
}

export function calculateRadius(baseRadius: number, mass: number, growthFactor: number): number {
  return baseRadius + Math.sqrt(Math.max(0, mass)) * growthFactor;
}

export function sampleCurve(points: CurvePoint[], radius: number): number {
  const sorted = [...points].sort((a, b) => a.radius - b.radius);
  if (radius <= sorted[0].radius) {
    return sorted[0].value;
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (radius >= a.radius && radius <= b.radius) {
      const t = (radius - a.radius) / Math.max(0.0001, b.radius - a.radius);
      return a.value + (b.value - a.value) * t;
    }
  }

  return sorted[sorted.length - 1].value;
}

export function applyPickupToPlayer(player: PlayerBallState, pickup: PickupEntity, config: GameConfig): void {
  const tier = resolveGrowthTier(player.radius, config.growthTiers);
  player.mass += pickup.mass * tier.massGainMultiplier;
  player.score += Math.round(pickup.valueTier * 100 * tier.scoreMultiplier);
  player.radius = calculateRadius(config.baseRadius, player.mass, config.growthFactor);
  player.attachedPickups.push(pickup);
}

export function reachedWinCondition(playerRadius: number, targetWinRadius: number): boolean {
  return playerRadius >= targetWinRadius;
}

export function resolveGrowthTier(playerRadius: number, tiers: GrowthTier[]): GrowthTier {
  let current = tiers[0];
  for (const tier of tiers) {
    if (playerRadius >= tier.minPlayerRadius) {
      current = tier;
    }
  }
  return current;
}

export function biomeForPosition(position: Vector3): BiomeType {
  spherical.setFromVector3(position);
  const longitude = spherical.theta;
  if (longitude < -Math.PI / 3) {
    return 'forest';
  }
  if (longitude > Math.PI / 3) {
    return 'suburb';
  }
  return 'city';
}

export function biomeWeight(entry: AssetManifestEntry, biome: BiomeType): number {
  if (!entry.biome || entry.biome === biome) {
    return 1;
  }
  return 0.2;
}
