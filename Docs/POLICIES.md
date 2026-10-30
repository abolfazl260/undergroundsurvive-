# Game policies, permissions and privacy

**Review date:** 2026-10-31  
**Implementation:** Main menu, pause menu, settings, and advanced in-game tools → **قوانین و حریم خصوصی / Policies & Privacy**.

The in-game notice is maintained in `game/src/app/policyContent.ts` with matching Persian and English copy. It is rendered into the existing paused modal rather than opening an external web page. It covers:

1. Current gameplay rules and local virtual currency.
2. Acceptable use and asset/license limitations.
3. What localStorage stores; what the current client does **not** upload.
4. Browser/device permissions and their current absence.
5. User choices, storage clearing and new-game limitations.
6. Real-money payments, subscriptions, advertising and third parties.
7. Fictional safety content, minors and prototype limitations.
8. Policy revision practices and the public support channel.

## Verified current-code observations

- Game saves are stored under `underground-survive:game:v2`; legacy saves may be read from `underground-survive:base:v1`; a recovery copy may remain under `underground-survive:recovery`.
- Menu, audio, language, and narrative-progress preferences use additional localStorage keys. A new game is **not** a full personal-data deletion control.
- Narrative content is fetched from first-party `/content/` assets; the web build loads Vazirmatn from `fonts.googleapis.com` and `fonts.gstatic.com`.
- No dedicated analytics/advertising SDK, payment integration, authentication flow, or browser permission requests for camera, microphone or location were identified in the reviewed client code.
- Android uses Capacitor but the generated release Android Manifest is not tracked; future packaged releases require review of permissions, plugins and store data disclosures.

## Release checklist (required before production)

- Confirm the final hosting provider's access logs, cookies, data retention, CDN and any external analytics; revise privacy notice if different.
- Audit Android Manifest and permissions of the final release build; reflect any changes in the policy.
- Confirm rights/licenses for all art, fonts, audio and third-party content before making stronger IP claims.
- Recheck whether accounts, cloud saves, social systems, purchases, ads or notifications have been added.
- Update both languages and `POLICY_UPDATED` together whenever actual behavior changes.
- A public GitHub issue is not a private data-rights request channel. Before commercial release, add an operator identity and a private privacy contact, plus jurisdiction-specific legal notices as appropriate.

This page describes implementation-visible practices and does not substitute for deployment-specific legal review.

## Navigation and acceptance

- Policies opened from **Settings** return to **Settings** via Back or Escape; Settings Back then returns to the original home/pause screen.
- Policies opened from **Home** or **Pause** return to their respective originating menus.
- Policies opened from the advanced game tools pause gameplay and return to the **Pause** menu, so no simulation changes occur while reading.
- Verify both Persian RTL and English LTR labels, modal scrolling on narrow screens, keyboard Escape, and focus on the policy heading.
- The previous short rules panel in the tools sidebar must not claim surface-floor construction is enabled; the full legal/data notice is the canonical source.
