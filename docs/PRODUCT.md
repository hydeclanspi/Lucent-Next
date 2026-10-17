# airhome (personal) — product notes

The project explores how much personality a browser homepage can carry while remaining useful. Its center is a personal card and a search field; the surrounding atmosphere gives that structure its character.

## From a card to a small personal environment

| Era | Direction |
| --- | --- |
| 2.0 | Establish the card, search, shortcuts, native entries, and tablet composition. Resolve package structure and wallpaper rendering. |
| 2.1–2.4 | Refine transparent materials, stabilize initialization, and make individual shortcut presentation configurable. |
| 2.5–2.8 | Add the daily note, signature history, two wallpapers, blur controls, and atmosphere switching. |
| 2.9–3.x | Develop floating glass into an interaction system: gesture geometry, motion, collisions, automatic movement, and statistics. |
| 4.x | Refine controls and persistence, interaction statistics, glass and wallpaper settings, search submission, and selected motion studies. |
| 5.0 | Bring the final material and search-motion treatment together. Extend the experience into a standalone web showcase. |

These stages describe product direction; version-by-version changes can be inspected in the commit history. The earliest source available in this project is 2.0.0. Experimental version numbers do not always increase chronologically.

## Design choices

The warm name and avatar ring anchor the personal identity. Blue identifies the primary search action. A translucent main card lets the city and its light remain visible, while smaller controls stay quiet. Existing colors are purposeful: changing the search accent does not recolor the entire product.

Browser panels use one main glass surface, generous spacing, fine dividers, and simple readable rows. They reference the spatial layering and restrained motion described in [HarmonyOS design](https://developer.huawei.com/consumer/cn/design/) and its [design principles](https://developer.huawei.com/consumer/cn/design/concept/). These are web interpretations, not reproductions of native ArkUI components. No Huawei component or font bundle is redistributed.

## Boundaries

This is a custom homepage and an interactive web product, not a browser engine or an ArkTS application. The original host supplied shortcuts, theme colors, and native destinations. The web layer supplies local demonstration equivalents. The bottom toolbar in device screenshots belongs to Aira and is intentionally outside this page.

The package version is 5.0.0. The in-product About card retains its original 4.7.3 build label as part of the final package's content.
