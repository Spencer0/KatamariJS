import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { createPickupEntity } from '../entities/pickupFactory';
import { computeHandContactState } from './compositePhysics';
import { biomeForPosition } from './logic';
import { getActivePickups, loadAssetManifest, loadAudioManifest, pickEntriesForBiome } from './manifest';
import { createInitialWorld } from './world';
import { CameraSystem } from '../systems/cameraSystem';
import { GrowthSystem } from '../systems/growthSystem';
import { InputSystem } from '../systems/inputSystem';
import { MovementSystem } from '../systems/movementSystem';
import { PickupSystem } from '../systems/pickupSystem';
import { createHud, UISystem } from '../systems/uiSystem';
import { AudioSystem } from '../systems/audioSystem';
import { DebugPhysicsOverlay } from '../systems/debugPhysicsOverlay';
import { HandOverlaySystem } from '../systems/handOverlaySystem';
import type { AssetManifestEntry, BiomeType, PickupEntity } from './types';

const tempPlayerDir = new Vector3();
const tempDir = new Vector3();
const tangentA = new Vector3();
const tangentB = new Vector3();
const worldForward = new Vector3(0, 0, 1);
const alignQuat = new Quaternion();

function baseUrl(path: string): string {
  return new URL(path, window.location.origin + import.meta.env.BASE_URL).toString();
}

function biomeColor(biome: BiomeType): string {
  if (biome === 'forest') {
    return '#2f9e44';
  }
  if (biome === 'city') {
    return '#868e96';
  }
  return '#94d82d';
}

function randomDirectionInBiome(biome: BiomeType): Vector3 {
  const ranges: Record<BiomeType, [number, number]> = {
    forest: [-Math.PI, -Math.PI / 3],
    city: [-Math.PI / 3, Math.PI / 3],
    suburb: [Math.PI / 3, Math.PI],
  };

  const [minLon, maxLon] = ranges[biome];
  const lon = minLon + Math.random() * (maxLon - minLon);
  const lat = (Math.random() * 1.5 - 0.75) * 0.85;
  const r = Math.cos(lat);
  return new Vector3(r * Math.sin(lon), Math.sin(lat), r * Math.cos(lon)).normalize();
}

function randomDirectionAround(centerDir: Vector3, maxAngleRad: number): Vector3 {
  tangentA.copy(centerDir).cross(worldForward);
  if (tangentA.lengthSq() < 1e-6) {
    tangentA.set(1, 0, 0);
  }
  tangentA.normalize();
  tangentB.copy(centerDir).cross(tangentA).normalize();

  const theta = Math.random() * 2 * Math.PI;
  const angle = Math.random() * maxAngleRad;
  const tangent = tangentA.clone().multiplyScalar(Math.cos(theta)).addScaledVector(tangentB, Math.sin(theta)).normalize();

  return centerDir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent, Math.sin(angle)).normalize();
}

function weightedEntry(pool: AssetManifestEntry[]): AssetManifestEntry {
  let totalWeight = 0;
  for (const entry of pool) {
    totalWeight += entry.spawnWeight ?? 1;
  }

  let cursor = Math.random() * totalWeight;
  for (const entry of pool) {
    cursor -= entry.spawnWeight ?? 1;
    if (cursor <= 0) {
      return entry;
    }
  }

  return pool[pool.length - 1];
}

function sectorKey(direction: Vector3): string {
  const lon = Math.atan2(direction.x, direction.z);
  const lat = Math.asin(direction.y);
  const lonIndex = Math.floor((lon + Math.PI) / (Math.PI / 12));
  const latIndex = Math.floor((lat + Math.PI / 2) / (Math.PI / 12));
  return `${latIndex}:${lonIndex}`;
}

export class Game {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 8000);
  private readonly world = createInitialWorld();
  private readonly playerBody = new Group();
  private readonly playerCoreMesh: Mesh;
  private readonly audioSystem = new AudioSystem();
  private readonly debugOverlay: DebugPhysicsOverlay;

  private readonly inputSystem: InputSystem;
  private readonly movementSystem: MovementSystem;
  private readonly pickupSystem: PickupSystem;
  private readonly growthSystem: GrowthSystem;
  private readonly cameraSystem: CameraSystem;
  private readonly handOverlaySystem: HandOverlaySystem;
  private readonly uiSystem: UISystem;

  private lastFrameTime = 0;
  private isAudioStarted = false;
  private spawnTimer = 0;
  private spawnInFlight = 0;
  private nextPickupId = 0;
  private activePickupEntries: AssetManifestEntry[] = [];

  constructor(private readonly root: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(new Color('#74c0fc'));
    this.renderer.shadowMap.enabled = true;
    this.root.append(this.renderer.domElement);

    this.playerCoreMesh = new Mesh(
      new SphereGeometry(this.world.config.baseRadius, 24, 24),
      new MeshStandardMaterial({ color: '#ffd43b', roughness: 0.45, metalness: 0.2 }),
    );
    this.playerCoreMesh.castShadow = true;
    this.playerCoreMesh.receiveShadow = true;

    this.playerBody.add(this.playerCoreMesh);
    this.playerBody.position.copy(this.world.playerPosition);
    this.playerBody.quaternion.copy(this.world.player.orientation);
    this.scene.add(this.playerBody);

    this.addPlanetVisuals();

    const ambient = new AmbientLight('#ffffff', 0.62);
    this.scene.add(ambient);
    const directional = new DirectionalLight('#ffffff', 1.24);
    directional.position.set(220, 280, 180);
    directional.castShadow = true;
    this.scene.add(directional);

    this.debugOverlay = new DebugPhysicsOverlay(this.scene);

    this.camera.position.set(0, 400, 620);

    this.inputSystem = new InputSystem(this.renderer.domElement);
    this.movementSystem = new MovementSystem(this.playerBody, this.camera);
    this.pickupSystem = new PickupSystem(this.playerBody);
    this.growthSystem = new GrowthSystem(this.playerCoreMesh);
    this.cameraSystem = new CameraSystem(this.camera, this.playerBody);
    this.handOverlaySystem = new HandOverlaySystem(this.scene, this.playerBody, this.camera);
    this.uiSystem = new UISystem(
      createHud(this.root, {
        onReset: this.reset,
        onToggleMute: this.toggleMute,
      }),
    );

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onGlobalKeyDown);
    window.addEventListener('pointerdown', this.tryStartAudio, { once: true });
  }

  async start(): Promise<void> {
    try {
      await this.bootstrapRuntime();
    } catch (error) {
      console.error('Startup failure, continuing with minimal world.', error);
      this.world.loading.stageLabel = 'Fallback startup';
      this.world.loading.loaded = this.world.loading.total;
    }

    this.world.phase = 'playing';
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  dispose(): void {
    this.inputSystem.dispose();
    this.audioSystem.dispose();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  private async bootstrapRuntime(): Promise<void> {
    this.world.loading.stageLabel = 'Loading manifests';
    this.world.loading.total = 3;
    this.world.loading.loaded = 0;

    const entries = await loadAssetManifest(baseUrl('assets/assets.manifest.json'));
    this.activePickupEntries = getActivePickups(entries);
    this.world.loading.loaded += 1;

    const tracks = await loadAudioManifest(baseUrl('assets/audio.manifest.json'));
    this.world.loading.loaded += 1;

    this.world.loading.stageLabel = 'Seeding world density';
    await this.seedInitialPickups();
    this.world.loading.loaded += 1;

    const activeTrack = tracks.find((t) => t.status === 'active');
    if (activeTrack) {
      await this.audioSystem.loadAndStart(activeTrack);
      this.isAudioStarted = true;
    }
    this.audioSystem.setMuted(this.world.isMuted);

    this.world.loading.loaded = this.world.loading.total;
    this.world.loading.stageLabel = 'Ready';
  }

  private addPlanetVisuals(): void {
    const radius = this.world.config.worldGeometry.planetRadius;
    const widthSeg = 96;
    const heightSeg = 96;

    const sectorDefs: Array<{ biome: BiomeType; phiStart: number; phiLength: number }> = [
      { biome: 'forest', phiStart: 0, phiLength: (2 * Math.PI) / 3 },
      { biome: 'city', phiStart: (2 * Math.PI) / 3, phiLength: (2 * Math.PI) / 3 },
      { biome: 'suburb', phiStart: (4 * Math.PI) / 3, phiLength: (2 * Math.PI) / 3 },
    ];

    for (const sector of sectorDefs) {
      const shell = new Mesh(
        new SphereGeometry(radius, widthSeg, heightSeg, sector.phiStart, sector.phiLength),
        new MeshStandardMaterial({ color: biomeColor(sector.biome), roughness: 1, metalness: 0.03 }),
      );
      shell.receiveShadow = true;
      this.scene.add(shell);
    }
  }

  private alignPickupToSurface(entity: PickupEntity, direction: Vector3): void {
    alignQuat.setFromUnitVectors(new Vector3(0, 1, 0), direction);
    entity.mesh.quaternion.copy(alignQuat);
    entity.mesh.rotateOnAxis(direction, Math.random() * Math.PI * 2);
    entity.mesh.position.copy(
      direction.multiplyScalar(
        this.world.config.worldGeometry.planetRadius + entity.radius + entity.groundOffset,
      ),
    );
    entity.position.copy(entity.mesh.position);
  }

  private async seedInitialPickups(): Promise<void> {
    if (this.activePickupEntries.length === 0) {
      return;
    }

    const seedCount = Math.min(160, Math.floor(this.world.config.pickupDensity.minActive * 0.4));
    for (let i = 0; i < seedCount; i += 1) {
      const biome: BiomeType = i % 3 === 0 ? 'forest' : i % 3 === 1 ? 'city' : 'suburb';
      const direction = randomDirectionInBiome(biome);
      await this.spawnPickupAtDirection(direction);
    }
  }

  private async spawnPickupAtDirection(direction: Vector3): Promise<void> {
    if (this.activePickupEntries.length === 0) {
      return;
    }

    const surfacePosition = direction.clone().multiplyScalar(this.world.config.worldGeometry.planetRadius);
    const biome = biomeForPosition(surfacePosition);
    const pool = pickEntriesForBiome(this.activePickupEntries, biome);
    if (pool.length === 0) {
      return;
    }

    const entry = weightedEntry(pool);
    const entity = await createPickupEntity(this.nextPickupId, entry, biome, new Vector3());
    this.nextPickupId += 1;
    entity.spawnSector = sectorKey(direction);
    this.alignPickupToSurface(entity, direction.clone());
    this.world.pickups.push(entity);
    this.scene.add(entity.mesh);
  }

  private recycleFarPickups(): void {
    const keepAngleRad = (this.world.config.pickupDensity.keepAliveAngleDeg * Math.PI) / 180;
    const keepDot = Math.cos(keepAngleRad);
    tempPlayerDir.copy(this.playerBody.position).normalize();

    this.world.pickups = this.world.pickups.filter((pickup) => {
      if (pickup.attached) {
        return true;
      }
      tempDir.copy(pickup.mesh.position).normalize();
      if (tempDir.dot(tempPlayerDir) >= keepDot) {
        return true;
      }
      this.scene.remove(pickup.mesh);
      return false;
    });
  }

  private maintainPickupDensity(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer < this.world.config.pickupDensity.refillIntervalSec) {
      return;
    }
    this.spawnTimer = 0;

    this.recycleFarPickups();
    if (this.world.pickups.length >= this.world.config.pickupDensity.minActive) {
      return;
    }

    tempPlayerDir.copy(this.playerBody.position).normalize();
    const spawnAngle = (this.world.config.pickupDensity.spawnAngleDeg * Math.PI) / 180;
    const target = Math.min(
      this.world.config.pickupDensity.activeCap,
      this.world.pickups.length + this.world.config.pickupDensity.spawnBatchSize,
    );

    while (this.world.pickups.length + this.spawnInFlight < target && this.spawnInFlight < 24) {
      const direction = randomDirectionAround(tempPlayerDir, spawnAngle);
      this.spawnInFlight += 1;
      void this.spawnPickupAtDirection(direction).finally(() => {
        this.spawnInFlight = Math.max(0, this.spawnInFlight - 1);
      });
    }
  }

  private loop = (time: number): void => {
    const dt = Math.min(0.033, (time - this.lastFrameTime) / 1000);
    this.lastFrameTime = time;
    this.world.elapsed += dt;

    this.inputSystem.update(this.world.input);

    if (this.world.phase === 'playing') {
      this.movementSystem.update(dt, this.world);
      this.world.playerPosition.copy(this.playerBody.position);
      this.pickupSystem.update(this.world);
      this.growthSystem.update(this.world);
      this.maintainPickupDensity(dt);
    }

    if (this.world.phase !== 'paused') {
      this.cameraSystem.update(dt, this.world);
      this.handOverlaySystem.update(dt, this.world);
    }

    this.debugOverlay.update(this.world);
    this.uiSystem.update(this.world);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      this.world.phase = this.world.phase === 'paused' ? 'playing' : 'paused';
      event.preventDefault();
      return;
    }

    if (event.code === 'Backquote') {
      this.debugOverlay.toggle();
      return;
    }

    if (event.code === 'Digit9') {
      this.debugOverlay.togglePickupBounds();
      return;
    }
  };

  private tryStartAudio = async (): Promise<void> => {
    if (this.isAudioStarted) {
      return;
    }

    try {
      const tracks = await loadAudioManifest(baseUrl('assets/audio.manifest.json'));
      const track = tracks.find((t) => t.status === 'active');
      if (track) {
        await this.audioSystem.loadAndStart(track);
        this.audioSystem.setMuted(this.world.isMuted);
        this.isAudioStarted = true;
      }
    } catch {
      // no-op
    }
  };

  private reset = (): void => {
    window.location.reload();
  };

  private toggleMute = (): void => {
    this.world.isMuted = !this.world.isMuted;
    this.audioSystem.setMuted(this.world.isMuted);
  };

  debugForceWaterFall(): void {
    // Water hazards removed. Keep debug hook for e2e compatibility.
    this.world.phase = 'playing';
  }

  debugPhase(): string {
    return this.world.phase;
  }

  debugDriveVector(): {
    forward: number;
    right: number;
    intentForward: number;
    intentRight: number;
    leftActive: boolean;
    rightActive: boolean;
  } {
    const up = this.playerBody.position.clone().normalize();
    const forward = new Vector3();
    this.camera.getWorldDirection(forward);
    forward.multiplyScalar(-1).projectOnPlane(up);
    if (forward.lengthSq() < 1e-6) {
      forward.copy(this.world.player.heading).projectOnPlane(up);
    }
    if (forward.lengthSq() < 1e-6) {
      forward.set(0, 0, 1).projectOnPlane(up);
    }
    forward.normalize();
    const right = up.clone().cross(forward).normalize();
    const velocity = this.world.player.velocity.clone().projectOnPlane(up);
    const intent = this.world.player.intentDirection.clone().projectOnPlane(up);

    return {
      forward: velocity.dot(forward),
      right: velocity.dot(right),
      intentForward: intent.dot(forward),
      intentRight: intent.dot(right),
      leftActive: this.world.player.handContact.leftActive,
      rightActive: this.world.player.handContact.rightActive,
    };
  }

  debugEvaluateHandMapping(
    left: { x: number; y: number },
    rightInput: { x: number; y: number },
  ): { forward: number; right: number; magnitude: number } {
    const up = this.playerBody.position.clone().normalize();
    const forward = new Vector3();
    this.camera.getWorldDirection(forward);
    forward.multiplyScalar(-1).projectOnPlane(up);
    if (forward.lengthSq() < 1e-6) {
      forward.copy(this.world.player.heading).projectOnPlane(up);
    }
    if (forward.lengthSq() < 1e-6) {
      forward.set(0, 0, 1).projectOnPlane(up);
    }
    forward.normalize();
    const right = up.clone().cross(forward).normalize();
    const state = computeHandContactState(
      up,
      forward,
      right,
      left,
      rightInput,
      this.world.config.movementTuning,
    );
    const tangent = state.netForce.projectOnPlane(up);
    return {
      forward: tangent.dot(forward),
      right: tangent.dot(right),
      magnitude: tangent.length(),
    };
  }
}
