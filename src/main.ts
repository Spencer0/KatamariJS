import './style.css';
import { Game } from './game/game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App root not found');
}

const game = new Game(app);
void game.start();

window.addEventListener('beforeunload', () => {
  game.dispose();
});
