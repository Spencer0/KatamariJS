import { Matrix3, Quaternion, Vector3 } from 'three';
import type {
  CompositeBodyState,
  HandContactDebugState,
  ProtrusionState,
  RollingContactState,
  TorqueInputState,
} from './types';

const tmpDir = new Vector3();
const tmpWorld = new Vector3();
const tmpAxis = new Vector3();
const tmpLeftInput = new Vector3();
const tmpRightInput = new Vector3();
const tmpForceLeft = new Vector3();
const tmpForceRight = new Vector3();
const tmpIntent = new Vector3();

function identityTensor(): Matrix3 {
  return new Matrix3().set(
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  );
}

function computeInertia(coreRadius: number, coreMass: number, protrusions: ProtrusionState[], com: Vector3): Matrix3 {
  const iCore = 0.4 * coreMass * coreRadius * coreRadius;

  let ixx = iCore;
  let iyy = iCore;
  let izz = iCore;
  let ixy = 0;
  let ixz = 0;
  let iyz = 0;

  for (const protrusion of protrusions) {
    const local = protrusion.localOffset.clone().sub(com);
    const x = local.x;
    const y = local.y;
    const z = local.z;
    const r2 = protrusion.radius * protrusion.radius;
    const sphereI = 0.4 * protrusion.mass * r2 * Math.max(0.3, protrusion.inertiaBias);

    ixx += protrusion.mass * (y * y + z * z) + sphereI;
    iyy += protrusion.mass * (x * x + z * z) + sphereI;
    izz += protrusion.mass * (x * x + y * y) + sphereI;
    ixy -= protrusion.mass * x * y;
    ixz -= protrusion.mass * x * z;
    iyz -= protrusion.mass * y * z;
  }

  return new Matrix3().set(
    ixx, ixy, ixz,
    ixy, iyy, iyz,
    ixz, iyz, izz,
  );
}

function sampleSphereDirections(): Vector3[] {
  return [
    new Vector3(1, 0, 0),
    new Vector3(-1, 0, 0),
    new Vector3(0, 1, 0),
    new Vector3(0, -1, 0),
    new Vector3(0, 0, 1),
    new Vector3(0, 0, -1),
    new Vector3(1, 1, 0).normalize(),
    new Vector3(1, -1, 0).normalize(),
    new Vector3(0, 1, 1).normalize(),
    new Vector3(0, 1, -1).normalize(),
    new Vector3(1, 0, 1).normalize(),
    new Vector3(-1, 0, 1).normalize(),
  ];
}

function rebuildSupportSamples(coreRadius: number, protrusions: ProtrusionState[]): Vector3[] {
  const samples: Vector3[] = [];
  for (const dir of sampleSphereDirections()) {
    samples.push(dir.clone().multiplyScalar(coreRadius));
  }

  for (const protrusion of protrusions) {
    const dir = protrusion.localOffset.clone().normalize();
    const centerSample = dir.multiplyScalar(protrusion.localOffset.length() + protrusion.radius);
    samples.push(centerSample);
    samples.push(protrusion.localOffset.clone());
  }

  return samples;
}

function effectiveRadiusByDir(composite: CompositeBodyState, dirWorld: Vector3, orientation: Quaternion): number {
  const dirLocal = dirWorld.clone().normalize().applyQuaternion(orientation.clone().invert());
  let maxSupport = composite.coreRadius;

  for (const protrusion of composite.protrusions) {
    const support = protrusion.localOffset.dot(dirLocal) + protrusion.radius;
    if (support > maxSupport) {
      maxSupport = support;
    }
  }

  return maxSupport;
}

export function createCompositeBody(coreRadius: number): CompositeBodyState {
  const composite: CompositeBodyState = {
    coreRadius,
    com: new Vector3(),
    inertiaTensorLocal: identityTensor(),
    principalAxes: new Quaternion(),
    supportSamples: rebuildSupportSamples(coreRadius, []),
    protrusions: [],
    effectiveRollingRadiusByDir: (dir: Vector3, orientation: Quaternion) => effectiveRadiusByDir(composite, dir, orientation),
  };

  return composite;
}

export function addProtrusion(
  composite: CompositeBodyState,
  protrusion: ProtrusionState,
  baseMass: number,
): CompositeBodyState {
  composite.protrusions.push(protrusion);
  recomputeCompositeBody(composite, baseMass);
  return composite;
}

export function recomputeCompositeBody(composite: CompositeBodyState, baseMass: number): CompositeBodyState {
  let totalMass = baseMass;
  const com = new Vector3();

  for (const protrusion of composite.protrusions) {
    totalMass += protrusion.mass;
    com.addScaledVector(protrusion.localOffset, protrusion.mass);
  }

  if (totalMass > 0) {
    com.divideScalar(totalMass);
  }

  composite.com.copy(com);
  composite.inertiaTensorLocal.copy(computeInertia(composite.coreRadius, baseMass, composite.protrusions, composite.com));
  composite.supportSamples = rebuildSupportSamples(composite.coreRadius, composite.protrusions);

  return composite;
}

export function estimateRollingContact(
  composite: CompositeBodyState,
  orientation: Quaternion,
  center: Vector3,
  surfaceNormal: Vector3,
): RollingContactState {
  const downWorld = surfaceNormal.clone().negate().normalize();
  const effectiveRadius = composite.effectiveRollingRadiusByDir(downWorld, orientation);
  const contactPoint = center.clone().addScaledVector(downWorld, effectiveRadius);
  const isStable = composite.protrusions.length < 4 || effectiveRadius <= composite.coreRadius * 1.15;

  return {
    contactPoint,
    contactNormal: surfaceNormal.clone().normalize(),
    effectiveRadius,
    isStable,
  };
}

export function lowestSupportDirectionWorld(
  composite: CompositeBodyState,
  orientation: Quaternion,
  downWorld: Vector3,
): Vector3 {
  let best = downWorld.clone();
  let bestDot = -Infinity;

  for (const sample of composite.supportSamples) {
    tmpWorld.copy(sample).normalize().applyQuaternion(orientation);
    const d = tmpWorld.dot(downWorld);
    if (d > bestDot) {
      bestDot = d;
      best.copy(tmpWorld);
    }
  }

  return best;
}

export function torqueInputFromDirection(direction: Vector3, magnitude: number, assistFactor = 1): TorqueInputState {
  return {
    desiredTangentDir: direction.clone(),
    magnitude,
    assistFactor,
  };
}

export function inverseInertiaDiagonal(tensor: Matrix3): Vector3 {
  const e = tensor.elements;
  const ix = Math.max(0.001, e[0]);
  const iy = Math.max(0.001, e[4]);
  const iz = Math.max(0.001, e[8]);
  return new Vector3(1 / ix, 1 / iy, 1 / iz);
}

export function approximateAngularAcceleration(
  torqueWorld: Vector3,
  orientation: Quaternion,
  inertiaTensorLocal: Matrix3,
): Vector3 {
  const torqueLocal = torqueWorld.clone().applyQuaternion(orientation.clone().invert());
  const invLocal = inverseInertiaDiagonal(inertiaTensorLocal);

  tmpDir.set(
    torqueLocal.x * invLocal.x,
    torqueLocal.y * invLocal.y,
    torqueLocal.z * invLocal.z,
  );

  return tmpDir.clone().applyQuaternion(orientation);
}

export function clampVectorMagnitude(v: Vector3, max: number): void {
  if (v.length() > max) {
    v.setLength(max);
  }
}

export function dampingFactor(rate: number, dt: number): number {
  return Math.exp(-Math.max(0, rate) * Math.max(0, dt));
}

export function desiredAngularVelocityFromLinear(
  up: Vector3,
  desiredLinear: Vector3,
  effectiveRadius: number,
): Vector3 {
  const safeRadius = Math.max(0.0001, effectiveRadius);
  return up.clone().cross(desiredLinear).multiplyScalar(1 / safeRadius);
}

export function applySoftSpeedCap(speed: number, cap: number, excessRetention = 0.2): number {
  if (speed <= cap) {
    return speed;
  }
  const retained = Math.max(0, Math.min(1, excessRetention));
  return cap + (speed - cap) * retained;
}

function applyDeadzone(v: Vector3, deadzone: number): Vector3 {
  const mag = v.length();
  if (mag <= deadzone) {
    return v.set(0, 0, 0);
  }
  const scaled = (mag - deadzone) / (1 - deadzone);
  return v.normalize().multiplyScalar(Math.max(0, Math.min(1, scaled)));
}

function rotateToward(base: Vector3, toward: Vector3, angleRad: number): Vector3 {
  tmpAxis.copy(base).cross(toward);
  if (tmpAxis.lengthSq() < 1e-8) {
    return base.clone();
  }
  return base.clone().applyAxisAngle(tmpAxis.normalize(), angleRad).normalize();
}

export function computeHandContactState(
  up: Vector3,
  forward: Vector3,
  right: Vector3,
  leftStick: { x: number; y: number },
  rightStick: { x: number; y: number },
  tuning: {
    handContactDownDeg: number;
    handContactTowardCameraDeg: number;
    handContactLateralDeg: number;
    handForceStrength: number;
    inputDeadzone: number;
  },
): {
  leftAnchor: Vector3;
  rightAnchor: Vector3;
  leftForce: Vector3;
  rightForce: Vector3;
  leftActive: boolean;
  rightActive: boolean;
  netForce: Vector3;
  netIntent: Vector3;
} {
  const towardViewer = forward.clone().multiplyScalar(-1);
  const downRad = (tuning.handContactDownDeg * Math.PI) / 180;
  const towardRad = (tuning.handContactTowardCameraDeg * Math.PI) / 180;
  const lateralRad = (tuning.handContactLateralDeg * Math.PI) / 180;

  const leftToward = towardViewer.clone().applyAxisAngle(right, towardRad).normalize();
  const rightToward = towardViewer.clone().applyAxisAngle(right, towardRad).normalize();
  const leftAim = leftToward.applyAxisAngle(towardViewer, lateralRad).normalize();
  const rightAim = rightToward.applyAxisAngle(towardViewer, -lateralRad).normalize();

  const leftAnchor = rotateToward(up, leftAim, downRad);
  const rightAnchor = rotateToward(up, rightAim, downRad);

  tmpLeftInput.set(leftStick.x, leftStick.y, 0);
  tmpRightInput.set(rightStick.x, rightStick.y, 0);
  applyDeadzone(tmpLeftInput, tuning.inputDeadzone);
  applyDeadzone(tmpRightInput, tuning.inputDeadzone);

  tmpForceLeft.copy(right).multiplyScalar(tmpLeftInput.x).addScaledVector(forward, tmpLeftInput.y);
  tmpForceRight.copy(right).multiplyScalar(tmpRightInput.x).addScaledVector(forward, tmpRightInput.y);

  tmpForceLeft.projectOnPlane(leftAnchor);
  tmpForceRight.projectOnPlane(rightAnchor);

  const leftMag = tmpForceLeft.length();
  const rightMag = tmpForceRight.length();
  if (leftMag > 1e-6) {
    tmpForceLeft.normalize().multiplyScalar(leftMag * tuning.handForceStrength);
  } else {
    tmpForceLeft.set(0, 0, 0);
  }
  if (rightMag > 1e-6) {
    tmpForceRight.normalize().multiplyScalar(rightMag * tuning.handForceStrength);
  } else {
    tmpForceRight.set(0, 0, 0);
  }

  const netForce = tmpForceLeft.clone().add(tmpForceRight);
  tmpIntent.copy(forward).multiplyScalar(tmpLeftInput.y + tmpRightInput.y);
  tmpIntent.addScaledVector(right, tmpLeftInput.x + tmpRightInput.x);

  return {
    leftAnchor,
    rightAnchor,
    leftForce: tmpForceLeft.clone(),
    rightForce: tmpForceRight.clone(),
    leftActive: leftMag > 1e-4,
    rightActive: rightMag > 1e-4,
    netForce,
    netIntent: tmpIntent.projectOnPlane(up).normalize(),
  };
}

export function writeHandContactDebug(
  target: HandContactDebugState,
  leftAnchor: Vector3,
  rightAnchor: Vector3,
  leftForce: Vector3,
  rightForce: Vector3,
  leftActive: boolean,
  rightActive: boolean,
): void {
  target.leftAnchor.copy(leftAnchor);
  target.rightAnchor.copy(rightAnchor);
  target.leftForceDir.copy(leftForce).normalize();
  target.rightForceDir.copy(rightForce).normalize();
  target.leftActive = leftActive;
  target.rightActive = rightActive;
}
