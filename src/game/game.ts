import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import { createPickupEntity } from '../entities/pickupFactory';
import { getActivePickups, loadAssetManifest } from './manifest';
import { createInitialWorld } from './world';
import { CameraSystem } from '../systems/cameraSystem';
import { GrowthSystem } from '../systems/growthSystem';
import { InputSystem } from '../systems/inputSystem';
import { MovementSystem } from '../systems/movementSystem';
import { PickupSystem } from '../systems/pickupSystem';
import { createHud, UISystem } from '../systems/uiSystem';

export class Game {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);
  private readonly world = createInitialWorld();
  private readonly playerMesh: Mesh;
  private lastFrameTime = 0;

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
    this.renderer.setClearColor(new Color('#a5d8ff'));
    this.renderer.shadowMap.enabled = true;
    this.root.append(this.renderer.domElement);

    this.playerMesh = new Mesh(
      new SphereGeometry(this.world.config.baseRadius, 24, 24),
      new MeshStandardMaterial({ color: '#4c6ef5', roughness: 0.5, metalness: 0.15 }),
    );
    this.playerMesh.castShadow = true;
    this.playerMesh.receiveShadow = true;
    this.scene.add(this.playerMesh);

    const floor = new Mesh(
      new PlaneGeometry(80, 80),
      new MeshStandardMaterial({ color: '#94d82d', roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ambient = new AmbientLight('#ffffff', 0.6);
    this.scene.add(ambient);
    const directional = new DirectionalLight('#ffffff', 1.2);
    directional.position.set(10, 15, 6);
    directional.castShadow = true;
    this.scene.add(directional);

    this.camera.position.set(0, 6, 9);

    this.inputSystem = new InputSystem(this.renderer.domElement);
    this.movementSystem = new MovementSystem(this.playerMesh);
    this.pickupSystem = new PickupSystem(this.playerMesh);
    this.growthSystem = new GrowthSystem(this.playerMesh);
    this.cameraSystem = new CameraSystem(this.camera, this.playerMesh);
    this.uiSystem = new UISystem(createHud(this.root));

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onGlobalKeyDown);
  }

  async start(): Promise<void> {
    try {
      await this.spawnPickups();
    } catch (error) {
      console.error('Spawn failed, continuing with empty world.', error);
    }
    this.world.phase = 'playing';
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  dispose(): void {
    this.inputSystem.dispose();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  private async spawnPickups(): Promise<void> {
    const manifestUrl = new URL('assets/assets.manifest.json', window.location.origin + import.meta.env.BASE_URL).toString();
    const entries = await loadAssetManifest(manifestUrl);
    const pickups = getActivePickups(entries);
    let index = 0;

    for (const row of Array.from({ length: 6 }, (_, i) => i)) {
      for (const col of Array.from({ length: 8 }, (_, i) => i)) {
        const entry = pickups[(index + row + col) % pickups.length];
        const x = (col - 3.5) * 3.5;
        const z = (row - 2.5) * 3.3;
        const entity = await createPickupEntity(index, entry, this.playerMesh.position.clone().set(x, entry.pickupRadius, z));
        this.world.pickups.push(entity);
        this.scene.add(entity.mesh);
        index += 1;
      }
    }
  }

  private loop = (time: number): void => {
    const dt = Math.min(0.033, (time - this.lastFrameTime) / 1000);
    this.lastFrameTime = time;
    this.world.elapsed += dt;

    if (this.world.phase !== 'loading') {
      this.inputSystem.update(this.world.input);
      if (this.world.phase === 'playing') {
        this.movementSystem.update(dt, this.world);
        this.pickupSystem.update(this.world);
        this.growthSystem.update(this.world);
      }
      this.cameraSystem.update(dt, this.world);
      this.uiSystem.update(this.world);
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyR' && this.world.phase === 'won') {
      window.location.reload();
    }
  };
}
