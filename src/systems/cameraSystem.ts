import { Vector3 } from 'three';
import type { Camera, Mesh } from 'three';
import type { WorldState } from '../game/types';

const radialUp = new Vector3();
const tangentForward = new Vector3();
const tangentRight = new Vector3();
const desiredPosition = new Vector3();
const lookTarget = new Vector3();

export class CameraSystem {
  private yaw = 0;
  private pitch = 0.35;

  constructor(private readonly camera: Camera, private readonly playerMesh: Mesh) {}

  update(dt: number, world: WorldState): void {
    radialUp.copy(this.playerMesh.position).normalize();

    tangentForward.copy(world.player.velocity);
    if (tangentForward.lengthSq() < 0.0001) {
      tangentForward.copy(new Vector3(0, 0, 1)).projectOnPlane(radialUp).normalize();
    } else {
      tangentForward.projectOnPlane(radialUp).normalize();
    }

    tangentRight.copy(radialUp).cross(tangentForward).normalize();

    this.yaw += world.input.cameraX * dt * 1.9;
    this.pitch = Math.max(-0.6, Math.min(0.9, this.pitch + world.input.cameraY * dt * 0.9));

    const followDistance = 8 + world.player.radius * 0.4;
    const height = 3.2 + world.player.radius * 0.25;

    const back = tangentForward.clone().multiplyScalar(-followDistance);
    const side = tangentRight.clone().multiplyScalar(Math.sin(this.yaw) * 2.2);
    const up = radialUp.clone().multiplyScalar(height + Math.sin(this.pitch) * 1.5);

    desiredPosition.copy(this.playerMesh.position).add(back).add(side).add(up);
    lookTarget.copy(this.playerMesh.position).add(radialUp.clone().multiplyScalar(world.player.radius * 0.7));

    this.camera.position.lerp(desiredPosition, 0.12);
    this.camera.up.copy(radialUp);
    this.camera.lookAt(lookTarget);
  }
}
