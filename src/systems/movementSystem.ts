import { Quaternion, Vector3 } from 'three';
import type { Mesh } from 'three';
import { sampleCurve } from '../game/logic';
import type { WorldState } from '../game/types';

const worldUp = new Vector3(0, 1, 0);
const radialUp = new Vector3();
const forwardHint = new Vector3();
const tangentForward = new Vector3();
const tangentRight = new Vector3();
const desiredAccel = new Vector3();
const targetSurfacePoint = new Vector3();
const rotationAxis = new Vector3();
const alignmentQuat = new Quaternion();

export class MovementSystem {
  constructor(private readonly playerMesh: Mesh) {}

  update(dt: number, world: WorldState): void {
    radialUp.copy(this.playerMesh.position).normalize();

    forwardHint.copy(this.playerMesh.position).cross(worldUp);
    if (forwardHint.lengthSq() < 1e-4) {
      forwardHint.set(1, 0, 0);
    }

    tangentForward.copy(forwardHint).cross(radialUp).normalize();
    tangentRight.copy(radialUp).cross(tangentForward).normalize();

    desiredAccel
      .copy(tangentRight)
      .multiplyScalar(world.input.moveX)
      .addScaledVector(tangentForward, world.input.moveY);

    if (desiredAccel.lengthSq() > 1) {
      desiredAccel.normalize();
    }

    const accel = sampleCurve(world.config.movementTuning.accelCurveByRadius, world.player.radius);
    const drag = sampleCurve(world.config.movementTuning.dragCurveByRadius, world.player.radius);
    const maxSpeed = sampleCurve(world.config.movementTuning.maxSpeedCurveByRadius, world.player.radius);
    const speedMultiplier = world.input.boost ? world.config.boostMultiplier : 1;

    world.player.velocity.addScaledVector(desiredAccel, accel * speedMultiplier * dt);

    const normalComponent = radialUp.clone().multiplyScalar(world.player.velocity.dot(radialUp));
    world.player.velocity.sub(normalComponent);

    const max = maxSpeed * speedMultiplier;
    if (world.player.velocity.length() > max) {
      world.player.velocity.setLength(max);
    }

    world.player.velocity.multiplyScalar(drag);
    this.playerMesh.position.addScaledVector(world.player.velocity, dt);

    targetSurfacePoint.copy(this.playerMesh.position).normalize().multiplyScalar(world.config.worldGeometry.planetRadius + world.player.radius);
    this.playerMesh.position.copy(targetSurfacePoint);

    radialUp.copy(this.playerMesh.position).normalize();
    alignmentQuat.setFromUnitVectors(worldUp, radialUp);
    this.playerMesh.quaternion.slerp(alignmentQuat, 0.25);

    rotationAxis.copy(radialUp).cross(world.player.velocity);
    const spin = (world.player.velocity.length() / Math.max(0.001, world.player.radius)) * dt;
    if (rotationAxis.lengthSq() > 1e-5 && spin > 0) {
      rotationAxis.normalize();
      this.playerMesh.rotateOnWorldAxis(rotationAxis, spin);
    }
  }
}
