import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { addProtrusion } from '../game/compositePhysics';
import { applyPickupToPlayer, canAttachPickup, reachedWinCondition } from '../game/logic';
import type { WorldState } from '../game/types';

const pickupWorld = new Vector3();
const offset = new Vector3();
const direction = new Vector3();

function protrusionShapeClass(id: string): 'round' | 'boxy' | 'elongated' {
  const lower = id.toLowerCase();
  if (lower.includes('bike') || lower.includes('bamboo') || lower.includes('sign') || lower.includes('gate')) {
    return 'elongated';
  }
  if (lower.includes('crate') || lower.includes('vending') || lower.includes('mailbox') || lower.includes('truck')) {
    return 'boxy';
  }
  return 'round';
}

export class PickupSystem {
  constructor(private readonly playerBody: Object3D) {}

  update(world: WorldState): void {
    for (const pickup of world.pickups) {
      if (pickup.attached) {
        continue;
      }

      pickup.mesh.getWorldPosition(pickupWorld);
      offset.copy(pickupWorld).sub(this.playerBody.position);
      const distance = offset.length();

      direction.copy(offset).normalize();
      const supportRadius = world.player.composite.effectiveRollingRadiusByDir(direction, world.player.orientation);
      const collisionDistance = supportRadius + pickup.radius;

      if (distance > collisionDistance) {
        continue;
      }

      if (!canAttachPickup(world.player.radius, pickup.radius, world.config)) {
        continue;
      }

      pickup.attached = true;

      const attachDistance = world.player.composite.coreRadius + pickup.visualRadius - pickup.attachDepth;
      pickup.attachOffset.copy(direction.multiplyScalar(attachDistance));
      this.playerBody.add(pickup.mesh);
      pickup.mesh.position.copy(pickup.attachOffset);

      applyPickupToPlayer(world.player, pickup, world.config);

      addProtrusion(
        world.player.composite,
        {
          id: pickup.id,
          localOffset: pickup.attachOffset.clone(),
          radius: pickup.visualRadius,
          mass: pickup.mass,
          shapeClass: protrusionShapeClass(pickup.assetId),
          inertiaBias: pickup.inertiaBias,
        },
        world.config.baseMass,
      );

      world.player.comLocal.copy(world.player.composite.com);
      world.player.inertiaLocal.copy(world.player.composite.inertiaTensorLocal);

      if (reachedWinCondition(world.player.radius, world.config.targetWinRadius)) {
        world.phase = 'won';
      }
    }
  }
}
