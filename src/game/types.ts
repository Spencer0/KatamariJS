import type { Mesh, Vector3 } from 'three';

export type AssetCategory = 'pickup' | 'prop' | 'environment';
export type AssetStatus = 'active' | 'deprecated';

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
}

export interface GameConfig {
  targetWinRadius: number;
  pickupAttachFactor: number;
  baseRadius: number;
  baseMass: number;
  moveAcceleration: number;
  maxSpeed: number;
  drag: number;
  boostMultiplier: number;
  growthFactor: number;
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
}

export type GamePhase = 'loading' | 'playing' | 'won';

export interface WorldState {
  config: GameConfig;
  phase: GamePhase;
  input: InputState;
  player: PlayerBallState;
  pickups: PickupEntity[];
  elapsed: number;
}
