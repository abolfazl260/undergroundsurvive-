import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { GAME_VIEW } from './viewport';

export function createGame(scene: GameScene): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: GAME_VIEW.width,
    height: GAME_VIEW.height,
    backgroundColor: '#101d2d',
    render: { pixelArt: false, antialias: true },
    resolution: Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1),
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [scene]
  });
}

