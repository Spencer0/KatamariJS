import type { Mesh, Vector3 } from 'three';

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
  boost: boolean;
}

export interface PickupEntity {
  id: string;
  assetId: string;
  radius: number;
  mass: number;
  valueTier: number;
  biome: BiomeType;
  position: Vector3;
  attachOffset: Vector3;
  attached: boolean;
  mesh: Mesh;
}

export interface PlayerBallState {
  radius: number;
  mass: number;
  velocity: Vector3;
  score: number;
  attachedPickups: PickupEntity[];
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
