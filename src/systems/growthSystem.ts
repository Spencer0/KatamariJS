import type { Mesh } from 'three';
import { calculateRadius } from '../game/logic';
import type { WorldState } from '../game/types';

export class GrowthSystem {
  constructor(private readonly playerMesh: Mesh) {}

  update(world: WorldState): void {
    world.player.radius = calculateRadius(world.config.baseRadius, world.player.mass, world.config.growthFactor);
    this.playerMesh.scale.setScalar(world.player.radius / world.config.baseRadius);
  }
}
