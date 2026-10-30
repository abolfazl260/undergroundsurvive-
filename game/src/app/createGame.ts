import Phaser from 'phaser';
import { GameScene } from './GameScene';

export function createGame(scene: GameScene): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: 960,
    height: 600,
    backgroundColor: '#101d2d',
    render: { pixelArt: false, antialias: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene]
  });
}

