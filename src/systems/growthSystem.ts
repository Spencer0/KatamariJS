import type { Mesh } from 'three';
import { recomputeCompositeBody } from '../game/compositePhysics';
import { calculateRadius } from '../game/logic';
import type { WorldState } from '../game/types';

export class GrowthSystem {
  constructor(private readonly coreMesh: Mesh) {}

  update(world: WorldState): void {
    world.player.radius = calculateRadius(world.config.baseRadius, world.player.mass, world.config.growthFactor);

    const coreRadius = Math.max(world.config.baseRadius * 0.8, world.player.radius * 0.58);
    world.player.composite.coreRadius = coreRadius;
    recomputeCompositeBody(world.player.composite, world.config.baseMass);

    world.player.comLocal.copy(world.player.composite.com);
    world.player.inertiaLocal.copy(world.player.composite.inertiaTensorLocal);

    this.coreMesh.scale.setScalar(coreRadius / world.config.baseRadius);
  }
}
