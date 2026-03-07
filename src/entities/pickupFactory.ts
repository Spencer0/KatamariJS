import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssetManifestEntry, BiomeType, PickupEntity } from '../game/types';

const loader = new GLTFLoader();

function biomeHue(biome: BiomeType): number {
  if (biome === 'forest') {
    return 0.3;
  }
  if (biome === 'city') {
    return 0.6;
  }
  return 0.1;
}

function fallbackMesh(entry: AssetManifestEntry, biome: BiomeType): Mesh {
  const geometry = entry.tags.includes('prop')
    ? new BoxGeometry(entry.pickupRadius * 2, entry.pickupRadius * 2, entry.pickupRadius * 2)
    : new SphereGeometry(entry.pickupRadius, 16, 16);
  const material = new MeshStandardMaterial({
    color: new Color().setHSL(biomeHue(biome), 0.72, 0.52),
    roughness: 0.52,
    metalness: 0.18,
  });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function firstMesh(root: Object3D): Mesh | null {
  let candidate: Mesh | null = null;
  root.traverse((node: Object3D) => {
    if (!candidate && node instanceof Mesh) {
      candidate = node;
    }
  });
  return candidate;
}

async function loadVisual(entry: AssetManifestEntry, biome: BiomeType): Promise<Mesh> {
  try {
    const glbPath = entry.glbPath.startsWith('/') ? entry.glbPath.slice(1) : entry.glbPath;
    const glbUrl = new URL(glbPath, window.location.origin + import.meta.env.BASE_URL).toString();
    const gltf = await loader.loadAsync(glbUrl);
    gltf.scene.scale.setScalar(entry.scale);
    const mesh = firstMesh(gltf.scene);
    if (!mesh) {
      return fallbackMesh(entry, biome);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  } catch {
    return fallbackMesh(entry, biome);
  }
}

export async function createPickupEntity(
  index: number,
  entry: AssetManifestEntry,
  biome: BiomeType,
  position: Vector3,
): Promise<PickupEntity> {
  const mesh = await loadVisual(entry, biome);
  mesh.position.copy(position);

  return {
    id: `pickup-${index}`,
    assetId: entry.id,
    radius: entry.pickupRadius,
    mass: entry.mass,
    valueTier: entry.valueTier,
    biome,
    position: position.clone(),
    attachOffset: new Vector3(),
    attached: false,
    mesh,
  };
}
