import { describe, expect, it } from 'vitest';
import { getActivePickups, parseAssetManifest, parseAudioManifest, validateAssetEntries } from '../src/game/manifest';

describe('manifest schema', () => {
  it('rejects missing required fields', () => {
    const invalid = [{ id: 'pickup.apple.v1' }];
    expect(() => parseAssetManifest(invalid)).toThrow();
  });

  it('parses optional biome/style fields', () => {
    const parsed = parseAssetManifest([
      {
        id: 'pickup.apple.v2',
        glbPath: '/a.glb',
        category: 'pickup',
        scale: 1,
        pickupRadius: 0.5,
        mass: 1,
        valueTier: 1,
        tags: [],
        status: 'active',
        biome: 'forest',
        styleTags: ['anime'],
        qualityScore: 80,
        physicsRadius: 0.45,
        massDistributionClass: 'balanced',
        attachDepth: 0.04,
        inertiaBias: 1.2,
        visualScaleFix: 1.1,
        sizeTier: 'medium',
        spawnWeight: 1.6,
        groundingOffset: -0.03,
      },
    ]);
    expect(parsed[0].biome).toBe('forest');
    expect(parsed[0].styleTags).toContain('anime');
    expect(parsed[0].physicsRadius).toBeCloseTo(0.45);
    expect(parsed[0].sizeTier).toBe('medium');
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

  it('parses audio manifest contracts', () => {
    const parsed = parseAudioManifest([
      { id: 'bgm.v1', path: 'synth://demo', loop: true, volume: 0.7, status: 'active' },
    ]);
    expect(parsed[0].loop).toBe(true);
  });

  it('reports validation failures for non-versioned ids', () => {
    const reports = validateAssetEntries([
      {
        id: 'pickup.apple',
        glbPath: '/a.glb',
        category: 'pickup',
        scale: 1,
        pickupRadius: 0.4,
        mass: 1,
        valueTier: 1,
        tags: [],
        status: 'active',
      },
    ]);

    expect(reports[0].passFail).toBe('fail');
    expect(reports[0].notes).toContain('id must end');
  });
});
