# Tehran illustrated prologue — WebP assets

The official six-scene prologue now uses **six separate high-detail 960×540 WebP illustrations**, produced from the user-approved Tehran/Iran images. Each image is text-free; translated titles and narrative are rendered as accessible HTML below the image, unchanged. Scenes retain their exact stable IDs and order.

| Scene ID | Media file | Visual |
| --- | --- | --- |
| `anomaly` | `prologue-city.webp` | Tehran skyline, Milad Tower, polluted sky |
| `broadcast` | `prologue-broadcast.webp` | Iranian family listening to emergency television |
| `evacuation` | `prologue-evac.webp` | Tehran civilian evacuation to an underground shelter |
| `seal` | `prologue-seal.webp` | Reinforced bunker gate during quarantine |
| `day-ninety` | `prologue-day90.webp` | Interior shelter monitoring and life after 90 days |
| `survivors` | `prologue-survival.webp` | Iranian survivors, infrastructure, and underground life |

Paths are rooted in `game/public/content/media/images/` and referenced by both
`prologue-90-days.json` and `prologue-90-days.en.json`.
The localization manifests and chapter contentVersion were incremented to 3.
The previous *official prologue* SVGs were removed, not displayed as fallbacks.
Unrelated demonstration scenario SVG media is retained and is not part of the
official enabled story.

Each WebP was resized from an original 1672×941 illustration using a Lanczos
resampling filter, then encoded at quality 76; the delivered frames total
under 500 KiB, have no extra runtime library/dependency, and load only when
the story viewer displays the selected scene. The viewer already supplies
correct GitHub Pages base-relative URLs and scales to 16:9.

## Validation
`cd game && npm run validate:story && npm test && npm run build`.
The prologue regression test checks both locales, exact six scene IDs,
WebP signatures, distinct image checksums, and bounded asset size.
