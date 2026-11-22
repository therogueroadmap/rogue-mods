# Changelog

## [Unreleased]

## [0.3.1] - 2026-11-22

### Changed
- The explorer's vignette and the context badge moved to the right side of the window: the app's sidebar with the conversation list usually covers the left. The vignette is mirrored, so the explorer now faces the conversation.

## [0.3.0] - 2026-11-22

### Changed
- The explorer moved out of the conversation into a vignette in the bottom-left corner. While Claude works it walks in place and the world scrolls behind it (far pines slowly, stones, grass and a waymark post quickly, the trail under its feet); when Claude needs the person everything stops and it waits, breathing, with its lantern lit and a bubble over its head. On the map across the landscape, an orange marker shows where it is.

### Added
- Light and shadow from the sun: the mountains glow on the side the sun is on, the near ridge has a rim of light, and the explorer casts a shadow that is long at dawn and dusk, short at noon, and falls away from the sun.
- An atmosphere that follows the context: haze between the mountain ranges thickens through the day, birds cross the morning sky, fireflies come out at dusk and a campfire with smoke burns at the camp at nightfall.

## [0.2.0] - 2026-11-22

### Added
- A badge in the top-left corner, always in view at a fixed size: the explorer in a circle of the current sky, a ring with the context used, the phase and whether it is exploring or waiting.
- A size guard: if the scene ever grew past what the desktop app draws (131,072 characters), a lighter scene without stars, clouds, far mountains or milestones is drawn instead.

### Changed
- The road now keeps out of the reading column: it climbs the left slope in switchbacks, crosses the valley far away near the horizon and comes down the right slope to the camp. About a quarter of the journey passes behind the conversation, down from about half. The explorer is smaller in the distance and faces the way it walks.

### Fixed
- The theme is painted when the app attaches or the mod loads mid-session, and `/rogue-road` repaints it and reports the attached surfaces.

## [0.1.0] - 2026-11-22

### Added
- Six phases of the day tied to the context window: Alba (0–15 %), Mañana (15–35 %), Mediodía (35–55 %), Tarde (55–75 %), Atardecer (75–90 %) and Anochecer (90–100 %).
- Animated backdrop: a hooded explorer walks a winding road while the sun crosses the sky from dawn to dusk; stars and the moon come out at nightfall. The explorer's place on the road is the context used.
- The explorer walks while Claude works and stops, with a lit lantern and a waiting bubble, whenever Claude needs the person: end of turn, permission prompt, `AskUserQuestion`, plan approval and notifications.
- Cream (light) and navy (dark) palettes from The Rogue Roadmap brand, with an accent that warms from dawn pink to sunset orange and night violet; `modo` option (`auto`, `claro`, `oscuro`).
- Terminal: a row above the prompt with a miniature road (`━━━◆┄┄┄ ▲`), the phase, the context % and the explorer's state; a status line entry; phase toasts.
- `/rogue-road` shows the phase ladder; `/acampar` (and the `⛺ Acampar` button from 75 %) compacts the conversation and brings a new dawn.
- Plugin icon.
