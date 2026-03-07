import { describe, expect, it } from 'vitest';
import { isWaterPosition, safeRespawnPosition } from '../src/game/logic';
import { Vector3 } from 'three';

describe('hazard and respawn logic', () => {
  it('identifies water in equatorial ocean band', () => {
    expect(isWaterPosition(new Vector3(30, 0.1, 20))).toBe(true);
  });

  it('finds safe respawn positions away from water', () => {
    const pos = safeRespawnPosition(new Vector3(50, 0, 0), 46, 1.2);
    expect(isWaterPosition(pos)).toBe(false);
  });
});
