# One mobile-first screen on all devices

The web build intentionally keeps a **portrait 480 × 600 logical game viewport** and
a **960 × 600 world** regardless of device. Phones, tablets and desktop browsers
show the same single-column control order inside a centered, max-540px shell.
The interface does not switch to a desktop sidebar or four-column HUD.

- On phones the shell fills the available width, including safe-area padding.
- On tablet and desktop the same shell is centered; extra space becomes a gutter.
- The HUD has two columns; the resource tiles have two columns; room choices
  scroll horizontally. Tool buttons are always in two columns and at least 48px
  tall. Zoom buttons remain at least 44px.
- Audio controls, history and reset are available under the same expandable
  “More settings and information” section everywhere.
- Phaser FIT scales the 480×600 logical viewport; the asset manager continues
  selecting high-resolution room and background textures for dense screens.
- Camera pan bounds use the **full world dimensions**. The initial position and
  reset are centered on the same world point, so the portrait crop doesn't
  relocate rooms or distort the 1920×1200 background texture.

## Review checklist

Run `cd game && npm test && npm run build`.

Manually check portrait widths 320, 360, 390 and 430px, a 768px tablet and a
1280px desktop viewport. Confirm no horizontal page overflow, identical order
of HUD/world/room picker/tools, scrollable room picker, safe-area padding,
working taps and gestures, sharp room textures, correct selection after pan,
reset zoom centering, and that gameplay saves remain readable. Verify menu,
story, audio and accessibility at both keyboard and touch input.
