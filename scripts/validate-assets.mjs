import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'public', 'assets', 'assets.manifest.json');
const outputPath = path.join(root, 'reports', 'asset-validation-report.json');

/** @typedef {'forest'|'city'|'suburb'} Biome */

/** @type {Array<Record<string, unknown>>} */
const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const idPattern = /^(pickup|prop|environment)\.[a-z0-9-]+\.v\d+$/;
const allowedBiomes = new Set(['forest', 'city', 'suburb']);

const failures = [];
const warnings = [];

const counts = {
  total: entries.length,
  active: 0,
  activePickups: 0,
  byBiome: {
    forest: 0,
    city: 0,
    suburb: 0,
  },
};

for (const entry of entries) {
  const id = String(entry.id ?? '');
  const category = String(entry.category ?? '');
  const status = String(entry.status ?? '');
  const glbPath = String(entry.glbPath ?? '');
  const mass = Number(entry.mass ?? 0);
  const pickupRadius = Number(entry.pickupRadius ?? 0);
  const scale = Number(entry.scale ?? 0);
  const qualityScore = entry.qualityScore === undefined ? undefined : Number(entry.qualityScore);
  const biome = entry.biome === undefined ? undefined : String(entry.biome);
  const styleTags = Array.isArray(entry.styleTags) ? entry.styleTags : [];

  if (status === 'active') {
    counts.active += 1;
  }

  if (!idPattern.test(id)) {
    failures.push({ id, check: 'id-pattern', message: 'id must match <category>.<name>.v<number>' });
  }

  if (!glbPath.endsWith('.glb')) {
    failures.push({ id, check: 'glb-extension', message: 'glbPath must end with .glb' });
  }

  if (!(mass > 0 && pickupRadius > 0 && scale > 0)) {
    failures.push({ id, check: 'positive-physics', message: 'mass, pickupRadius, and scale must be > 0' });
  }

  if (status === 'active' && qualityScore !== undefined && qualityScore < 65) {
    failures.push({ id, check: 'quality-threshold', message: 'active assets require qualityScore >= 65' });
  }

  if (category === 'pickup' && status === 'active') {
    counts.activePickups += 1;

    if (!biome || !allowedBiomes.has(biome)) {
      failures.push({ id, check: 'biome-required', message: 'active pickups require biome: forest|city|suburb' });
    } else {
      counts.byBiome[biome] += 1;
    }

    if (styleTags.length === 0) {
      warnings.push({ id, check: 'style-tags', message: 'active pickups should include styleTags for prompt generation' });
    }
  }
}

const targetPerBiome = {
  forest: 6,
  city: 6,
  suburb: 6,
};

for (const biome of /** @type {Array<Biome>} */ (['forest', 'city', 'suburb'])) {
  if (counts.byBiome[biome] < targetPerBiome[biome]) {
    warnings.push({
      id: `summary:${biome}`,
      check: 'biome-balance',
      message: `recommended at least ${targetPerBiome[biome]} active pickup assets in ${biome}, found ${counts.byBiome[biome]}`,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    ...counts,
    failures: failures.length,
    warnings: warnings.length,
    pass: failures.length === 0,
  },
  failures,
  warnings,
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Asset validation: ${report.summary.pass ? 'PASS' : 'FAIL'}`);
console.log(`Active pickups: ${counts.activePickups}`);
console.log(`Biome counts: forest=${counts.byBiome.forest}, city=${counts.byBiome.city}, suburb=${counts.byBiome.suburb}`);
console.log(`Report: ${path.relative(root, outputPath)}`);

if (failures.length > 0) {
  console.error('Validation failures:');
  for (const failure of failures) {
    console.error(`- ${failure.id}: ${failure.message}`);
  }
  process.exit(1);
}
