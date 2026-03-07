# Asset Agent Workflow

## Goal
Produce 20 curated hero assets now and scale to 100 with consistent quality gates.

## Prompt Template
Use this base prompt for asset generation agents:

"Create a stylized 3D [OBJECT_NAME] for a Katamari-like game. Visual direction: anime-inspired, Japan street-life and suburban/forest motifs, clean silhouettes, readable from distance, low-poly friendly. Output must support export to GLB with centered pivot and Y-up orientation."

## Style Rules
- Keep saturated but cohesive colors.
- Exaggerate silhouettes for readability while rolling.
- Avoid thin protrusions that cause noisy collision.
- Include culturally grounded motifs without trademarked characters.

## Freeze Gates (.glb)
- ID format: `<category>.<name>.v<number>`
- Positive mass/radius/scale.
- `qualityScore >= 65`.
- `biome` tagged (`forest|city|suburb`) when applicable.
- `status` set to `active` or `deprecated`.

## Validation Flow
1. Generate candidate asset in DCC/AI tool.
2. Export `.glb` and register manifest metadata.
3. Run `npm run assets:validate` and inspect `reports/asset-validation-report.json`.
4. Launch smoke run and confirm fallback behavior if file missing.
5. Promote to `active` and record review notes.

## Batch Plan
- Batch A (20 hero assets): balanced 7 forest, 7 city, 6 suburb.
- Batch B-C (next 80): generated in smaller waves with same gates.

## Prompt Generation
- Run `npm run assets:prompts` to generate agent-ready prompts from the current manifest.
- Output file: `docs/asset-prompts.generated.md`.
