import { z } from 'zod';
import type { AssetManifestEntry } from './types';

const manifestEntrySchema = z.object({
  id: z.string().min(1),
  glbPath: z.string().min(1),
  category: z.enum(['pickup', 'prop', 'environment']),
  scale: z.number().positive(),
  pickupRadius: z.number().positive(),
  mass: z.number().positive(),
  valueTier: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  attachPoint: z.string().optional(),
  status: z.enum(['active', 'deprecated']),
});

const manifestSchema = z.array(manifestEntrySchema);

export function parseAssetManifest(input: unknown): AssetManifestEntry[] {
  return manifestSchema.parse(input);
}

export async function loadAssetManifest(url: string): Promise<AssetManifestEntry[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load manifest: ${response.status}`);
  }

  const raw = (await response.json()) as unknown;
  return parseAssetManifest(raw);
}

export function getActivePickups(entries: AssetManifestEntry[]): AssetManifestEntry[] {
  return entries.filter((entry) => entry.category === 'pickup' && entry.status === 'active');
}

export function resolveVisualPath(entries: AssetManifestEntry[], assetId: string): string {
  const asset = entries.find((entry) => entry.id === assetId);
  if (!asset) {
    throw new Error(`Unknown asset id: ${assetId}`);
  }

  return asset.glbPath;
}
