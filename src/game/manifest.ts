import { z } from 'zod';
import type { AssetManifestEntry, AssetValidationReport, AudioTrackManifestEntry, BiomeType } from './types';

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
  biome: z.enum(['forest', 'city', 'suburb']).optional(),
  styleTags: z.array(z.string()).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  physicsRadius: z.number().positive().optional(),
  massDistributionClass: z.enum(['balanced', 'topheavy', 'elongated']).optional(),
  attachDepth: z.number().min(0).max(2).optional(),
  inertiaBias: z.number().min(0.2).max(3).optional(),
  visualScaleFix: z.number().positive().optional(),
});

const audioTrackSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  loop: z.boolean(),
  volume: z.number().min(0).max(1),
  status: z.enum(['active', 'deprecated']),
});

const manifestSchema = z.array(manifestEntrySchema);
const audioManifestSchema = z.array(audioTrackSchema);

export function parseAssetManifest(input: unknown): AssetManifestEntry[] {
  return manifestSchema.parse(input);
}

export function parseAudioManifest(input: unknown): AudioTrackManifestEntry[] {
  return audioManifestSchema.parse(input);
}

export async function loadAssetManifest(url: string): Promise<AssetManifestEntry[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load manifest: ${response.status}`);
  }

  const raw = (await response.json()) as unknown;
  return parseAssetManifest(raw);
}

export async function loadAudioManifest(url: string): Promise<AudioTrackManifestEntry[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load audio manifest: ${response.status}`);
  }

  const raw = (await response.json()) as unknown;
  return parseAudioManifest(raw);
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

function hasVersionedId(id: string): boolean {
  return /\.(v\d+)$/.test(id);
}

export function validateAssetEntries(entries: AssetManifestEntry[]): AssetValidationReport[] {
  return entries.map((entry) => {
    const checks: string[] = [];
    const failures: string[] = [];

    if (hasVersionedId(entry.id)) {
      checks.push('id-versioned');
    } else {
      failures.push('id must end in .v<number>');
    }

    if (entry.glbPath.endsWith('.glb')) {
      checks.push('glb-extension');
    } else {
      failures.push('glbPath must end with .glb');
    }

    if (entry.qualityScore === undefined || entry.qualityScore >= 65) {
      checks.push('quality-threshold');
    } else {
      failures.push('quality score is below recommended threshold (65)');
    }

    return {
      assetId: entry.id,
      checks,
      passFail: failures.length === 0 ? 'pass' : 'fail',
      notes: failures.length === 0 ? 'ok' : failures.join('; '),
    };
  });
}

export function pickEntriesForBiome(entries: AssetManifestEntry[], biome: BiomeType): AssetManifestEntry[] {
  return entries.filter((entry) => entry.status === 'active' && entry.category === 'pickup' && (!entry.biome || entry.biome === biome));
}
