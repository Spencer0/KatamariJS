# Asset Pipeline

## Principle
Author with any AI workflow, ship as `.glb`.

## Allowed Authoring Inputs
- AI-generated Three.js prototype code
- Blender scenes
- Image-to-3D tools
- SVG/extrusion prototypes for simple objects

## Freeze Process
1. Prototype asset quickly.
2. Normalize scale, pivot, and orientation in DCC tool.
3. Export `.glb`.
4. Register in `assets.manifest.json` with gameplay metadata.
5. Validate via schema + in-game smoke check.

## Runtime Contract
- Gameplay systems consume manifest metadata only.
- Systems never rely on arbitrary node names beyond documented anchors (`attachPoint`).
- Visual asset swaps happen by changing manifest path or id references.

## Validation Checklist
- Correct id naming/version.
- Positive mass/radius.
- Category is valid.
- Asset loads without fatal errors.
- Fallback behavior remains functional if load fails.
