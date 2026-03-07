import { Matrix3, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  addProtrusion,
  approximateAngularAcceleration,
  createCompositeBody,
  estimateRollingContact,
} from '../src/game/compositePhysics';

describe('composite body physics', () => {
  it('shifts center of mass toward protrusions', () => {
    const composite = createCompositeBody(0.6);
    addProtrusion(
      composite,
      {
        id: 'p1',
        localOffset: new Vector3(1, 0, 0),
        radius: 0.2,
        mass: 2,
        shapeClass: 'round',
        inertiaBias: 1,
      },
      8,
    );

    expect(composite.com.x).toBeGreaterThan(0);
    expect(composite.com.y).toBeCloseTo(0, 6);
  });

  it('changes effective rolling radius by direction', () => {
    const composite = createCompositeBody(0.6);
    addProtrusion(
      composite,
      {
        id: 'p1',
        localOffset: new Vector3(0.9, 0, 0),
        radius: 0.3,
        mass: 2,
        shapeClass: 'boxy',
        inertiaBias: 1,
      },
      8,
    );

    const q = new Quaternion();
    const along = composite.effectiveRollingRadiusByDir(new Vector3(1, 0, 0), q);
    const opposite = composite.effectiveRollingRadiusByDir(new Vector3(-1, 0, 0), q);
    expect(along).toBeGreaterThan(opposite);
  });

  it('produces anisotropic angular acceleration', () => {
    const composite = createCompositeBody(0.6);
    addProtrusion(
      composite,
      {
        id: 'p1',
        localOffset: new Vector3(0.8, 0.2, 0),
        radius: 0.3,
        mass: 4,
        shapeClass: 'elongated',
        inertiaBias: 1.5,
      },
      8,
    );

    const ax = approximateAngularAcceleration(new Vector3(5, 0, 0), new Quaternion(), composite.inertiaTensorLocal);
    const ay = approximateAngularAcceleration(new Vector3(0, 5, 0), new Quaternion(), composite.inertiaTensorLocal);
    expect(Math.abs(ax.x - ay.y)).toBeGreaterThan(0.00001);
  });

  it('estimates rolling contact with non-core support radius', () => {
    const composite = createCompositeBody(0.6);
    addProtrusion(
      composite,
      {
        id: 'p1',
        localOffset: new Vector3(0, -0.9, 0),
        radius: 0.25,
        mass: 3,
        shapeClass: 'round',
        inertiaBias: 1,
      },
      8,
    );

    const contact = estimateRollingContact(
      composite,
      new Quaternion(),
      new Vector3(0, 10, 0),
      new Vector3(0, 1, 0),
    );

    expect(contact.effectiveRadius).toBeGreaterThan(0.6);
  });

  it('keeps matrix type stable', () => {
    const composite = createCompositeBody(0.6);
    expect(composite.inertiaTensorLocal).toBeInstanceOf(Matrix3);
  });
});
