import { biomeForPosition } from '../game/logic';
import type { WorldState } from '../game/types';

export interface HudElements {
  root: HTMLDivElement;
  score: HTMLSpanElement;
  radius: HTMLSpanElement;
  angularVelocity: HTMLSpanElement;
  linearVelocity: HTMLSpanElement;
  speedRatio: HTMLSpanElement;
  heading: HTMLSpanElement;
  target: HTMLSpanElement;
  biome: HTMLSpanElement;
  phase: HTMLDivElement;
  loadingBar: HTMLDivElement;
  loadingLabel: HTMLDivElement;
  pauseMenu: HTMLDivElement;
  muteButton: HTMLButtonElement;
}

interface HudHandlers {
  onReset: () => void;
  onToggleMute: () => void;
}

export function createHud(container: HTMLElement, handlers: HudHandlers): HudElements {
  const root = document.createElement('div');
  root.className = 'hud';

  const score = document.createElement('span');
  const radius = document.createElement('span');
  const angularVelocity = document.createElement('span');
  const linearVelocity = document.createElement('span');
  const speedRatio = document.createElement('span');
  const heading = document.createElement('span');
  const target = document.createElement('span');
  const biome = document.createElement('span');
  const phase = document.createElement('div');
  phase.className = 'phase';

  const loadingShell = document.createElement('div');
  loadingShell.className = 'loading-shell';
  const loadingBar = document.createElement('div');
  loadingBar.className = 'loading-bar';
  loadingShell.append(loadingBar);
  const loadingLabel = document.createElement('div');
  loadingLabel.className = 'loading-label';

  root.append(score, radius, angularVelocity, linearVelocity, speedRatio, heading, target, biome, phase, loadingLabel, loadingShell);

  const pauseMenu = document.createElement('div');
  pauseMenu.className = 'pause-menu hidden';

  const pauseTitle = document.createElement('h2');
  pauseTitle.textContent = 'Paused';

  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset';
  resetButton.addEventListener('click', handlers.onReset);

  const muteButton = document.createElement('button');
  muteButton.textContent = 'Mute: Off';
  muteButton.addEventListener('click', handlers.onToggleMute);

  pauseMenu.append(pauseTitle, resetButton, muteButton);
  container.append(root, pauseMenu);

  return {
    root,
    score,
    radius,
    angularVelocity,
    linearVelocity,
    speedRatio,
    heading,
    target,
    biome,
    phase,
    loadingBar,
    loadingLabel,
    pauseMenu,
    muteButton,
  };
}

export class UISystem {
  constructor(private readonly hud: HudElements) {}

  update(world: WorldState): void {
    this.hud.score.textContent = `Score: ${world.player.score}`;
    this.hud.radius.textContent = `Radius: ${world.player.radius.toFixed(2)}`;
    this.hud.angularVelocity.textContent = `Angular Vel: ${world.player.angularVelocity.length().toFixed(2)} rad/s`;
    this.hud.linearVelocity.textContent = `Linear Vel: ${world.player.velocity.length().toFixed(2)} u/s`;
    this.hud.speedRatio.textContent = `Speed Ratio: ${(world.player.velocity.length() / Math.max(0.001, world.player.radius)).toFixed(2)}`;
    this.hud.heading.textContent = `Heading: (${world.player.heading.x.toFixed(2)}, ${world.player.heading.z.toFixed(2)})`;
    this.hud.target.textContent = `Goal: ${world.config.targetWinRadius.toFixed(2)}`;
    this.hud.biome.textContent = `Biome: ${biomeForPosition(world.playerPosition).toUpperCase()}`;

    const pct = world.loading.total > 0 ? (world.loading.loaded / world.loading.total) * 100 : 0;
    this.hud.loadingBar.style.width = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
    this.hud.loadingLabel.textContent = `${world.loading.stageLabel} (${Math.round(pct)}%)`;

    if (world.phase === 'loading') {
      this.hud.phase.textContent = 'Loading...';
    } else if (world.phase === 'won') {
      this.hud.phase.textContent = 'You won. Press Esc for reset.';
    } else if (world.phase === 'respawning') {
      this.hud.phase.textContent = 'Respawning after water fall...';
    } else if (world.phase === 'paused') {
      this.hud.phase.textContent = 'Paused';
    } else {
      this.hud.phase.textContent = 'Roll around the planet. Avoid water.';
    }

    const shouldShowLoader = world.phase === 'loading';
    this.hud.loadingBar.parentElement?.classList.toggle('hidden', !shouldShowLoader);
    this.hud.loadingLabel.classList.toggle('hidden', !shouldShowLoader);

    this.hud.pauseMenu.classList.toggle('hidden', world.phase !== 'paused');
    this.hud.muteButton.textContent = `Mute: ${world.isMuted ? 'On' : 'Off'}`;
  }
}
