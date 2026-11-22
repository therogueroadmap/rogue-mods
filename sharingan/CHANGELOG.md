# Changelog

## [Unreleased]

## [1.0.0] - 2026-11-22

First stable release. No changes since 0.1.1.

## [0.1.1] - 2026-11-22

### Fixed
- `/kai` always answered that Claude was busy: a command cannot compact while it holds the session. It now leaves Kai pending and queues Claude Code's own `/compact` when the command's turn ends. The `解 Kai` button queues it right away.

## [0.1.0] - 2026-11-22

### Added
- Four stages tied to the context window: Ittomoe (0–25 %), Nitomoe (25–50 %), Santomoe (50–80 %) and Mangekyō · Genjutsu (80–100 %).
- Animated backdrop with the eye in the top-right corner, a red vignette that grows with each stage and slow red ripples in Genjutsu.
- Ink (dark) and washi paper (light) palettes whose red accent grows with each stage; `modo` option (`auto`, `claro`, `oscuro`).
- A red border on every reply while in Genjutsu: it may contain illusions.
- Row above the prompt and status line entry, stage toasts, `/sharingan` and `/kai` (compacts the conversation and breaks the genjutsu).
- Plugin icon.
