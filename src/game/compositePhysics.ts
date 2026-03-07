import { Matrix3, Quaternion, Vector3 } from 'three';
import type {
  CompositeBodyState,
  ProtrusionState,
  RollingContactState,
  TorqueInputState,
} from './types';

const tmpDir = new Vector3();
const tmpWorld = new Vector3();

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
