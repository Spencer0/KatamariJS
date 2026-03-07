import { describe, expect, it } from 'vitest';
import { parseAssetManifest, resolveVisualPath } from '../src/game/manifest';

describe('asset swap behavior', () => {
  it('allows visual path swaps without changing gameplay metadata', () => {
    const base = parseAssetManifest([
      {
        id: 'pickup.apple.v1',
        glbPath: '/apple-a.glb',
        category: 'pickup',
        scale: 1,
        pickupRadius: 0.4,
        mass: 1,
        valueTier: 1,
        tags: ['food'],
        status: 'active',
      },
    ]);

    const swapped = parseAssetManifest([
      {
        id: 'pickup.apple.v1',
        glbPath: '/apple-b.glb',
        category: 'pickup',
        scale: 1,
        pickupRadius: 0.4,
        mass: 1,
        valueTier: 1,
        tags: ['food'],
        status: 'active',
      },
    ]);

    expect(resolveVisualPath(base, 'pickup.apple.v1')).toBe('/apple-a.glb');
    expect(resolveVisualPath(swapped, 'pickup.apple.v1')).toBe('/apple-b.glb');
    expect(swapped[0].mass).toBe(base[0].mass);
    expect(swapped[0].pickupRadius).toBe(base[0].pickupRadius);
  });
});
