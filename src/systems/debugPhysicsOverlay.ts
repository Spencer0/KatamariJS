import {
  ArrowHelper,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Sprite,
  SpriteMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
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
  private pickupGroundGroup = new Group();
  private pickupLabelGroup = new Group();
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
    this.pickupGroundGroup.visible = false;
    this.pickupLabelGroup.visible = false;
    scene.add(this.group, this.pickupGroup, this.pickupGroundGroup, this.pickupLabelGroup);
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
    this.pickupGroundGroup.visible = this.pickupBoundsVisible;
    this.pickupLabelGroup.visible = this.pickupBoundsVisible;
    return this.pickupBoundsVisible;
  }

  private makeLabelSprite(text: string): Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallback = new Sprite(new SpriteMaterial({ color: '#ffffff' }));
      return fallback;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new CanvasTexture(canvas);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true;

    const material = new SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new Sprite(material);
    sprite.scale.set(2.8, 0.7, 1);
    sprite.userData.labelText = text;
    return sprite;
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
        const groundMarker = new Mesh(
          new SphereGeometry(0.25, 8, 8),
          new MeshBasicMaterial({ color: '#ffd43b', wireframe: true }),
        );
        this.pickupGroundGroup.add(groundMarker);
        this.pickupLabelGroup.add(this.makeLabelSprite('pickup'));
      }

      for (let i = 0; i < this.pickupGroup.children.length; i += 1) {
        const marker = this.pickupGroup.children[i] as Mesh;
        const groundMarker = this.pickupGroundGroup.children[i] as Mesh;
        let label = this.pickupLabelGroup.children[i] as Sprite;
        const pickup = world.pickups[i];
        if (!pickup || pickup.attached) {
          marker.visible = false;
          groundMarker.visible = false;
          label.visible = false;
          continue;
        }
        marker.visible = true;
        marker.position.copy(pickup.mesh.position);
        marker.scale.setScalar(pickup.radius);
        groundMarker.visible = true;
        groundMarker.position.copy(pickup.mesh.position).normalize().multiplyScalar(world.config.worldGeometry.planetRadius);
        groundMarker.scale.setScalar(Math.max(0.12, pickup.radius * 0.2));
        label.visible = true;
        if (label.userData.labelText !== pickup.assetId) {
          this.pickupLabelGroup.remove(label);
          label = this.makeLabelSprite(pickup.assetId);
          this.pickupLabelGroup.children[i] = label;
          this.pickupLabelGroup.add(label);
        }
        label.position.copy(pickup.mesh.position).add(new Vector3(0, pickup.radius + 0.65, 0));
      }
    }
  }
}
