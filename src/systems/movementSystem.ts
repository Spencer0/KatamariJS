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
const headingForward = new Vector3();
const headingRight = new Vector3();
const desiredRollDir = new Vector3();
const forwardDir = new Vector3();
const lateralDir = new Vector3();
const torqueWorld = new Vector3();
const spinTorque = new Vector3();
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

    headingForward.copy(world.player.heading).projectOnPlane(radialUp);
    if (headingForward.lengthSq() < 1e-6) {
      this.camera.getWorldDirection(headingForward);
      headingForward.multiplyScalar(-1).projectOnPlane(radialUp);
      if (headingForward.lengthSq() < 1e-6) {
        headingForward.copy(worldUp).projectOnPlane(radialUp);
      }
      if (headingForward.lengthSq() < 1e-6) {
        headingForward.set(0, 0, 1).projectOnPlane(radialUp);
      }
    }
    headingForward.normalize();
    headingRight.copy(radialUp).cross(headingForward).normalize();

    const leftY = world.input.leftStickY;
    const rightY = world.input.rightStickY;
    const leftX = world.input.leftStickX;
    const rightX = world.input.rightStickX;

    const forwardCommand = Math.max(-1, Math.min(1, (leftY + rightY) * 0.5));
    const lateralCommand = Math.max(-1, Math.min(1, (leftX + rightX) * 0.5));
    const driveTurn = Math.max(-1, Math.min(1, (rightY - leftY) * 0.5));
    const sweepTurn = Math.max(-1, Math.min(1, (rightX - leftX) * 0.5));
    const turnCommand = Math.max(-1, Math.min(1, driveTurn + (sweepTurn * 0.75)));

    forwardDir.copy(headingForward).multiplyScalar(forwardCommand);
    lateralDir.copy(headingRight).multiplyScalar(lateralCommand * 0.55);
    desiredRollDir.copy(forwardDir).add(lateralDir);

    let rollMagnitude = desiredRollDir.length();
    if (rollMagnitude > 1e-5) {
      desiredRollDir.normalize();
      rollMagnitude = Math.min(1, rollMagnitude);
    }

    const speedMultiplier = world.input.boost ? world.config.boostMultiplier : 1;
    const torqueState = torqueInputFromDirection(desiredRollDir, rollMagnitude, 1);

    torqueWorld
      .copy(torqueState.desiredTangentDir)
      .multiplyScalar(world.config.movementTuning.torqueStrength * torqueState.magnitude * speedMultiplier);
    spinTorque.copy(radialUp).multiplyScalar(-turnCommand * world.config.movementTuning.torqueStrength * 0.66 * speedMultiplier);
    torqueWorld.add(spinTorque);

    angularDelta.copy(
      approximateAngularAcceleration(
        torqueWorld,
        world.player.orientation,
        world.player.composite.inertiaTensorLocal,
      ),
    );

    world.player.angularVelocity.addScaledVector(angularDelta, dt);

    if (torqueState.magnitude < 0.08 && Math.abs(turnCommand) < 0.08) {
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

    if (Math.abs(turnCommand) > 0.001) {
      const headingTurnRate = 2.1 + Math.abs(forwardCommand) * 0.6;
      headingForward.applyAxisAngle(radialUp, -turnCommand * headingTurnRate * dt).normalize();
    }
    if (rollMagnitude > 0.12) {
      headingForward.lerp(desiredRollDir, Math.min(1, dt * 4.2)).normalize();
    }
    world.player.heading.copy(headingForward);

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
