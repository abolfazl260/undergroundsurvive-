import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { GAME_VIEW } from './viewport';

export function createGame(scene: GameScene): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: GAME_VIEW.width,
    height: GAME_VIEW.height,
    backgroundColor: '#101d2d',
    render: { pixelArt: false, antialias: true },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [scene]
  });

  // RESIZE also follows browser orientation; observe the actual host for
  // dynamic viewport and safe-area changes that do not fire window.resize.
  const host = document.getElementById('game-canvas');
  if (host && typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      const bounds = host.getBoundingClientRect();
      const width = Math.round(bounds.width);
      const height = Math.round(bounds.height);
      if (width > 0 && height > 0 && (game.scale.width !== width || game.scale.height !== height)) {
        game.scale.resize(width, height);
      }
    });
    observer.observe(host);
    game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect());
  }
  return game;
}

