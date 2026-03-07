import { Euler, Vector3 } from 'three';
import type { Mesh } from 'three';
import type { WorldState } from '../game/types';

const up = new Vector3(0, 1, 0);

export class MovementSystem {
  constructor(private readonly playerMesh: Mesh) {}

  update(dt: number, world: WorldState): void {
    const direction = new Vector3(world.input.moveX, 0, world.input.moveY);
    if (direction.lengthSq() > 1) {
      direction.normalize();
    }

    const speedMultiplier = world.input.boost ? world.config.boostMultiplier : 1;
    world.player.velocity.addScaledVector(direction, world.config.moveAcceleration * speedMultiplier * dt);

    const maxSpeed = world.config.maxSpeed * speedMultiplier;
    if (world.player.velocity.length() > maxSpeed) {
      world.player.velocity.setLength(maxSpeed);
    }

    world.player.velocity.multiplyScalar(world.config.drag);
    this.playerMesh.position.addScaledVector(world.player.velocity, dt);

    const rollEuler = new Euler(
      world.player.velocity.z * dt / Math.max(world.player.radius, 0.001),
      0,
      -world.player.velocity.x * dt / Math.max(world.player.radius, 0.001),
    );
    this.playerMesh.rotateOnWorldAxis(up, world.input.cameraX * dt * 0.8);
    this.playerMesh.rotation.x += rollEuler.x;
    this.playerMesh.rotation.z += rollEuler.z;
  }
}
