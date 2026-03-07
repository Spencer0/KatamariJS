import { describe, expect, it } from 'vitest';
import { normalizeVector } from '../src/systems/inputSystem';

describe('input normalization', () => {
  it('leaves unit vectors unchanged', () => {
    const normalized = normalizeVector({ x: 0.6, y: 0.8 });
    expect(normalized.x).toBeCloseTo(0.6);
    expect(normalized.y).toBeCloseTo(0.8);
  });

  it('clamps vectors above length 1', () => {
    const normalized = normalizeVector({ x: 2, y: 2 });
    expect(Math.hypot(normalized.x, normalized.y)).toBeCloseTo(1, 6);
  });
});
