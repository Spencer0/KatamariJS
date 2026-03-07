import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'public', 'assets', 'assets.manifest.json');
const outArgIndex = process.argv.findIndex((arg) => arg === '--out');
const outPath =
  outArgIndex >= 0 && process.argv[outArgIndex + 1]
    ? path.resolve(root, process.argv[outArgIndex + 1])
    : path.join(root, 'reports', 'asset-prompts.md');

/** @type {Array<Record<string, unknown>>} */
const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const pickups = entries.filter((entry) => entry.category === 'pickup' && entry.status === 'active');

const lines = [];
lines.push('# Asset Prompts');
lines.push('');
lines.push('Generated from `public/assets/assets.manifest.json`.');
lines.push('');

for (const entry of pickups) {
  const id = String(entry.id);
  const biome = String(entry.biome ?? 'suburb');
  const styleTags = Array.isArray(entry.styleTags) ? entry.styleTags.map(String) : [];
  const tags = Array.isArray(entry.tags) ? entry.tags.map(String) : [];

  lines.push(`## ${id}`);
  lines.push('');
  lines.push(`- Biome: \`${biome}\``);
  lines.push(`- Style: \`${styleTags.join(', ') || 'anime'}\``);
  lines.push(`- Gameplay tags: \`${tags.join(', ')}\``);
  lines.push('');
  lines.push('```text');
  lines.push(
    `Create a stylized 3D ${id} pickup for a Katamari-like game. Anime-inspired visual language with Japanese motifs. ` +
      `Target biome: ${biome}. Keep silhouette readable at distance, low-poly friendly, and export-ready to GLB with centered pivot and Y-up orientation. ` +
      `Avoid thin noisy geometry. Include personality through color blocking and simple secondary forms.`,
  );
  lines.push('```');
  lines.push('');
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote prompts: ${path.relative(root, outPath)}`);
