import type { WorldState } from '../game/types';

export interface HudElements {
  root: HTMLDivElement;
  score: HTMLSpanElement;
  radius: HTMLSpanElement;
  target: HTMLSpanElement;
  phase: HTMLDivElement;
}

export function createHud(container: HTMLElement): HudElements {
  const root = document.createElement('div');
  root.className = 'hud';

  const score = document.createElement('span');
  const radius = document.createElement('span');
  const target = document.createElement('span');
  const phase = document.createElement('div');
  phase.className = 'phase';

  root.append(score, radius, target, phase);
  container.append(root);

  return { root, score, radius, target, phase };
}

export class UISystem {
  constructor(private readonly hud: HudElements) {}

  update(world: WorldState): void {
    this.hud.score.textContent = `Score: ${world.player.score}`;
    this.hud.radius.textContent = `Radius: ${world.player.radius.toFixed(2)}`;
    this.hud.target.textContent = `Goal: ${world.config.targetWinRadius.toFixed(2)}`;

    if (world.phase === 'won') {
      this.hud.phase.textContent = 'You won. Press R to restart.';
    } else if (world.phase === 'playing') {
      this.hud.phase.textContent = 'Roll and absorb smaller objects.';
    } else {
      this.hud.phase.textContent = 'Loading world...';
    }
  }
}
