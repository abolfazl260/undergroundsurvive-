# Audio System — Underground Survive

## Scope

This self-contained audio feature adds ambient background music, feedback sounds for construction interactions and accessible audio settings. It does not modify terrain, buildings, economy calculations, transactions, game progress, artwork or existing saved-game formats.

## Architecture

- `game/src/modules/audio/settings.ts`: pure preference validation, normalization and safe localStorage persistence. Key: `underground-survive:audio:v1`; completely separate from game saves.
- `game/src/modules/audio/AudioManager.ts`: browser Web Audio implementation. Low-volume procedurally synthesized 16-step atmospheric melody and bass, plus short interaction cues, with no media downloads or licensed samples.
- `game/src/app/GameScene.ts`: emits typed feedback cues after gameplay actions and calls audio activation on pointer-down; does **not** know about Web Audio or save sound settings.
- `game/src/main.ts`: composition root and preference controls.
- `game/index.html`, `game/src/audio.css`: responsive, keyboard-accessible Persian control panel.

## Sound mapping

| Event | Cue |
| --- | --- |
| Select a room/tool | `select` |
| Successful room construction | `build` |
| Successful excavation | `dig` |
| Move a room | `move` |
| Remove a room | `remove` |
| Upgrade a room | `upgrade` |
| Unlock an upper floor | `floor` |
| Receive demo bonus | `reward` |
| Reset layout | `reset` |
| Failed/invalid action | `error` |

Sound is emitted **after** the operation result is known. No sound event can change the game outcome.

## User controls and browser lifecycle

- Toggle all audio, independently enable/disable music or effects, and adjust music/effect volume from 0 to 100%.
- Audio preference changes persist locally; invalid or unavailable storage is tolerated without crashing the game.
- Playback starts only after a genuine click/touch (browser autoplay restrictions). No background sound starts on page load; the panel includes an effects preview button.
- Ambient notes are scheduled with a short lookahead, stop being scheduled when the tab is hidden or audio is disabled, and audio resources/timers are cleaned up on disposal.
- If Web Audio is unavailable, gameplay continues normally and the panel shows an explanation.
- The music and effects use original parameterized oscillators rather than third-party recordings; no external audio licensing or assets are required. For a later production soundtrack, replace the AudioManager adapter or extend it with licensed files without changing building/economy modules.

## Verification

From `game/`:

```bash
npm install
npm test
npm run build
npm run dev
```

Manually verify in both desktop and mobile emulation:

1. Fresh page is silent until the first game interaction.
2. Build, dig, upgrade, remove, floor unlock and failed actions produce distinct cues.
3. Master mute, separate enabled switches and both sliders take effect immediately.
4. Refresh retains the audio settings, including mute; existing base and coin saves remain unchanged.
5. Switching tabs suspends music scheduling, returning restarts it; play continues after a touch on mobile.
6. Keyboard users can navigate all audio controls and read their names/values.

**Limitation:** this is a compact synthesized demo soundtrack and sound-effect set, not mastered production audio. Hardware/browser listening tests and asset production are future work.
