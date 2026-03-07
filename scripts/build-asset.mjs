import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const manifestPath = path.join(root, 'public', 'assets', 'assets.manifest.json');
const blenderDefault = path.join(root, 'tools', 'blender', 'blender-4.2.3-windows-x64', 'blender.exe');
const blenderBin = process.env.BLENDER_BIN || blenderDefault;

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const hasArg = (flag) => args.includes(flag);

const requestedId = getArg('--id');
const force = hasArg('--force');
const dryRun = hasArg('--dry-run');
const useLlm = hasArg('--use-llm');

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function resolveOutput(glbPath) {
  const relative = glbPath.startsWith('/') ? glbPath.slice(1) : glbPath;
  return path.join(root, 'public', relative);
}

function pickEntry(entries) {
  const activePickups = entries.filter((entry) => entry.status === 'active' && entry.category === 'pickup');
  if (requestedId) {
    return activePickups.find((entry) => entry.id === requestedId);
  }

  return activePickups.find((entry) => !fs.existsSync(resolveOutput(entry.glbPath))) || activePickups[0];
}

async function maybeGenerateLlmNote(entry) {
  if (!useLlm) {
    return null;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is required when --use-llm is set');
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const prompt = `Create a short 3D design brief for asset id ${entry.id}. Biome=${entry.biome || 'suburb'} styleTags=${(entry.styleTags || []).join(',')}. Keep it low-poly and anime/Japan-inspired.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You write concise 3D art briefs for procedural Blender generation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return null;
  }

  const outDir = path.join(root, 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${entry.id}.brief.md`);
  fs.writeFileSync(outPath, `${text}\n`, 'utf8');
  return outPath;
}

async function main() {
  if (!fs.existsSync(blenderBin)) {
    throw new Error(`Blender binary not found: ${blenderBin}. Install Blender or set BLENDER_BIN.`);
  }

  const entries = readManifest();
  const entry = pickEntry(entries);
  if (!entry) {
    throw new Error('No active pickup entries found in manifest');
  }

  const output = resolveOutput(entry.glbPath);
  if (fs.existsSync(output) && !force) {
    console.log(`Asset already exists: ${output}`);
    console.log('Use --force to regenerate.');
    return;
  }

  const briefPath = await maybeGenerateLlmNote(entry);

  const cmdArgs = [
    '--background',
    '--factory-startup',
    '--python',
    path.join(root, 'scripts', 'blender_generate_asset.py'),
    '--',
    '--asset-id',
    entry.id,
    '--biome',
    entry.biome || 'suburb',
    '--style-tags',
    Array.isArray(entry.styleTags) ? entry.styleTags.join(',') : 'anime',
    '--output',
    output,
    '--seed',
    String(Math.floor(Math.random() * 100000)),
  ];

  console.log(`Selected asset: ${entry.id}`);
  console.log(`Blender: ${blenderBin}`);
  console.log(`Output: ${output}`);
  if (briefPath) {
    console.log(`LLM brief: ${briefPath}`);
  }

  if (dryRun) {
    console.log('Dry run only; no generation executed.');
    return;
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });

  const result = spawnSync(blenderBin, cmdArgs, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Blender generation failed with exit code ${result.status}`);
  }

  console.log(`Generated: ${path.relative(root, output)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
