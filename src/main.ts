import './ui/styles.css';
import { Game } from './core/game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

if (import.meta.env.DEV && new URLSearchParams(location.search).has('gallery')) {
  const { runGallery } = await import('./render/fruit/gallery');
  uiRoot.remove();
  runGallery(canvas);
} else {
  const game = new Game(canvas, uiRoot);
  void game.load();
}
