import { Vector3 } from 'three';
import type { Mesh } from 'three';
import { applyPickupToPlayer, canAttachPickup, reachedWinCondition } from '../game/logic';
import type { WorldState } from '../game/types';

const pickupWorld = new Vector3();
const offset = new Vector3();

export class PickupSystem {
  constructor(private readonly playerMesh: Mesh) {}

  update(world: WorldState): void {
    for (const pickup of world.pickups) {
      if (pickup.attached) {
        continue;
      }

      pickup.mesh.getWorldPosition(pickupWorld);
      offset.copy(pickupWorld).sub(this.playerMesh.position);
      const distance = offset.length();
      const collisionDistance = world.player.radius + pickup.radius;
      if (distance > collisionDistance) {
        continue;
      }

      if (!canAttachPickup(world.player.radius, pickup.radius, world.config)) {
        continue;
      }

      pickup.attached = true;
      pickup.attachOffset.copy(offset.normalize().multiplyScalar(world.player.radius * 0.98));
      this.playerMesh.add(pickup.mesh);
      pickup.mesh.position.copy(pickup.attachOffset);
      applyPickupToPlayer(world.player, pickup, world.config);

      if (reachedWinCondition(world.player.radius, world.config.targetWinRadius)) {
        world.phase = 'won';
      }
    }
  }
}
