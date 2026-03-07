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
import type { AssetManifestEntry, PickupEntity } from '../game/types';

const loader = new GLTFLoader();

function fallbackMesh(entry: AssetManifestEntry): Mesh {
  const geometry = entry.tags.includes('prop')
    ? new BoxGeometry(entry.pickupRadius * 2, entry.pickupRadius * 2, entry.pickupRadius * 2)
    : new SphereGeometry(entry.pickupRadius, 16, 16);
  const material = new MeshStandardMaterial({ color: new Color().setHSL(Math.random(), 0.7, 0.5) });
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

async function loadVisual(entry: AssetManifestEntry): Promise<Mesh> {
  try {
    const glbPath = entry.glbPath.startsWith('/') ? entry.glbPath.slice(1) : entry.glbPath;
    const glbUrl = new URL(glbPath, window.location.origin + import.meta.env.BASE_URL).toString();
    const gltf = await loader.loadAsync(glbUrl);
    gltf.scene.scale.setScalar(entry.scale);
    const mesh = firstMesh(gltf.scene);
    if (!mesh) {
      return fallbackMesh(entry);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  } catch {
    return fallbackMesh(entry);
  }
}

export async function createPickupEntity(
  index: number,
  entry: AssetManifestEntry,
  position: Vector3,
): Promise<PickupEntity> {
  const mesh = await loadVisual(entry);
  mesh.position.copy(position);

  return {
    id: `pickup-${index}`,
    assetId: entry.id,
    radius: entry.pickupRadius,
    mass: entry.mass,
    valueTier: entry.valueTier,
    position: position.clone(),
    attachOffset: new Vector3(),
    attached: false,
    mesh,
  };
}
