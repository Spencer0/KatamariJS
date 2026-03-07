import { Spherical, Vector3 } from 'three';
import type { AssetManifestEntry, BiomeType, CurvePoint, GameConfig, PlayerBallState, PickupEntity } from './types';

const spherical = new Spherical();

export function canAttachPickup(playerRadius: number, pickupRadius: number, config: GameConfig): boolean {
  return pickupRadius <= playerRadius * config.pickupAttachFactor;
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
  player.mass += pickup.mass;
  player.score += pickup.valueTier * 100;
  player.radius = calculateRadius(config.baseRadius, player.mass, config.growthFactor);
  player.attachedPickups.push(pickup);
}

export function reachedWinCondition(playerRadius: number, targetWinRadius: number): boolean {
  return playerRadius >= targetWinRadius;
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

export function isWaterPosition(position: Vector3): boolean {
  spherical.setFromVector3(position);
  const latitude = Math.PI / 2 - spherical.phi;
  const longitude = spherical.theta;

  const oceanBand = Math.abs(latitude) < 0.22;
  const lakeA = latitude > 0.46 && latitude < 0.72 && longitude > -2.35 && longitude < -1.8;
  const lakeB = latitude < -0.42 && latitude > -0.7 && longitude > 1.45 && longitude < 2.1;

  return oceanBand || lakeA || lakeB;
}

export function safeRespawnPosition(currentPosition: Vector3, planetRadius: number, playerRadius: number): Vector3 {
  const candidates = [
    new Vector3(1, 0.42, 0.35),
    new Vector3(-0.78, 0.39, -0.32),
    new Vector3(0.34, -0.55, 0.78),
  ].map((v) => v.normalize().multiplyScalar(planetRadius + playerRadius));

  const sorted = candidates.sort((a, b) => a.distanceToSquared(currentPosition) - b.distanceToSquared(currentPosition));
  return sorted.find((p) => !isWaterPosition(p)) ?? sorted[0];
}

export function biomeWeight(entry: AssetManifestEntry, biome: BiomeType): number {
  if (!entry.biome || entry.biome === biome) {
    return 1;
  }
  return 0.2;
}
