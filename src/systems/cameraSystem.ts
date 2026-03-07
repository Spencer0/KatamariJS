import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import type { WorldState } from '../game/types';

const radialUp = new Vector3();
const side = new Vector3();
const desiredPosition = new Vector3();
const lookTarget = new Vector3();
const fallback = new Vector3(0, 0, 1);
const velocityForward = new Vector3();

export class CameraSystem {
  private orbitForward = new Vector3(0, 0, 1);
  private yawVelocity = 0;

  constructor(private readonly camera: Camera, private readonly playerBody: Object3D) {}

  update(dt: number, world: WorldState): void {
    radialUp.copy(this.playerBody.position).normalize();

    this.orbitForward.projectOnPlane(radialUp);
    if (this.orbitForward.lengthSq() < 1e-6) {
      this.orbitForward.copy(fallback).projectOnPlane(radialUp);
      if (this.orbitForward.lengthSq() < 1e-6) {
        this.orbitForward.set(1, 0, 0).projectOnPlane(radialUp);
      }
    }
    this.orbitForward.normalize();

    velocityForward.copy(world.player.velocity).projectOnPlane(radialUp);
    if (velocityForward.lengthSq() > 0.0004) {
      velocityForward.normalize();
      const autoFollow = Math.min(0.09, dt * 1.2);
      this.orbitForward.lerp(velocityForward, autoFollow).normalize();
    }

    this.yawVelocity = this.yawVelocity * 0.82 + world.input.cameraX * 2.2;
    if (Math.abs(this.yawVelocity) > 1e-4) {
      this.orbitForward.applyAxisAngle(radialUp, this.yawVelocity * dt);
      this.orbitForward.projectOnPlane(radialUp).normalize();
    }

    side.copy(radialUp).cross(this.orbitForward).normalize();

    const followDistance = 8 + world.player.radius * 0.45;
    const height = 3.3 + world.player.radius * 0.22;

    desiredPosition
      .copy(this.playerBody.position)
      .addScaledVector(this.orbitForward, -followDistance)
      .addScaledVector(radialUp, height)
      .addScaledVector(side, world.input.cameraY * 1.25);

    lookTarget.copy(this.playerBody.position).addScaledVector(radialUp, world.player.radius * 0.65);

    this.camera.position.lerp(desiredPosition, 0.12);
    this.camera.up.copy(radialUp);
    this.camera.lookAt(lookTarget);
  }
}
