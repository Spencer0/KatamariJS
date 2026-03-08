import {
  Box3,
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Sphere,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssetManifestEntry, BiomeType, PickupEntity } from '../game/types';

const loader = new GLTFLoader();
const tempBox = new Box3();
const tempSphere = new Sphere();

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

function markRenderable(root: Object3D): void {
  root.traverse((node: Object3D) => {
    if (node instanceof Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function calibrateVisualRadius(root: Object3D, fallback: number): number {
  tempBox.setFromObject(root);
  if (tempBox.isEmpty()) {
    return fallback;
  }
  tempBox.getBoundingSphere(tempSphere);
  return Math.max(fallback * 0.65, tempSphere.radius);
}

function meshMinY(root: Object3D): number {
  tempBox.setFromObject(root);
  if (tempBox.isEmpty()) {
    return -0.5;
  }
  return tempBox.min.y;
}

function normalizeMeshToRadius(root: Object3D, targetRadius: number): void {
  tempBox.setFromObject(root);
  if (tempBox.isEmpty()) {
    return;
  }
  tempBox.getBoundingSphere(tempSphere);
  if (tempSphere.radius <= 0.0001) {
    return;
  }

  const scaleFactor = targetRadius / tempSphere.radius;
  root.scale.multiplyScalar(scaleFactor);
}

async function loadVisual(entry: AssetManifestEntry, biome: BiomeType): Promise<Object3D> {
  try {
    const glbPath = entry.glbPath.startsWith('/') ? entry.glbPath.slice(1) : entry.glbPath;
    const glbUrl = new URL(glbPath, window.location.origin + import.meta.env.BASE_URL).toString();
    const gltf = await loader.loadAsync(glbUrl);
    const root = gltf.scene;
    root.scale.setScalar(entry.scale);
    markRenderable(root);
    return root;
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
  const collisionRadius = entry.physicsRadius ?? entry.pickupRadius;
  const desiredVisualRadius = collisionRadius * (entry.visualScaleFix ?? 1);
  normalizeMeshToRadius(mesh, desiredVisualRadius);
  mesh.position.copy(position);

  const visualRadius = calibrateVisualRadius(mesh, desiredVisualRadius);
  const minY = meshMinY(mesh);
  const groundOffset = -(minY + collisionRadius) + (entry.groundingOffset ?? 0);

  return {
    id: `pickup-${index}`,
    assetId: entry.id,
    radius: collisionRadius,
    visualRadius,
    mass: entry.mass,
    valueTier: entry.valueTier,
    biome,
    position: position.clone(),
    attachOffset: new Vector3(),
    attached: false,
    mesh,
    attachDepth: entry.attachDepth ?? 0.03,
    inertiaBias: entry.inertiaBias ?? 1,
    massDistributionClass: entry.massDistributionClass ?? 'balanced',
    visualScaleFix: entry.visualScaleFix ?? 1,
    spawnSector: '',
    groundOffset,
    sizeTier: entry.sizeTier ?? 'small',
  };
}
