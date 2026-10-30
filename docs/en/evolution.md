# Evolution

**25 days, 111 versions — from a profile card to a small world with physics, identity and an archive.**

[中文](../evolution.md) · [Back to README](../../README.en.md)

---

Every version was archived as it shipped: a source snapshot, the installable package, a one-page design note and a one-page verification record. This repository's history was rebuilt from those archives in order: the 109 versions from 2.0.0 to 5.0.0 in 127 versioned commits (several rounds of tuning within one version each got their own commit), followed by the web edition and the commits from 5.1.3 to 6.0.4. Version numbers do not always rise with time — the material experiments were first explored as 5.0.0-beta and only later folded into 4.7.3 — and they are kept as they were.

## Timeline

| Phase | Dates | Versions | What happened |
|---|---|---|---|
| **The profile card** | Sep&nbsp;26–27 | 2.0.0 → 2.8.5 | The card's information skeleton distilled from developer documentation — wallpaper, avatar, signature, tags — plus search, engines, shortcuts and direct entries. Relaid out for a 1560×1040 tablet in landscape; the clear-glass visual language established; three shortcut forms and 28 tile colours; the daily note and signature archived to the second; Light and Dark wallpapers with runtime soft focus |
| **Codename: Interaction** | Oct&nbsp;7–9 | 2.9.0 → 4.0.5 | Two Lueurs and the potential field; immediate collisions; 0–49 lenses and their own panel; long-term statistics in three linked charts; the planet entry; collision strength and randomize-on-launch; Auto Drive; natural collisions that disperse; three layers of defaults; two-stage FSD in blue and orange; six rounds on stones and constellations; natural encounters; a shared glass toolbar; 49 numbered residents and the chronicle |
| **Chronicle and roster** | Oct&nbsp;9–10 | 4.0.6 → 4.5.3 | Five passes over the number badge; the chronicle's introduction; the About window and its gilded title; a two-column statistics panel and the chart family; four makeovers of the relationship web; backup and export; the handwritten signature; histogram migration and the grid guard; relative shading for the roster |
| **Material and motion** | Oct&nbsp;10–16 | 4.7.3 → 5.0.0 | Warm Clear and Classic Frost glass, chosen separately for the main card and the sheets; wallpaper brightness and framing; an atelier of sixteen search motions, six chosen for the product; simulated launch and sustained beams; Random's platinum rings and blue-white lasers |
| **Web edition** | Oct&nbsp;17–20 | 5.0 | The browser demonstration layer, live deployment and deep links; immersive full screen and installation as an app; the concept film and the on-device film; the device's typefaces and system interface; invariant tests for the engine, the renderers and the stores; documentation, architecture and figures |
| **Silk light and gold motes** | Oct&nbsp;20 | 5.0.0 → 5.1.3 | Active the moment the simulated launch loop is on: two gold silk ribbons travel the outline at an even pace, one lap in ten seconds; gold motes rise and sink from both edges, 12–22 at a time, redrawn every 4–7.65 s and leaning to the top, swelling 1.25–1.6× with each launch; Manual strikes in the roster and the export; new About copy with the GitHub note; the folded layout re-centred; a hand-drawn arrow in the panel; the package renamed Lucent Next |
| **The local shelf** | Oct&nbsp;21–30 | 5.1.3 → 6.0.4 | A folder or a few files mounted read-only, uploaded nowhere; a filter by kind, MD + HTML by default, folders clustered and folded; recent folders either side of the summary card; access re-granted in place when it lapses; the file manager reached directly on ArkWeb, past the source sheet; HTML, Markdown, PDF, images and text previewed in place, HTML and PDF opened in a new tab, from 6.0.1 handed to Aira as a `data:` address, large pages compressed and unpacking themselves, and from 6.0.4 Markdown too, set as a reading page with its pictures from the web loading; from 6.0.2, a favourite whose folder is locked opens after one grant, and a path pasted into the search goes straight to its file; starred favourites, six to a row, sorted by time or kind, floating on liquid porcelain glass when open; the shelf's entry among the shortcuts and the direct entries in an order of your own; backup import; persistent grants restoring the default folder, and favourites restoring their original root; both folder pickers glazed in translucent celadon, and from 6.0.3 the grant card's buttons with them, and the shelf card in Warm Clear glass, its list and preview sampling the wallpaper for themselves, evened out, lifted and still coloured; the Lueurs' factory baseline at six, 74 : 26, strength 13.7× |

I defined the product, designed it, and signed off every version; the implementation was written with AI coding agents.

## From a feeling to a parameter

Many decisions in this product started as a sentence about a feeling; each landed as a number that could be checked:

| The feeling | The parameter |
|---|---|
| The Lueurs should be a bit quicker | Natural speed +16.4% (`MOTION.speedScale = 1.164`) |
| The entry's angle is wrong | From 40° to 23.5°, and 17.5% smaller overall |
| The invitation shouldn't hang around | The FSD button fades if untouched for 4.25 s |
| The line-up changes too slowly | Redraws narrowed from 18 s to 11.5 s |
| Hold the top up, but higher isn't better | The upper 38% is a plateau: ×2 with a 48 px cosine feather; the bonus for vertical spread is capped at +35% |
| Being close can be tolerated now and then | Close-range penalty 0.8, below far (1.6) and desert (1.8) |
| Numbers "nearly invisible unless you look" | Opacity 0.45, 8.5 px, −7° |
| "2.35 points brighter" | The signature re-baked from HSL lightness +7, ending at `#CBAE60` |
| Ratio numerals should have character | 18 px, weight 520, italic |

## Wrong turns

Each of these was found, fixed, and turned into a check for every version after it.

| Problem | Real cause | The rule it left |
|---|---|---|
| The card kept crashing inside the host, never in a desktop browser | The host re-sent its ready event at high frequency and initialization avalanched | Stop guessing, add a "black box" recorder first; initialization must be idempotent |
| Version 3.1 would not import | The manifest's version inside the package was not SemVer; renaming the ZIP did nothing | Before delivery, verify the actual ZIP's manifest, paths and CRC along with the source files |
| At strength 24, natural collisions still did not disperse | The effect masked the physics: refraction, but no separation | Check visual feedback, position correction and momentum transfer separately |
| Placement "too clumped together" | The far penalty and the desert penalty multiplied each other away on the same candidate | When tuning several factors, plot the weight curve after they are multiplied |
| "The 70% doesn't seem to happen" | The adjudication was right; the bottleneck was the chance to enter the circle | For probabilities, measure the opportunity rate before the trigger rate |
| The signature vanished on the device | Under `file://`, `mask-image` was blocked by a cross-origin check | Verify every deliverable both over http and from `file://` |
| The strength histogram held 138 entries while 824 collisions had happened | Changing the bins cleared the whole table | Any change of unit or binning ships with a migration by default |

## Principles that never changed

- **Light, and always in reach.** Key actions are easy to find; glass holds them together, and the light stays with what matters.
- **Key moments must be felt.** A collision springs apart on the frame of contact; an encounter needs enough chances to happen.
- **Automation never poses as a person's choice.** Driving and encounters never write odds and never count as interaction.
- **Definitions before features.** Before a chart ships, define what each number means; before a storage decision, work out its cost.
- **Relative over absolute.** Anything that inflates with long use is shown in relative terms.
- **Data invariants are the product's credibility.** Migrations preserve totals, writes guard their shape, copies verify themselves first, and old data may grow coarser but is never lost.
- **Names are part of the design.** 备份文本 (*backup text*), 落子与星座 (*stones and constellations*), 念起，光行 (*a thought, in flight*): every one of them weighed.
