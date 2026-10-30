# Localization (Persian / English)

The web game ships with Persian (`fa`, right-to-left) and English (`en`, left-to-right).

## Playing

Open **Settings → Game language** in the main or pause menu and choose فارسی or English. Interface text, number formatting, the HUD, menus, actionable feedback and the story viewer switch without a page reload. The choice is saved under `underground-survive:language:v1`. If storage is blocked or the value is invalid, the existing Persian default is used. Language changes do not reset or modify rooms, money, mission progress, audio settings or game saves.

## Adding UI strings

All English translations are maintained in `game/src/i18n/index.ts` as a dictionary indexed by the original Persian UI string. Use `t('Persian source')` for reactive strings and `t('هزینه: {value} سکه', { value: formatNumber(cost) })` for interpolated values. Static HTML strings that have a dictionary match are captured on startup by `mountStaticTranslations`; any element built or replaced later should use `t` and subscribe to `subscribeLocaleChange` if it needs to refresh.

Original Persian text is the fallback for missing translations. Update both locales' user-visible strings when adding a new feature. Game rules, saved data and type IDs must remain language-neutral. Game scene failure reasons are mapped at the view boundary by `localizeGameMessage`, not inside simulation or persistence.

## Story content

Story chapter JSON is kept independent of UI translation. The Persian manifest remains `game/public/content/manifest.json`; the English manifest lives at `game/public/content/manifest.en.json`. Each points to a chapter JSON with a matching locale (`fa-IR` or `en-US`). Shared media may be reused while the chapter titles and text are translated. The viewer selects the manifest for the current language each time the user opens the story after a language change.

## Verification

From `game/`, run `npm test` and `npm run build`. Manually test both languages on a narrow viewport and desktop, including reload persistence, new/continued games, the pause menu, upgrade costs, insufficient-coins feedback, live HUD, and story chapter selection. Confirm that language selection never rewrites the underlying save snapshot.
