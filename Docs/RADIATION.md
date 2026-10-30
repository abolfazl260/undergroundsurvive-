# Radiation risk simulation

Risk and cumulative exposure are fictional game points, never physical or
medical units. Versioned configuration defines surface fallout (70), protected
underground (2), and a leaking-pipe source (55). Values stay within 0–100; total
dose is capped. `RadiationField.getRiskForLocation` is the read-only integration
point for future expeditions, oxygen or water consumers.

The shared five-second simulation clock drives a double-buffered local-neighbor
step. Solid terrain and adapter-provided walls block transfer; vertical transfer
has a depth attenuation factor. No diagonal, out-of-bounds or multi-cell jump
occurs in one step. Decay and filters lower contamination. Sources continuously
reintroduce risk, so cleanup is temporary near a live source. Each room exposes
ShieldingFactor and low/medium/high ContaminationState; level improves shielding.
Equipment protection is an occupant-provider multiplier. Filters follow room IDs
when rooms move; reinstalling an existing filter is rejected.

Cleanup halves the selected cell for 25 existing coins; a room filter costs 50.
Both require explicit UI confirmation and persist operation IDs, so retry/reload
cannot charge twice. The overlay is a world-coordinate Phaser layer, which follows
the existing pan/zoom/resize/fullscreen camera without changing grid geometry.
Enable it in shelter actions, select a cell, then reopen actions to inspect risk,
shielding, cumulative doses and mitigation. Legend and text accompany the colors.
Choosing a normal tool exits inspection mode. Controls use the existing mobile
sheet, safe area and fa/en direction.

A configured source-only surge lasts 30 seconds and has a 120-second cooldown;
the local scenario requests it every 24 resource ticks. Surge stacking is rejected.
Snapshot schema 7 persists levels, doses, filters, mitigation operation IDs, surge
state and last simulation time. Legacy saves initialize risk at their current
simulation clock without offline exposure. Pause and wall-clock changes do not
advance it. Resident positions are sampled through a provider; only exposure is
recorded. `RadiationExposureEvent` carries a unique tick/survivor ID to an optional
`SurvivorHealthAdapter`. No health adapter is installed, so existing health is
unchanged, as required for a separate health integration PR.

Tests cover exposure/gear differences, walls, solids, deterministic steps, finite
bounds, atomic cleanup/filtering, duplicate operations, surge limits, dose caps,
old/new saves and tick partitioning. Browser visual verification remains unavailable
as documented in WATER.md. Online mitigation and timestamps require server-owned
inventory and operation validation; browser saves are not authoritative.
