import type { Matrix3, Object3D, Quaternion, Vector3 } from 'three';

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
  sizeTier?: 'small' | 'medium' | 'large' | 'mega';
  spawnWeight?: number;
  groundingOffset?: number;
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

export interface PickupDensityConfig {
  activeCap: number;
  minActive: number;
  spawnBatchSize: number;
  keepAliveAngleDeg: number;
  spawnAngleDeg: number;
  refillIntervalSec: number;
  pickupDensityPerBiome: Record<BiomeType, number>;
}

export interface GrowthTier {
  id: 'starter' | 'small' | 'medium' | 'large' | 'mega';
  minPlayerRadius: number;
  maxPickupRadius: number;
  massGainMultiplier: number;
  scoreMultiplier: number;
}

export interface MovementTuning {
  accelCurveByRadius: CurvePoint[];
  dragCurveByRadius: CurvePoint[];
  maxSpeedCurveByRadius: CurvePoint[];
  targetLinearSpeedCurveByRadius: CurvePoint[];
  settleTorque: number;
  contactDamping: number;
  maxAngularSpeed: number;
  supportSampleCount: number;
  torqueStrength: number;
  handContactDownDeg: number;
  handContactTowardCameraDeg: number;
  handContactLateralDeg: number;
  handForceStrength: number;
  spinAssist: number;
  headingResponsiveness: number;
  inputDeadzone: number;
  cameraHeadingLag: number;
  driveResponse: number;
  driveDamping: number;
  coastDamping: number;
  maxSpeedHeadroomPct: number;
  baseFollowDistance: number;
  distanceScale: number;
  cameraDistanceExponent: number;
  baseFollowHeight: number;
  heightScale: number;
  cameraHeightExponent: number;
  speedRadiusScale: number;
  speedRadiusExponent: number;
}

export interface GameConfig {
  targetWinRadius: number;
  pickupAttachFactor: number;
  baseRadius: number;
  baseMass: number;
  boostMultiplier: number;
  growthFactor: number;
  worldGeometry: WorldGeometryConfig;
  pickupDensity: PickupDensityConfig;
  growthTiers: GrowthTier[];
  movementTuning: MovementTuning;
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

export interface HandContactDebugState {
  leftAnchor: Vector3;
  rightAnchor: Vector3;
  leftForceDir: Vector3;
  rightForceDir: Vector3;
  leftActive: boolean;
  rightActive: boolean;
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
  mesh: Object3D;
  attachDepth: number;
  inertiaBias: number;
  massDistributionClass: 'balanced' | 'topheavy' | 'elongated';
  visualScaleFix: number;
  spawnSector: string;
  groundOffset: number;
  sizeTier: 'small' | 'medium' | 'large' | 'mega';
}

export interface PlayerBallState {
  radius: number;
  mass: number;
  velocity: Vector3;
  angularVelocity: Vector3;
  heading: Vector3;
  intentDirection: Vector3;
  handContact: HandContactDebugState;
  orientation: Quaternion;
  comLocal: Vector3;
  inertiaLocal: Matrix3;
  score: number;
  attachedPickups: PickupEntity[];
  composite: CompositeBodyState;
  rollingContact: RollingContactState;
}

export type GamePhase = 'loading' | 'playing' | 'paused' | 'won';

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
