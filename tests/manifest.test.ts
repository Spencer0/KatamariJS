import { describe, expect, it } from 'vitest';
import { getActivePickups, parseAssetManifest } from '../src/game/manifest';

describe('manifest schema', () => {
  it('rejects missing required fields', () => {
    const invalid = [{ id: 'pickup.apple.v1' }];
    expect(() => parseAssetManifest(invalid)).toThrow();
  });

  it('filters active pickups', () => {
    const parsed = parseAssetManifest([
      {
        id: 'pickup.apple.v1',
        glbPath: '/a.glb',
        category: 'pickup',
        scale: 1,
        pickupRadius: 0.5,
        mass: 1,
        valueTier: 1,
        tags: [],
        status: 'active',
      },
      {
        id: 'pickup.old.v0',
        glbPath: '/old.glb',
        category: 'pickup',
        scale: 1,
        pickupRadius: 0.5,
        mass: 1,
        valueTier: 1,
        tags: [],
        status: 'deprecated',
      },
    ]);

    const active = getActivePickups(parsed);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('pickup.apple.v1');
  });
});
