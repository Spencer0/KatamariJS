import { Quaternion, Vector3 } from 'three';
import type { Camera, Mesh } from 'three';
import { sampleCurve } from '../game/logic';
import type { WorldState } from '../game/types';

const radialUp = new Vector3();
const cameraForward = new Vector3();
const moveForward = new Vector3();
const moveRight = new Vector3();
const desiredAccel = new Vector3();
const normalComponent = new Vector3();
const targetSurfacePoint = new Vector3();
const rotationAxis = new Vector3();
const alignmentQuat = new Quaternion();
const worldUp = new Vector3(0, 1, 0);

export class MovementSystem {
  constructor(private readonly playerMesh: Mesh, private readonly camera: Camera) {}

  update(dt: number, world: WorldState): void {
    radialUp.copy(this.playerMesh.position).normalize();

    this.camera.getWorldDirection(cameraForward);
    moveForward.copy(cameraForward).projectOnPlane(radialUp);
    if (moveForward.lengthSq() < 1e-6) {
      moveForward.copy(worldUp).projectOnPlane(radialUp);
      if (moveForward.lengthSq() < 1e-6) {
        moveForward.set(0, 0, 1).projectOnPlane(radialUp);
      }
    }
    moveForward.normalize();

    moveRight.copy(moveForward).cross(radialUp).normalize();

    desiredAccel
      .copy(moveRight)
      .multiplyScalar(world.input.moveX)
      .addScaledVector(moveForward, world.input.moveY);

    if (desiredAccel.lengthSq() > 1) {
      desiredAccel.normalize();
    }

    const accel = sampleCurve(world.config.movementTuning.accelCurveByRadius, world.player.radius);
    const drag = sampleCurve(world.config.movementTuning.dragCurveByRadius, world.player.radius);
    const maxSpeed = sampleCurve(world.config.movementTuning.maxSpeedCurveByRadius, world.player.radius);
    const speedMultiplier = world.input.boost ? world.config.boostMultiplier : 1;

    world.player.velocity.addScaledVector(desiredAccel, accel * speedMultiplier * dt);

    normalComponent.copy(radialUp).multiplyScalar(world.player.velocity.dot(radialUp));
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
    this.playerMesh.quaternion.slerp(alignmentQuat, 0.2);

    rotationAxis.copy(radialUp).cross(world.player.velocity);
    const spin = (world.player.velocity.length() / Math.max(0.001, world.player.radius)) * dt;
    if (rotationAxis.lengthSq() > 1e-5 && spin > 0) {
      rotationAxis.normalize();
      this.playerMesh.rotateOnWorldAxis(rotationAxis, spin);
    }
  }
}
