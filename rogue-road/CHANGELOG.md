# Changelog

## [Unreleased]

## [0.7.0] - 2026-11-22

### Added
- `/clear-trail`: clears the context (`/clear`) as soon as the session is free, and logs it; the logbook keeps the road behind.
- `/trail-log [focus]`: asks Claude for an end-of-session summary (goal, what was done with commits and PRs, decisions, what is pending or unverified, next steps), with the day's logbook attached.
- `/pass-the-map [purpose]`: asks Claude for a handoff to a new session, with the `handoff` skill when it is installed and its rules otherwise (one markdown file in the system's temp directory, links instead of copies, suggested skills, no secrets, verified versus assumed), and the day's logbook attached.

### Changed
- `/acampar` now compacts as soon as the command ends, instead of waiting for the end of the next turn; it still falls back to that when the session is busy.

## [0.6.1] - 2026-11-22

### Changed
- The command that repaints the theme and shows where the session is on the road is now `/rogue-road-mod` (it was `/rogue-road`).

## [0.6.0] - 2026-11-22

### Added
- Milestones on the road: a commit, a push, a pull request or a test run that passes plants a flag on the road where it happened, with the subject as its title. The row above the prompt marks them with `•`, and a new dawn starts a fresh road.
- Weather that follows the work: failed tools cloud the sky and bring rain, tests that pass clear it, and a usage limit over 80 % brings a storm with distant lightning. Each change is toasted and logged.
- Travel companions: each subagent walks beside the explorer while it runs (up to three, then `+N`); the row shows `⚇ N`.
- A logbook pane (`/bitacora`, the `Bitácora` button, or a click on the badge): the day's milestones, phases, weather and companions grouped by phase, and a summary of earlier days.
- Ambient sound for the desktop app, by phase and weather, with cues for send, tool, done, ask, error, compact and click. `/sonido on|off`, the row's `♪` button and the new `Sonido ambiental` setting turn it on or off.
- An interactive backdrop: clicks on the badge, the explorer, the sun and the camp open the logbook, show the phase, show the context breakdown and camp.

## [0.5.1] - 2026-11-22

### Fixed
- The badge in the top-left corner no longer hides under the desktop app's title bar: it now sits 64 px from the top instead of 20.

## [0.5.0] - 2026-11-22

### Added
- The row above the prompt now carries the session's logbook, in the terminal and in the desktop app alike: the context as tokens used over the window (`154.6k/1M`); a bar the width of the row with each category of `/context` in its own colour, the autocompaction buffer (▒) and the free space (░); a legend with each category's tokens; and a line with the model, the usage limits (5 h, 7 days) with when they reset, the autocompaction threshold and the estimated cost.
- A `Detalle` / `Menos` button that shows or hides the logbook and keeps the choice.

The breakdown is the local estimate `/context` makes (`summary`): it sends no requests, and it is refreshed after each model response.

## [0.4.0] - 2026-11-22

### Changed
- A new explorer, the traveller: the emblem's hooded figure with human proportions (a face under the pointed hood, arms and hands, a belted tunic, boots and a short cape) and a backpack with the rolled map and a hanging lantern. Walking, it swings its free arm and the staff moves with its hand; waiting, it plants the staff, holds the backpack strap and turns its face towards the conversation.
- At night the explorer's clothes are a slate grey instead of pale cream, with a lighter staff so it stands out against the sky.

## [0.3.2] - 2026-11-22

### Changed
- The explorer's vignette and the context badge are back on the left side of the window, as in 0.3.0.

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
