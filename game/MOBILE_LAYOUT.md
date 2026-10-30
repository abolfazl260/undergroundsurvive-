# Fullscreen game HUD

The game now uses a **viewport-filling browser layout** on phones, tablets and desktop. There is no full-page vertical or horizontal scrolling. The Phaser canvas fills the screen, while menus, compact HUD counters and the six primary actions are positioned on top of it. This is a mobile game-style layout rather than a long page of controls.

- `game/src/fullscreen.css` owns edge-to-edge layout, safe-area insets, and the toolbar/sheet presentation.
- `game/src/app/gameDock.ts` moves the existing tool controls (rather than cloning IDs), handles the build-room chooser, secondary management sheet, resource details and user-initiated Fullscreen API.
- Build opens a room selector; choosing a room closes the selector while keeping build mode active. Dig, Move, Upgrade, Demolish and Resident Navigation remain direct-action buttons fixed at the bottom. The top extra-actions button opens floor unlocks, demo bonus, audio, history and reset. Upgrade confirmation appears directly above the dock when that tool is selected.
- The map supports mouse wheel and pinch zoom, dragging, and reflow during orientation changes. `Phaser.Scale.RESIZE` adapts its physical canvas to the element, while `resizeViewport` keeps the same world location centered and re-constrains camera scroll. A single `960×600` world remains authoritative; no room placement or persistence schema changes.
- The app requests true browser fullscreen only through the fullscreen button, because native browser fullscreen requires a user gesture and may be unavailable on iPhone Safari. Even when unavailable, the interface itself still fills the browser viewport via `100dvh` and safe-area padding.
- Both Persian RTL and English LTR remain supported.

## Check

Run `cd game && npm test && npm run build`, then verify 320–430px phone widths, tablet, desktop, rotation, menu/Fullscreen API, button hitboxes, pinch/pan and zoom, room selector/upgrade and secondary sheet, no body scroll, resource display and saved-game restoration.

Note: Detailed room art is still positioned in the original world coordinate system. The visible world crop varies with the browser aspect ratio, which is expected; drag/pinch to navigate.
