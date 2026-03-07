import { Vector3 } from 'three';
import type { Mesh } from 'three';
import { applyPickupToPlayer, canAttachPickup, reachedWinCondition } from '../game/logic';
import type { WorldState } from '../game/types';

const temp = new Vector3();

export class PickupSystem {
  constructor(private readonly playerMesh: Mesh) {}

  update(world: WorldState): void {
    for (const pickup of world.pickups) {
      if (pickup.attached) {
        continue;
      }

      temp.copy(pickup.mesh.position).sub(this.playerMesh.position);
      const distance = temp.length();
      const collisionDistance = world.player.radius + pickup.radius;
      if (distance > collisionDistance) {
        continue;
      }

      if (!canAttachPickup(world.player.radius, pickup.radius, world.config)) {
        continue;
      }

      pickup.attached = true;
      pickup.attachOffset.copy(temp.normalize().multiplyScalar(world.player.radius * 0.95));
      this.playerMesh.add(pickup.mesh);
      pickup.mesh.position.copy(pickup.attachOffset);
      applyPickupToPlayer(world.player, pickup, world.config);

      if (reachedWinCondition(world.player.radius, world.config.targetWinRadius)) {
        world.phase = 'won';
      }
    }
  }
}
