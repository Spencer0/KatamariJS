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
    driveVector: () => {
      forward: number;
      right: number;
      intentForward: number;
      intentRight: number;
      leftActive: boolean;
      rightActive: boolean;
    };
    evaluateMapping: (
      left: { x: number; y: number },
      right: { x: number; y: number },
    ) => { forward: number; right: number; magnitude: number };
  };
}

(window as DebugWindow).__katamariDebug = {
  forceWaterFall: () => game.debugForceWaterFall(),
  phase: () => game.debugPhase(),
  driveVector: () => game.debugDriveVector(),
  evaluateMapping: (left, right) => game.debugEvaluateHandMapping(left, right),
};

window.addEventListener('beforeunload', () => {
  game.dispose();
});
