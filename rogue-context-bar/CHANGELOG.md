# Changelog

## [Unreleased]

## [1.0.0] - 2026-11-23

First release in the catalog, based on the `context-bar` example in the Claude Code mods documentation.

### Added
- An extras line under the legend: the model, each usage-limit window with its fill and reset (with the weekday when it is not today), the auto-compaction threshold and the estimated session cost. It refreshes when the context, the limits or the cost change.
- Warning colours: the context percentage turns yellow from 45 % and red from 60 %, each usage limit from 70 % and 90 %.
- An icon from the brand build.

### Changed
- The tests answer the engine events the current test harness requires (`session.start`, `session.measure`, `ui.status`, `$.store`).
