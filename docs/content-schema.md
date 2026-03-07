# Content Schema

## Asset Manifest Entry
```ts
interface AssetManifestEntry {
  id: string;
  glbPath: string;
  category: "pickup" | "prop" | "environment";
  scale: number;
  pickupRadius: number;
  mass: number;
  valueTier: number;
  tags: string[];
  attachPoint?: string;
  status: "active" | "deprecated";
}
```

## Naming Rules
- `pickup.<name>.v<number>` for pickups.
- `prop.<name>.v<number>` for static props.
- `environment.<name>.v<number>` for map chunks.

## Deprecation
- Deprecated assets stay in manifest with `status: "deprecated"`.
- Runtime default filters deprecated entries from spawn pools.

## Validation
- Required fields must exist and pass type checks.
- Positive numeric constraints: `scale`, `pickupRadius`, `mass`.
