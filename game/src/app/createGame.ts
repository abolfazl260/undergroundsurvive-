import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { GAME_VIEW } from './viewport';
import { backingSize, selectRenderDensity } from './renderQuality';

export function createGame(scene: GameScene): Phaser.Game {
  const host = document.querySelector<HTMLElement>('#game-canvas');
  const measure = () => ({
    width: Math.max(1, host?.clientWidth || window.innerWidth || GAME_VIEW.width),
    height: Math.max(1, host?.clientHeight || window.innerHeight || GAME_VIEW.height)
  });
  const initialSize = measure();
  const density = selectRenderDensity(window.devicePixelRatio || 1, initialSize.width, initialSize.height);
  const pixels = backingSize(initialSize.width, initialSize.height, density);

  // Phaser 3.90 does not support the old GameConfig.resolution switch.
  // NONE + reciprocal canvas zoom creates a genuine HiDPI framebuffer and
  // keeps Phaser pointer coordinates in the same physical-pixel space.
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: pixels.width,
    height: pixels.height,
    backgroundColor: '#101d2d',
    render: { pixelArt: false, antialias: true },
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / density, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [scene]
  });

  const resize = () => {
    const size = measure();
    const next = backingSize(size.width, size.height, density);
    if (game.scale.width !== next.width || game.scale.height !== next.height) {
      game.scale.resize(next.width, next.height);
    }
  };
  const observer = host && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(host!);
  window.addEventListener('resize', resize, { passive: true });
  game.events.once('destroy', () => {
    observer?.disconnect();
    window.removeEventListener('resize', resize);
  });
  return game;
}
