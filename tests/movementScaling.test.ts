import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/game/config';
import {
  dampingFactor,
  desiredAngularVelocityFromLinear,
} from '../src/game/compositePhysics';

describe('radius-positive speed tuning', () => {
  it('radius speed function increases with radius and is effectively unbounded', () => {
    const speedForRadius = (r: number) => (
      defaultConfig.movementTuning.speedRadiusScale
      * Math.pow(r / defaultConfig.baseRadius, defaultConfig.movementTuning.speedRadiusExponent)
    );
    const r06 = speedForRadius(0.6);
    const r13 = speedForRadius(1.3);
    const r28 = speedForRadius(2.8);
    const r12 = speedForRadius(12);

    expect(r13).toBeGreaterThan(r06);
    expect(r28).toBeGreaterThan(r13);
    expect(r12).toBeGreaterThan(r28);
  });

  it('converts desired linear velocity to angular velocity consistently', () => {
    const up = new Vector3(0, 1, 0);
    const desiredLinear = new Vector3(0, 0, 7);
    const radius = 1.3;
    const omega = desiredAngularVelocityFromLinear(up, desiredLinear, radius);
    const rolled = omega.clone().cross(up).multiplyScalar(radius);

    expect(rolled.x).toBeCloseTo(desiredLinear.x, 6);
    expect(rolled.z).toBeCloseTo(desiredLinear.z, 6);
  });

  it('damping factor is stable across timestep sizes', () => {
    const rate = 2.6;
    const oneStep = dampingFactor(rate, 1);
    const thirtySteps = Array.from({ length: 30 }).reduce<number>((acc) => acc * dampingFactor(rate, 1 / 30), 1);
    const sixtySteps = Array.from({ length: 60 }).reduce<number>((acc) => acc * dampingFactor(rate, 1 / 60), 1);

    expect(thirtySteps).toBeCloseTo(oneStep, 6);
    expect(sixtySteps).toBeCloseTo(oneStep, 6);
  });
});
