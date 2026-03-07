import { Vector3 } from 'three';
import type { Camera, Mesh } from 'three';
import type { WorldState } from '../game/types';

const desiredOffset = new Vector3(0, 5.5, 8.5);
const lookAtOffset = new Vector3(0, 1.3, 0);
const tempTarget = new Vector3();
const tempPosition = new Vector3();

export class CameraSystem {
  constructor(private readonly camera: Camera, private readonly playerMesh: Mesh) {}

  update(dt: number, world: WorldState): void {
    desiredOffset.x += world.input.cameraX * dt * 4;
    desiredOffset.z += world.input.cameraY * dt * 2;
    desiredOffset.z = Math.max(5, Math.min(11, desiredOffset.z));
    desiredOffset.x = Math.max(-4, Math.min(4, desiredOffset.x));

    tempTarget.copy(this.playerMesh.position).add(lookAtOffset);
    tempPosition.copy(this.playerMesh.position).add(desiredOffset);

    this.camera.position.lerp(tempPosition, 0.08);
    this.camera.lookAt(tempTarget);
  }
}
