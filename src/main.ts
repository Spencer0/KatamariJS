import './style.css';
import { Game } from './game/game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App root not found');
}

const game = new Game(app);
void game.start();

interface DebugWindow extends Window {
  __katamariDebug?: {
    forceWaterFall: () => void;
    phase: () => string;
  };
}

(window as DebugWindow).__katamariDebug = {
  forceWaterFall: () => game.debugForceWaterFall(),
  phase: () => game.debugPhase(),
};

window.addEventListener('beforeunload', () => {
  game.dispose();
});
