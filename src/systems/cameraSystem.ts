import { Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import type { WorldState } from '../game/types';

const radialUp = new Vector3();
const desiredPosition = new Vector3();
const lookTarget = new Vector3();
const fallback = new Vector3(0, 0, 1);
const targetForward = new Vector3();

export class CameraSystem {
  private orbitForward = new Vector3(0, 0, 1);

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

    targetForward.copy(world.player.heading).projectOnPlane(radialUp);
    if (targetForward.lengthSq() < 1e-6) {
      targetForward.copy(this.orbitForward);
    }
    if (targetForward.lengthSq() > 1e-6) {
      targetForward.normalize();
      const followLag = Math.min(1, dt * world.config.movementTuning.cameraHeadingLag);
      this.orbitForward.lerp(targetForward, followLag).normalize();
    }

    const followDistance = world.config.movementTuning.baseFollowDistance
      + world.config.movementTuning.distanceScale
      * Math.pow(world.player.radius, world.config.movementTuning.cameraDistanceExponent);
    const height = world.config.movementTuning.baseFollowHeight
      + world.config.movementTuning.heightScale
      * Math.pow(world.player.radius, world.config.movementTuning.cameraHeightExponent);

    desiredPosition
      .copy(this.playerBody.position)
      .addScaledVector(this.orbitForward, -followDistance)
      .addScaledVector(radialUp, height);

    lookTarget.copy(this.playerBody.position).addScaledVector(radialUp, world.player.radius * 0.65);

    this.camera.position.lerp(desiredPosition, 0.15);
    this.camera.up.copy(radialUp);
    this.camera.lookAt(lookTarget);
  }
}
