# Evolution

**22 days, 109 versions — from a profile card to a small world with physics, identity and an archive.**

[中文](../evolution.md) · [Back to README](../../README.en.md)

---

Every version was archived as it shipped: a source snapshot, the installable package, a one-page design note and a one-page verification record. This repository's history was rebuilt from those archives in order — 109 versions in 127 versioned commits (several rounds of tuning within one version each got their own commit), followed by the commits of the web edition. Version numbers do not always rise with time — the material experiments were first explored as 5.0.0-beta and only later folded into 4.7.3 — and they are kept as they were.

## Timeline

| Phase | Dates | Versions | What happened |
|---|---|---|---|
| **A profile homepage** | Sep&nbsp;26–27 | 2.0.0 → 2.8.5 | The card's information skeleton distilled from developer documentation — wallpaper, avatar, signature, tags — plus search, engines, shortcuts and direct entries. Relaid out for a 1560×1040 tablet in landscape; the clear-glass visual language established; three shortcut forms and 28 tile colours; the daily note and signature archived to the second; Light and Dark wallpapers with runtime soft focus |
| **Codename: Interaction** | Oct&nbsp;7–9 | 2.9.0 → 4.0.5 | Two Lueurs and the potential field; immediate collisions; 0–49 lenses and their own panel; long-term statistics in three linked charts; the planet entry; collision strength and randomize-on-launch; Auto Drive; natural collisions that disperse; three layers of defaults; two-stage FSD in blue and orange; six rounds on stones and constellations; natural encounters; a shared glass toolbar; 49 numbered residents and the chronicle |
| **Chronicle and roster** | Oct&nbsp;9–10 | 4.0.6 → 4.5.3 | Five passes over the number badge; the chronicle's introduction; the About window and its gilded title; a two-column statistics panel and the chart family; four makeovers of the relationship web; backup and export; the handwritten signature; histogram migration and the grid guard; relative shading for the roster |
| **Material and motion** | Oct&nbsp;10–16 | 4.7.3 → 5.0.0 | Warm Clear and Classic Frost glass, chosen separately for the homepage and the sheets; wallpaper brightness and framing; an atelier of sixteen search motions, six chosen for the product; simulated launch and sustained beams; Random's platinum rings and blue-white lasers |
| **Web edition** | Oct&nbsp;17–18 | 5.0 | The browser demonstration layer, live deployment and deep links; immersive full screen and installation as an app; the concept film; invariant tests for the engine, the renderers and the stores; documentation, architecture and figures |

I defined the product, designed it, and signed off every version; the implementation was written with AI coding agents.

## From a feeling to a parameter

Many decisions in this product started as a sentence about a feeling; each landed as a number that could be checked:

| The feeling | The parameter |
|---|---|
| The Lueurs should be a bit quicker | Natural speed +16.4% (`MOTION.speedScale = 1.164`) |
| The entry's angle is wrong | From 40° to 23.5°, and 17.5% smaller overall |
| The invitation shouldn't hang around | The FSD button fades if untouched for 4.25 s |
| The line-up changes too slowly | Redraws narrowed from 18 s to 11.5 s |
| Hold the top up, but higher isn't better | The upper 38% is a plateau, not a slope: ×2 with a 48 px cosine feather; the bonus for vertical spread is capped at +35% |
| Being close can be tolerated now and then | Close-range penalty 0.8, below far (1.6) and desert (1.8) |
| Numbers "nearly invisible unless you look" | Opacity 0.45, 8.5 px, −7° |
| "2.35 points brighter" | The signature re-baked from HSL lightness +7, ending at `#CBAE60` |
| Ratio numerals should have character | 18 px, weight 520, italic |

## Wrong turns

Each of these was found, fixed, and turned into a check for every version after it.

| Problem | Real cause | The rule it left |
|---|---|---|
| The homepage kept crashing inside the host, never in a desktop browser | The host re-sent its ready event at high frequency and initialization avalanched | Stop guessing, add a "black box" recorder first; initialization must be idempotent |
| Version 3.1 would not import | The manifest's version inside the package was not SemVer; renaming the ZIP did nothing | Before delivery, verify the actual ZIP's manifest, paths and CRC — not just the source files |
| At strength 24, natural collisions still did not disperse | The effect masked the physics: refraction, but no separation | Check visual feedback, position correction and momentum transfer separately |
| Placement "too clumped together" | The far penalty and the desert penalty multiplied each other away on the same candidate | When tuning several factors, plot the weight curve after they are multiplied |
| "The 70% doesn't seem to happen" | The adjudication was right; the bottleneck was the chance to enter the circle | For probabilities, measure the opportunity rate before the trigger rate |
| The signature vanished on the device | Under `file://`, `mask-image` was blocked by a cross-origin check | Verify every deliverable both over http and from `file://` |
| The strength histogram held 138 entries while 824 collisions had happened | Changing the bins cleared the whole table | Any change of unit or binning ships with a migration by default |

## Principles that never changed

- **Light does not mean invisible.** Key actions must be findable; glass organizes rather than letting every button glow on its own.
- **Key moments must be felt.** A collision springs apart on the frame of contact; an encounter needs enough chances to happen.
- **Automation never poses as a person's choice.** Driving and encounters never write odds and never count as interaction.
- **Definitions before features.** Before a chart ships, define what each number means; before a storage decision, work out its cost.
- **Relative over absolute.** Anything that inflates with long use is shown in relative terms.
- **Data invariants are the product's credibility.** Migrations preserve totals, writes guard their shape, copies verify themselves first, and old data may grow coarser but is never lost.
- **Names are part of the design.** 备份文本 (*backup text*), not 存档串 (*save string*); 落子与星座 (*stones and constellations*); 念起，光行 (*a thought, in flight*).
