import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { GAME_VIEW } from './viewport';

export function createGame(scene: GameScene): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: GAME_VIEW.width,
    height: GAME_VIEW.height,
    // Keep the canvas sharp on high-density phone screens.
    resolution: typeof window === 'undefined' ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    backgroundColor: '#101d2d',
    render: { pixelArt: false, antialias: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene]
  });
}

