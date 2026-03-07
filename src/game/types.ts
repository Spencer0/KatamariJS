import type { Matrix3, Mesh, Quaternion, Vector3 } from 'three';

export type AssetCategory = 'pickup' | 'prop' | 'environment';
export type AssetStatus = 'active' | 'deprecated';
export type BiomeType = 'forest' | 'city' | 'suburb';

export interface AssetManifestEntry {
  id: string;
  glbPath: string;
  category: AssetCategory;
  scale: number;
  pickupRadius: number;
  mass: number;
  valueTier: number;
  tags: string[];
  attachPoint?: string;
  status: AssetStatus;
  biome?: BiomeType;
  styleTags?: string[];
  qualityScore?: number;
  physicsRadius?: number;
  massDistributionClass?: 'balanced' | 'topheavy' | 'elongated';
  attachDepth?: number;
  inertiaBias?: number;
  visualScaleFix?: number;
}

export interface AudioTrackManifestEntry {
  id: string;
  path: string;
  loop: boolean;
  volume: number;
  status: AssetStatus;
}

export interface CurvePoint {
  radius: number;
  value: number;
}

export interface WorldGeometryConfig {
  planetRadius: number;
  gravityStrength: number;
  biomeBands: Record<BiomeType, [number, number]>;
}

export interface MovementTuning {
  accelCurveByRadius: CurvePoint[];
  dragCurveByRadius: CurvePoint[];
  maxSpeedCurveByRadius: CurvePoint[];
  settleTorque: number;
  contactDamping: number;
  maxAngularSpeed: number;
  supportSampleCount: number;
  torqueStrength: number;
}

export interface HazardZone {
  type: 'water';
  surfaceMask: 'oceans-and-lakes';
  penalty: number;
}

export interface RespawnPolicy {
  mode: 'quick';
  sizePenaltyPct: number;
  safeSpawnResolver: 'nearest-biome-safe-point';
}

export interface GameConfig {
  targetWinRadius: number;
  pickupAttachFactor: number;
  baseRadius: number;
  baseMass: number;
  boostMultiplier: number;
  growthFactor: number;
  worldGeometry: WorldGeometryConfig;
  movementTuning: MovementTuning;
  hazardZone: HazardZone;
  respawnPolicy: RespawnPolicy;
}

export interface InputState {
  moveX: number;
  moveY: number;
  cameraX: number;
  cameraY: number;
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  boost: boolean;
}

export interface ProtrusionState {
  id: string;
  localOffset: Vector3;
  radius: number;
  mass: number;
  shapeClass: 'round' | 'boxy' | 'elongated';
  inertiaBias: number;
}

export interface RollingContactState {
  contactPoint: Vector3;
  contactNormal: Vector3;
  effectiveRadius: number;
  isStable: boolean;
}

export interface TorqueInputState {
  desiredTangentDir: Vector3;
  magnitude: number;
  assistFactor: number;
}

export interface CompositeBodyState {
  coreRadius: number;
  com: Vector3;
  inertiaTensorLocal: Matrix3;
  principalAxes: Quaternion;
  supportSamples: Vector3[];
  protrusions: ProtrusionState[];
  effectiveRollingRadiusByDir: (dir: Vector3, orientation: Quaternion) => number;
}

export interface PickupEntity {
  id: string;
  assetId: string;
  radius: number;
  visualRadius: number;
  mass: number;
  valueTier: number;
  biome: BiomeType;
  position: Vector3;
  attachOffset: Vector3;
  attached: boolean;
  mesh: Mesh;
  attachDepth: number;
  inertiaBias: number;
  massDistributionClass: 'balanced' | 'topheavy' | 'elongated';
  visualScaleFix: number;
}

export interface PlayerBallState {
  radius: number;
  mass: number;
  velocity: Vector3;
  angularVelocity: Vector3;
  heading: Vector3;
  orientation: Quaternion;
  comLocal: Vector3;
  inertiaLocal: Matrix3;
  score: number;
  attachedPickups: PickupEntity[];
  composite: CompositeBodyState;
  rollingContact: RollingContactState;
  respawnCount: number;
}

export type GamePhase = 'loading' | 'playing' | 'paused' | 'respawning' | 'won';

export interface LoadingProgress {
  total: number;
  loaded: number;
  stageLabel: string;
}

export interface AssetValidationReport {
  assetId: string;
  checks: string[];
  passFail: 'pass' | 'fail';
  notes: string;
}

export interface WorldState {
  config: GameConfig;
  phase: GamePhase;
  input: InputState;
  player: PlayerBallState;
  pickups: PickupEntity[];
  elapsed: number;
  loading: LoadingProgress;
  isMuted: boolean;
  playerPosition: Vector3;
}
