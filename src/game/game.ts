import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { createPickupEntity } from '../entities/pickupFactory';
import { estimateRollingContact, recomputeCompositeBody } from './compositePhysics';
import { calculateRadius, isWaterPosition, safeRespawnPosition } from './logic';
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
import type { AssetManifestEntry, BiomeType } from './types';

const planetCenter = new Vector3(0, 0, 0);

function baseUrl(path: string): string {
  return new URL(path, window.location.origin + import.meta.env.BASE_URL).toString();
}

function randomDirectionInBiome(biome: BiomeType): Vector3 {
  const ranges: Record<BiomeType, [number, number]> = {
    forest: [-Math.PI, -Math.PI / 3],
    city: [-Math.PI / 3, Math.PI / 3],
    suburb: [Math.PI / 3, Math.PI],
  };

  const [minLon, maxLon] = ranges[biome];
  const lon = minLon + Math.random() * (maxLon - minLon);
  const lat = (Math.random() * 1.5 - 0.75) * 0.8;
  const r = Math.cos(lat);
  return new Vector3(r * Math.sin(lon), Math.sin(lat), r * Math.cos(lon)).normalize();
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

export class Game {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 600);
  private readonly world = createInitialWorld();
  private readonly playerBody = new Group();
  private readonly playerCoreMesh: Mesh;
  private readonly audioSystem = new AudioSystem();
  private readonly debugOverlay: DebugPhysicsOverlay;

  private lastFrameTime = 0;
  private isAudioStarted = false;

  private readonly inputSystem: InputSystem;
  private readonly movementSystem: MovementSystem;
  private readonly pickupSystem: PickupSystem;
  private readonly growthSystem: GrowthSystem;
  private readonly cameraSystem: CameraSystem;
  private readonly uiSystem: UISystem;

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
    directional.position.set(22, 28, 18);
    directional.castShadow = true;
    this.scene.add(directional);

    this.debugOverlay = new DebugPhysicsOverlay(this.scene);

    this.camera.position.set(0, 60, 80);

    this.inputSystem = new InputSystem(this.renderer.domElement);
    this.movementSystem = new MovementSystem(this.playerBody, this.camera);
    this.pickupSystem = new PickupSystem(this.playerBody);
    this.growthSystem = new GrowthSystem(this.playerCoreMesh);
    this.cameraSystem = new CameraSystem(this.camera, this.playerBody);
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
    this.world.loading.total = 4;
    this.world.loading.loaded = 0;

    const entries = await loadAssetManifest(baseUrl('assets/assets.manifest.json'));
    this.world.loading.loaded += 1;

    const tracks = await loadAudioManifest(baseUrl('assets/audio.manifest.json'));
    this.world.loading.loaded += 1;

    this.world.loading.stageLabel = 'Spawning world pickups';
    await this.spawnPickups(entries);
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

    const waterBand = new Mesh(
      new SphereGeometry(radius + 0.05, widthSeg, heightSeg, 0, 2 * Math.PI, Math.PI * 0.43, Math.PI * 0.14),
      new MeshStandardMaterial({ color: '#1971c2', roughness: 0.12, metalness: 0.22, transparent: true, opacity: 0.82 }),
    );
    this.scene.add(waterBand);
  }

  private async spawnPickups(entries: AssetManifestEntry[]): Promise<void> {
    const activePickups = getActivePickups(entries);
    if (activePickups.length === 0) {
      return;
    }
    const targetCount = Math.min(120, Math.max(48, activePickups.length * 4));
    this.world.loading.total += targetCount;

    for (let i = 0; i < targetCount; i += 1) {
      const biome: BiomeType = i % 3 === 0 ? 'forest' : i % 3 === 1 ? 'city' : 'suburb';
      const biomePool = pickEntriesForBiome(activePickups, biome);
      const entry = biomePool[i % Math.max(1, biomePool.length)] ?? activePickups[i % activePickups.length];

      let direction = randomDirectionInBiome(biome);
      let attempts = 0;
      while (attempts < 6 && isWaterPosition(direction.clone().multiplyScalar(this.world.config.worldGeometry.planetRadius))) {
        direction = randomDirectionInBiome(biome);
        attempts += 1;
      }

      const position = direction.multiplyScalar(this.world.config.worldGeometry.planetRadius + entry.pickupRadius);
      const entity = await createPickupEntity(i, entry, biome, position);
      entity.mesh.lookAt(planetCenter);
      this.world.pickups.push(entity);
      this.scene.add(entity.mesh);
      this.world.loading.loaded += 1;
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
      this.handleHazards();
    }

    if (this.world.phase === 'respawning') {
      this.world.player.velocity.multiplyScalar(0.5);
      this.world.player.angularVelocity.multiplyScalar(0.3);
      this.world.phase = 'playing';
    }

    if (this.world.phase !== 'paused') {
      this.cameraSystem.update(dt, this.world);
    }

    this.debugOverlay.update(this.world);
    this.uiSystem.update(this.world);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  private handleHazards(): void {
    if (!isWaterPosition(this.playerBody.position)) {
      return;
    }

    this.world.phase = 'respawning';
    this.world.player.respawnCount += 1;
    this.world.player.mass *= 1 - this.world.config.respawnPolicy.sizePenaltyPct;
    this.world.player.radius = Math.max(
      this.world.config.baseRadius,
      calculateRadius(this.world.config.baseRadius, this.world.player.mass, this.world.config.growthFactor),
    );

    const next = safeRespawnPosition(
      this.playerBody.position,
      this.world.config.worldGeometry.planetRadius,
      this.world.player.radius,
    );
    this.playerBody.position.copy(next);
    this.world.player.velocity.set(0, 0, 0);
    this.world.player.angularVelocity.set(0, 0, 0);
    this.world.playerPosition.copy(next);
    this.world.player.orientation.identity();
    this.playerBody.quaternion.identity();

    recomputeCompositeBody(this.world.player.composite, this.world.config.baseMass);
    this.world.player.rollingContact = estimateRollingContact(
      this.world.player.composite,
      this.world.player.orientation,
      this.playerBody.position,
      this.playerBody.position.clone().normalize(),
    );
  }

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
    this.playerBody.position.set(this.world.config.worldGeometry.planetRadius + this.world.player.radius, 0, 0);
    this.world.playerPosition.copy(this.playerBody.position);
    this.handleHazards();
  }

  debugPhase(): string {
    return this.world.phase;
  }
}
