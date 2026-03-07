import { ArrowHelper, Color, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { Scene } from 'three';
import type { WorldState } from '../game/types';

const comWorld = new Vector3();
const axisX = new Vector3(1, 0, 0);
const axisY = new Vector3(0, 1, 0);
const axisZ = new Vector3(0, 0, 1);
const contactDir = new Vector3();

export class DebugPhysicsOverlay {
  private group = new Group();
  private comMarker = new Mesh(new SphereGeometry(0.08, 10, 10), new MeshBasicMaterial({ color: '#f03e3e' }));
  private axisXArrow = new ArrowHelper(axisX, new Vector3(), 0.8, new Color('#339af0').getHex());
  private axisYArrow = new ArrowHelper(axisY, new Vector3(), 0.8, new Color('#40c057').getHex());
  private axisZArrow = new ArrowHelper(axisZ, new Vector3(), 0.8, new Color('#fab005').getHex());
  private contactArrow = new ArrowHelper(axisY, new Vector3(), 0.9, new Color('#ae3ec9').getHex());

  constructor(scene: Scene) {
    this.group.visible = false;
    this.group.add(this.comMarker, this.axisXArrow, this.axisYArrow, this.axisZArrow, this.contactArrow);
    scene.add(this.group);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  toggle(): boolean {
    this.group.visible = !this.group.visible;
    return this.group.visible;
  }

  update(world: WorldState): void {
    if (!this.group.visible) {
      return;
    }

    comWorld.copy(world.player.comLocal).applyQuaternion(world.player.orientation).add(world.playerPosition);
    this.comMarker.position.copy(comWorld);

    this.axisXArrow.position.copy(world.playerPosition);
    this.axisYArrow.position.copy(world.playerPosition);
    this.axisZArrow.position.copy(world.playerPosition);

    this.axisXArrow.setDirection(axisX.clone().applyQuaternion(world.player.orientation));
    this.axisYArrow.setDirection(axisY.clone().applyQuaternion(world.player.orientation));
    this.axisZArrow.setDirection(axisZ.clone().applyQuaternion(world.player.orientation));

    this.contactArrow.position.copy(world.playerPosition);
    contactDir.copy(world.player.rollingContact.contactPoint).sub(world.playerPosition).normalize();
    this.contactArrow.setDirection(contactDir);
    this.contactArrow.setLength(Math.max(0.5, world.player.rollingContact.effectiveRadius));
  }
}
