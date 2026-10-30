# Shared UI kit

A standalone browser-DOM UI kit, independent of Phaser, room rules, wallets, game menus, audio and asset loading.

- `icons.ts`: typed 24×24 vector SVG icons, no external fonts or image requests.
- `components.ts`: reusable button, badge and panel factories plus pressed-state, label and fallback-icon helpers.
- `ui.css`: dark-theme tokens, button variants, minimum 44px control targets, keyboard focus and reduced-motion behavior.
- `ui.test.ts`: icon registry and component variant checks.

## Example

```ts
import { createActionButton, createBadge, createPanel, setButtonLabel, setPressed } from './ui/components';
const move = createActionButton({label: 'جابه‌جایی', icon: 'move', onClick: () => {}});
setPressed(move, true);
setButtonLabel(move, 'انتقال اتاق', 'move');
const status = createBadge('آماده', 'success', 'check');
const panel = createPanel('ساخت‌وساز', 'اتاق موردنظر را انتخاب کنید.');
```

For static HTML, use `data-ui-icon="home"` on a placeholder with a fallback glyph, then `enhanceIcons()` on startup. SVGs are decorative: retain visible text or `aria-label` on icon-only controls. Mobile and desktop keep the same control order and positions.

Run `npm test` and `npm run build` inside `game/`. No game state, Phaser renderer or business rules are changed.
