# Changelog

## [Unreleased]

## [0.1.0] - 2026-11-22

### Added
- Six phases of the day tied to the context window: Alba (0–15 %), Mañana (15–35 %), Mediodía (35–55 %), Tarde (55–75 %), Atardecer (75–90 %) and Anochecer (90–100 %).
- Animated backdrop: a hooded explorer walks a winding road while the sun crosses the sky from dawn to dusk; stars and the moon come out at nightfall. The explorer's place on the road is the context used.
- The explorer walks while Claude works and stops, with a lit lantern and a waiting bubble, whenever Claude needs the person: end of turn, permission prompt, `AskUserQuestion`, plan approval and notifications.
- Cream (light) and navy (dark) palettes from The Rogue Roadmap brand, with an accent that warms from dawn pink to sunset orange and night violet; `modo` option (`auto`, `claro`, `oscuro`).
- Terminal: a row above the prompt with a miniature road (`━━━◆┄┄┄ ▲`), the phase, the context % and the explorer's state; a status line entry; phase toasts.
- `/rogue-road` shows the phase ladder; `/acampar` (and the `⛺ Acampar` button from 75 %) compacts the conversation and brings a new dawn.
- Plugin icon.
