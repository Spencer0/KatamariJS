import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/game/config';
import { resolveGrowthTier } from '../src/game/logic';

describe('mega-world config and growth tiers', () => {
  it('uses a 10x planetary scale with density settings', () => {
    expect(defaultConfig.worldGeometry.planetRadius).toBeGreaterThanOrEqual(460);
    expect(defaultConfig.pickupDensity.activeCap).toBeGreaterThan(defaultConfig.pickupDensity.minActive);
  });

  it('advances growth tiers by player radius', () => {
    const t1 = resolveGrowthTier(1.2, defaultConfig.growthTiers);
    const t2 = resolveGrowthTier(5.2, defaultConfig.growthTiers);
    const t3 = resolveGrowthTier(9.1, defaultConfig.growthTiers);

    expect(t1.id).toBe('starter');
    expect(t2.id).toBe('large');
    expect(t3.id).toBe('mega');
  });
});

