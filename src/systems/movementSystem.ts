import { Quaternion, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import {
  approximateAngularAcceleration,
  clampVectorMagnitude,
  estimateRollingContact,
  lowestSupportDirectionWorld,
  torqueInputFromDirection,
} from '../game/compositePhysics';
import { sampleCurve } from '../game/logic';
import type { WorldState } from '../game/types';

const radialUp = new Vector3();
const cameraForward = new Vector3();
const moveForward = new Vector3();
const moveRight = new Vector3();
const desiredDir = new Vector3();
const torqueWorld = new Vector3();
const settleTorque = new Vector3();
const angularDelta = new Vector3();
const linearFromRoll = new Vector3();
const projectedVelocity = new Vector3();
const downWorld = new Vector3();
const worldUp = new Vector3(0, 1, 0);
const deltaQuat = new Quaternion();

export class MovementSystem {
  constructor(private readonly playerBody: Object3D, private readonly camera: Camera) {}

  update(dt: number, world: WorldState): void {
    radialUp.copy(this.playerBody.position).normalize();
    downWorld.copy(radialUp).multiplyScalar(-1);

    this.camera.getWorldDirection(cameraForward);
    moveForward.copy(cameraForward).multiplyScalar(-1).projectOnPlane(radialUp);
    if (moveForward.lengthSq() < 1e-6) {
      moveForward.copy(worldUp).projectOnPlane(radialUp);
      if (moveForward.lengthSq() < 1e-6) {
        moveForward.set(0, 0, 1).projectOnPlane(radialUp);
      }
    }
    moveForward.normalize();
    moveRight.copy(radialUp).cross(moveForward).normalize();

    desiredDir
      .copy(moveRight)
      .multiplyScalar(world.input.moveX)
      .addScaledVector(moveForward, world.input.moveY);

    let inputMagnitude = desiredDir.length();
    if (inputMagnitude > 1) {
      desiredDir.normalize();
      inputMagnitude = 1;
    } else if (inputMagnitude > 1e-5) {
      desiredDir.normalize();
    }

    const speedMultiplier = world.input.boost ? world.config.boostMultiplier : 1;
    const torqueState = torqueInputFromDirection(desiredDir, inputMagnitude, 1);

    torqueWorld
      .copy(torqueState.desiredTangentDir)
      .multiplyScalar(world.config.movementTuning.torqueStrength * torqueState.magnitude * speedMultiplier);

    angularDelta.copy(
      approximateAngularAcceleration(
        torqueWorld,
        world.player.orientation,
        world.player.composite.inertiaTensorLocal,
      ),
    );

    world.player.angularVelocity.addScaledVector(angularDelta, dt);

    if (torqueState.magnitude < 0.08) {
      const lowDir = lowestSupportDirectionWorld(world.player.composite, world.player.orientation, downWorld);
      settleTorque.copy(lowDir).cross(downWorld).multiplyScalar(world.config.movementTuning.settleTorque);
      world.player.angularVelocity.addScaledVector(settleTorque, dt);
    }

    const damping = Math.exp(-world.config.movementTuning.contactDamping * dt);
    world.player.angularVelocity.multiplyScalar(damping);

    clampVectorMagnitude(world.player.angularVelocity, world.config.movementTuning.maxAngularSpeed * speedMultiplier);

    const omega = world.player.angularVelocity.length();
    if (omega > 1e-6) {
      deltaQuat.setFromAxisAngle(world.player.angularVelocity.clone().normalize(), omega * dt);
      world.player.orientation.premultiply(deltaQuat).normalize();
    }

    this.playerBody.quaternion.copy(world.player.orientation);

    const rollingContact = estimateRollingContact(
      world.player.composite,
      world.player.orientation,
      this.playerBody.position,
      radialUp,
    );
    world.player.rollingContact = rollingContact;

    linearFromRoll.copy(world.player.angularVelocity).cross(radialUp).multiplyScalar(rollingContact.effectiveRadius);

    projectedVelocity.copy(world.player.velocity).projectOnPlane(radialUp);
    const blend = Math.min(1, dt * (8 + sampleCurve(world.config.movementTuning.accelCurveByRadius, world.player.radius) * 0.25));
    projectedVelocity.lerp(linearFromRoll, blend);

    const maxSpeed = sampleCurve(world.config.movementTuning.maxSpeedCurveByRadius, world.player.radius) * speedMultiplier;
    if (projectedVelocity.length() > maxSpeed) {
      projectedVelocity.setLength(maxSpeed);
    }

    const drag = sampleCurve(world.config.movementTuning.dragCurveByRadius, world.player.radius);
    projectedVelocity.multiplyScalar(Math.max(0, Math.min(1, drag)));

    world.player.velocity.copy(projectedVelocity);
    this.playerBody.position.addScaledVector(world.player.velocity, dt);

    const targetSurface = world.config.worldGeometry.planetRadius + rollingContact.effectiveRadius;
    this.playerBody.position.normalize().multiplyScalar(targetSurface);
  }
}
