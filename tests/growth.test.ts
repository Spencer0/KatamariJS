import { describe, expect, it } from 'vitest';
import { calculateRadius, canAttachPickup } from '../src/game/logic';
import { defaultConfig } from '../src/game/config';

describe('growth math', () => {
  it('increases radius as mass grows', () => {
    const small = calculateRadius(defaultConfig.baseRadius, 9, defaultConfig.growthFactor);
    const large = calculateRadius(defaultConfig.baseRadius, 36, defaultConfig.growthFactor);
    expect(large).toBeGreaterThan(small);
  });

  it('allows attach only under threshold', () => {
    expect(canAttachPickup(1, 0.8, defaultConfig)).toBe(true);
    expect(canAttachPickup(1, 1.2, defaultConfig)).toBe(false);
  });
});
