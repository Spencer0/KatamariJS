import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { computeHandContactState } from '../src/game/compositePhysics';

const up = new Vector3(0, 1, 0);
const forward = new Vector3(0, 0, 1);
const right = new Vector3(1, 0, 0);
const tuning = {
  handContactDownDeg: 30,
  handContactTowardCameraDeg: 30,
  handContactLateralDeg: 30,
  handForceStrength: 22,
  inputDeadzone: 0.09,
};

function projectedForce(left: { x: number; y: number }, rightStick: { x: number; y: number }): { fwd: number; right: number; mag: number } {
  const state = computeHandContactState(up, forward, right, left, rightStick, tuning);
  const tangent = state.netForce.clone().projectOnPlane(up);
  return {
    fwd: tangent.dot(forward),
    right: tangent.dot(right),
    mag: tangent.length(),
  };
}

describe('two-hand contact drive mapping', () => {
  it('maps canonical one-hand inputs to expected diagonals', () => {
    const wOnly = projectedForce({ x: 0, y: 1 }, { x: 0, y: 0 });
    expect(wOnly.fwd).toBeGreaterThan(0.01);
    expect(wOnly.right).toBeGreaterThan(0.01);

    const upOnly = projectedForce({ x: 0, y: 0 }, { x: 0, y: 1 });
    expect(upOnly.fwd).toBeGreaterThan(0.01);
    expect(upOnly.right).toBeLessThan(-0.01);

    const aOnly = projectedForce({ x: -1, y: 0 }, { x: 0, y: 0 });
    expect(aOnly.fwd).toBeLessThan(-0.01);
    expect(aOnly.right).toBeLessThan(-0.01);

    const rightOnly = projectedForce({ x: 0, y: 0 }, { x: 1, y: 0 });
    expect(rightOnly.fwd).toBeLessThan(-0.01);
    expect(rightOnly.right).toBeGreaterThan(0.01);
  });

  it('maps paired pushes to straight forward/backward', () => {
    const bothForward = projectedForce({ x: 0, y: 1 }, { x: 0, y: 1 });
    expect(bothForward.fwd).toBeGreaterThan(0.01);
    expect(Math.abs(bothForward.right)).toBeLessThan(0.15 * bothForward.mag);

    const bothBackward = projectedForce({ x: 0, y: -1 }, { x: 0, y: -1 });
    expect(bothBackward.fwd).toBeLessThan(-0.01);
    expect(Math.abs(bothBackward.right)).toBeLessThan(0.15 * bothBackward.mag);
  });

  it('makes A + RightArrow straight backward but weaker than S + Down', () => {
    const opposeLateral = projectedForce({ x: -1, y: 0 }, { x: 1, y: 0 });
    const bothBackward = projectedForce({ x: 0, y: -1 }, { x: 0, y: -1 });

    expect(opposeLateral.fwd).toBeLessThan(-0.01);
    expect(Math.abs(opposeLateral.right)).toBeLessThan(0.15 * opposeLateral.mag);
    expect(opposeLateral.mag).toBeLessThan(bothBackward.mag);
  });
});

