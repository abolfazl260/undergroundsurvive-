# Online panel — demonstration leaderboard

The **Online** button appears in the game's unified top header only when the browser/WebView reports `navigator.onLine === true`. It disappears when an `offline` event fires, and any open leaderboard dialog closes. The button does not appear in the offline state.

## Current implementation

- Other entries are **synthetic samples**, **not actual accounts**: each uses a Persian first name transliterated into Latin letters with a numeric suffix (e.g. `sara482`, `amir2026`). Their coins and scores are generated locally. A visible notice in both supported locales identifies the sample list.
- Names and sample numbers are deterministic for one UTC day. The list changes the following UTC day rather than on every open.
- The current player entry is calculated from the locally saved `GameSnapshot`: 120 points per room, 180 per extra room level, 25 per excavated cell, 275 per unlocked achievement, 2 per resource cycle (cycles capped at 50,000 for scoring). The player's coins are the actual local `wallet.balance`. The ranking does **not** spend or award coins or alter saved game data.
- Both the header entry and dialog are keyboard/touch accessible. No action is pinned to the side or bottom of the screen.
- This view makes no API requests, identifies no remote players, and does not send balances to a server. `navigator.onLine` indicates reported device connectivity, not proof that an online game service is reachable.

## Future real multiplayer integration (not implemented)

To replace samples with authentic rankings, build a backend-backed account/session identity, server-validated authoritative scores and coin balances, and a read-only leaderboard endpoint with limits and abuse protection. The UI should then use the authenticated endpoint response instead of `sampleStandings()`; do not trust client-reported wallet/points as other-player data. Provide a loading/error state and only label real accounts as online after the service confirms availability.

The local sample roster must remain clearly marked as fictional until these prerequisites are delivered.
