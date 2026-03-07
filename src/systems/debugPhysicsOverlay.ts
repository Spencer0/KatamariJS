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
  private pickupGroup = new Group();
  private pickupBoundsVisible = false;
  private comMarker = new Mesh(new SphereGeometry(0.08, 10, 10), new MeshBasicMaterial({ color: '#f03e3e' }));
  private axisXArrow = new ArrowHelper(axisX, new Vector3(), 0.8, new Color('#339af0').getHex());
  private axisYArrow = new ArrowHelper(axisY, new Vector3(), 0.8, new Color('#40c057').getHex());
  private axisZArrow = new ArrowHelper(axisZ, new Vector3(), 0.8, new Color('#fab005').getHex());
  private contactArrow = new ArrowHelper(axisY, new Vector3(), 0.9, new Color('#ae3ec9').getHex());

  constructor(scene: Scene) {
    this.group.visible = false;
    this.group.add(this.comMarker, this.axisXArrow, this.axisYArrow, this.axisZArrow, this.contactArrow);
    this.pickupGroup.visible = false;
    scene.add(this.group, this.pickupGroup);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  toggle(): boolean {
    this.group.visible = !this.group.visible;
    return this.group.visible;
  }

  togglePickupBounds(): boolean {
    this.pickupBoundsVisible = !this.pickupBoundsVisible;
    this.pickupGroup.visible = this.pickupBoundsVisible;
    return this.pickupBoundsVisible;
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

    if (this.pickupBoundsVisible) {
      while (this.pickupGroup.children.length < Math.min(40, world.pickups.length)) {
        const marker = new Mesh(
          new SphereGeometry(1, 8, 8),
          new MeshBasicMaterial({ color: '#00d8ff', wireframe: true }),
        );
        this.pickupGroup.add(marker);
      }

      for (let i = 0; i < this.pickupGroup.children.length; i += 1) {
        const marker = this.pickupGroup.children[i] as Mesh;
        const pickup = world.pickups[i];
        if (!pickup || pickup.attached) {
          marker.visible = false;
          continue;
        }
        marker.visible = true;
        marker.position.copy(pickup.mesh.position);
        marker.scale.setScalar(pickup.radius);
      }
    }
  }
}
