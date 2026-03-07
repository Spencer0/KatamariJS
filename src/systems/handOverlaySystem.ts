import {
  ArrowHelper,
  Color,
  MeshBasicMaterial,
  Object3D,
  Vector3,
  type Camera,
} from 'three';
import type { Scene } from 'three';
import type { WorldState } from '../game/types';

const radialUp = new Vector3();
const cameraForward = new Vector3();
const worldLeftAnchor = new Vector3();
const worldRightAnchor = new Vector3();
const worldLeftForce = new Vector3();
const worldRightForce = new Vector3();

function setArrowOpacity(arrow: ArrowHelper, opacity: number): void {
  const lineMat = arrow.line.material as MeshBasicMaterial;
  const coneMat = arrow.cone.material as MeshBasicMaterial;
  lineMat.transparent = true;
  coneMat.transparent = true;
  lineMat.opacity = opacity;
  coneMat.opacity = opacity;
}

export class HandOverlaySystem {
  private readonly leftArrow = new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), 1.4, new Color('#ffd8a8').getHex());
  private readonly rightArrow = new ArrowHelper(new Vector3(0, 0, 1), new Vector3(), 1.4, new Color('#a5d8ff').getHex());
  private leftAlpha = 0;
  private rightAlpha = 0;

  constructor(
    scene: Scene,
    private readonly playerBody: Object3D,
    private readonly camera: Camera,
  ) {
    setArrowOpacity(this.leftArrow, 0);
    setArrowOpacity(this.rightArrow, 0);
    this.leftArrow.visible = false;
    this.rightArrow.visible = false;
    scene.add(this.leftArrow, this.rightArrow);
  }

  update(dt: number, world: WorldState): void {
    radialUp.copy(this.playerBody.position).normalize();
    this.camera.getWorldDirection(cameraForward);
    cameraForward.multiplyScalar(-1).projectOnPlane(radialUp);
    if (cameraForward.lengthSq() < 1e-6) {
      cameraForward.copy(world.player.heading).projectOnPlane(radialUp);
    }
    if (cameraForward.lengthSq() < 1e-6) {
      cameraForward.set(0, 0, 1).projectOnPlane(radialUp);
    }
    cameraForward.normalize();

    worldLeftAnchor.copy(world.player.handContact.leftAnchor).applyQuaternion(world.player.orientation);
    worldRightAnchor.copy(world.player.handContact.rightAnchor).applyQuaternion(world.player.orientation);
    worldLeftForce.copy(world.player.handContact.leftForceDir).projectOnPlane(worldLeftAnchor);
    worldRightForce.copy(world.player.handContact.rightForceDir).projectOnPlane(worldRightAnchor);

    if (worldLeftForce.lengthSq() < 1e-6) {
      worldLeftForce.copy(cameraForward);
    } else {
      worldLeftForce.normalize();
    }
    if (worldRightForce.lengthSq() < 1e-6) {
      worldRightForce.copy(cameraForward);
    } else {
      worldRightForce.normalize();
    }

    this.leftAlpha = Math.max(0, Math.min(1, this.leftAlpha + (world.player.handContact.leftActive ? dt * 10 : -dt * 6)));
    this.rightAlpha = Math.max(0, Math.min(1, this.rightAlpha + (world.player.handContact.rightActive ? dt * 10 : -dt * 6)));

    this.leftArrow.visible = this.leftAlpha > 0.01;
    this.rightArrow.visible = this.rightAlpha > 0.01;

    this.leftArrow.position.copy(this.playerBody.position).addScaledVector(worldLeftAnchor, world.player.radius * 1.06);
    this.rightArrow.position.copy(this.playerBody.position).addScaledVector(worldRightAnchor, world.player.radius * 1.06);
    this.leftArrow.setDirection(worldLeftForce);
    this.rightArrow.setDirection(worldRightForce);
    this.leftArrow.setLength(Math.max(0.8, world.player.radius * 0.95), 0.24, 0.12);
    this.rightArrow.setLength(Math.max(0.8, world.player.radius * 0.95), 0.24, 0.12);
    setArrowOpacity(this.leftArrow, this.leftAlpha * 0.55);
    setArrowOpacity(this.rightArrow, this.rightAlpha * 0.55);
  }
}

