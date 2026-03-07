import { Quaternion, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import {
  approximateAngularAcceleration,
  clampVectorMagnitude,
  computeHandContactState,
  dampingFactor,
  desiredAngularVelocityFromLinear,
  estimateRollingContact,
  lowestSupportDirectionWorld,
  writeHandContactDebug,
} from '../game/compositePhysics';
import { sampleCurve } from '../game/logic';
import type { WorldState } from '../game/types';

const radialUp = new Vector3();
const headingForward = new Vector3();
const headingRight = new Vector3();
const cameraForward = new Vector3();
const leftArm = new Vector3();
const rightArm = new Vector3();
const torqueWorld = new Vector3();
const leftTorque = new Vector3();
const rightTorque = new Vector3();
const spinAssistTorque = new Vector3();
const netIntent = new Vector3();
const settleTorque = new Vector3();
const angularDelta = new Vector3();
const linearFromRoll = new Vector3();
const projectedVelocity = new Vector3();
const desiredLinear = new Vector3();
const desiredOmega = new Vector3();
const downWorld = new Vector3();
const worldUp = new Vector3(0, 1, 0);
const deltaQuat = new Quaternion();

export class MovementSystem {
  constructor(private readonly playerBody: Object3D, private readonly camera: Camera) {}

  update(dt: number, world: WorldState): void {
    radialUp.copy(this.playerBody.position).normalize();
    downWorld.copy(radialUp).multiplyScalar(-1);

    this.camera.getWorldDirection(cameraForward);
    cameraForward.multiplyScalar(-1).projectOnPlane(radialUp);
    if (cameraForward.lengthSq() < 1e-6) {
      cameraForward.copy(world.player.heading).projectOnPlane(radialUp);
    }
    if (cameraForward.lengthSq() < 1e-6) {
      cameraForward.copy(worldUp).projectOnPlane(radialUp);
    }
    if (cameraForward.lengthSq() < 1e-6) {
      cameraForward.set(0, 0, 1).projectOnPlane(radialUp);
    }
    cameraForward.normalize();

    headingForward.copy(world.player.heading).projectOnPlane(radialUp);
    if (headingForward.lengthSq() < 1e-6) {
      headingForward.copy(cameraForward);
    }
    headingForward.normalize();
    headingRight.copy(radialUp).cross(cameraForward).normalize();

    const handState = computeHandContactState(
      radialUp,
      cameraForward,
      headingRight,
      { x: world.input.leftStickX, y: world.input.leftStickY },
      { x: world.input.rightStickX, y: world.input.rightStickY },
      world.config.movementTuning,
    );

    leftArm.copy(handState.leftAnchor).multiplyScalar(world.player.radius);
    rightArm.copy(handState.rightAnchor).multiplyScalar(world.player.radius);

    leftTorque.copy(leftArm).cross(handState.leftForce);
    rightTorque.copy(rightArm).cross(handState.rightForce);

    headingForward.copy(world.player.heading).projectOnPlane(radialUp);
    if (headingForward.lengthSq() < 1e-6) {
      headingForward.copy(cameraForward);
    }
    headingForward.normalize();

    const speedMultiplier = world.input.boost ? world.config.boostMultiplier : 1;
    torqueWorld.copy(leftTorque).add(rightTorque).multiplyScalar(speedMultiplier);
    spinAssistTorque
      .copy(radialUp)
      .multiplyScalar(
        (world.input.leftStickY - world.input.rightStickY)
        * world.config.movementTuning.handForceStrength
        * world.config.movementTuning.spinAssist
        * speedMultiplier,
      );
    torqueWorld.add(spinAssistTorque);

    angularDelta.copy(
      approximateAngularAcceleration(
        torqueWorld,
        world.player.orientation,
        world.player.composite.inertiaTensorLocal,
      ),
    );

    world.player.angularVelocity.addScaledVector(angularDelta, dt);

    if (!handState.leftActive && !handState.rightActive) {
      const lowDir = lowestSupportDirectionWorld(world.player.composite, world.player.orientation, downWorld);
      settleTorque.copy(lowDir).cross(downWorld).multiplyScalar(world.config.movementTuning.settleTorque);
      world.player.angularVelocity.addScaledVector(settleTorque, dt);
    }

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
    writeHandContactDebug(
      world.player.handContact,
      handState.leftAnchor,
      handState.rightAnchor,
      handState.leftForce,
      handState.rightForce,
      handState.leftActive,
      handState.rightActive,
    );

    netIntent.copy(handState.netIntent).projectOnPlane(radialUp);
    let driveInputMagnitude = 0;
    if (netIntent.lengthSq() > 1e-5) {
      netIntent.normalize();
      const leftMagnitude = Math.hypot(world.input.leftStickX, world.input.leftStickY);
      const rightMagnitude = Math.hypot(world.input.rightStickX, world.input.rightStickY);
      driveInputMagnitude = Math.max(0, Math.min(1, (leftMagnitude + rightMagnitude) * 0.5));
      world.player.intentDirection.copy(netIntent);
      headingForward.lerp(netIntent, Math.min(1, dt * world.config.movementTuning.headingResponsiveness)).normalize();
    } else {
      world.player.intentDirection.set(0, 0, 0);
    }
    world.player.heading.copy(headingForward);

    if (driveInputMagnitude > 0.001) {
      const targetLinearSpeed = (
        world.config.movementTuning.speedRadiusScale
        * Math.pow(world.player.radius / Math.max(0.0001, world.config.baseRadius), world.config.movementTuning.speedRadiusExponent)
      )
        * driveInputMagnitude
        * speedMultiplier;
      desiredLinear.copy(world.player.intentDirection).multiplyScalar(targetLinearSpeed);
      desiredOmega.copy(desiredAngularVelocityFromLinear(radialUp, desiredLinear, rollingContact.effectiveRadius));
      world.player.angularVelocity.lerp(desiredOmega, Math.min(1, dt * world.config.movementTuning.driveResponse));
    }

    const motionDamping = dampingFactor(
      driveInputMagnitude > 0.001 ? world.config.movementTuning.driveDamping : world.config.movementTuning.coastDamping,
      dt,
    );
    world.player.angularVelocity.multiplyScalar(motionDamping);
    clampVectorMagnitude(world.player.angularVelocity, world.config.movementTuning.maxAngularSpeed * speedMultiplier);

    linearFromRoll.copy(world.player.angularVelocity).cross(radialUp).multiplyScalar(rollingContact.effectiveRadius);

    projectedVelocity.copy(world.player.velocity).projectOnPlane(radialUp);
    const blend = Math.min(1, dt * (8 + sampleCurve(world.config.movementTuning.accelCurveByRadius, world.player.radius) * 0.25));
    projectedVelocity.lerp(linearFromRoll, blend);

    world.player.velocity.copy(projectedVelocity);
    this.playerBody.position.addScaledVector(world.player.velocity, dt);

    const targetSurface = world.config.worldGeometry.planetRadius + rollingContact.effectiveRadius;
    this.playerBody.position.normalize().multiplyScalar(targetSurface);
  }
}
