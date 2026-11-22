# sharingan

> [English](#english) · [Español](#español)

## English

A theme for Claude's interface inspired by the Sharingan. The eye is tied to the context window: the more context is used, the more tomoe it gains, until the load is such that the model starts to see things that are not there. Past 80 % the Mangekyō marks that degraded context as a genjutsu. **Kai (解)** compacts the conversation, breaks the illusion and brings the eye back to one tomoe.

| Context used | Stage | Eye |
|---|---|---|
| 0–25 % | Ittomoe · Despertar | One tomoe, slow spin |
| 25–50 % | Nitomoe · Percepción | Two tomoe, faint red vignette |
| 50–80 % | Santomoe · Carga plena | Three tomoe, fast spin, glow |
| 80–100 % | Mangekyō · Genjutsu | Mangekyō, slow hypnotic spin, red ripples, a red border on every reply |

What it adds:

- An animated backdrop with the eye of the current stage (desktop and mobile apps).
- Ink (dark) and washi paper (light) palettes whose red accent grows with each stage.
- A row above the prompt and a status line entry with the stage and context %, and a `解 Kai` button in Genjutsu.
- A toast when the stage changes, `/sharingan` with the details and `/kai` to compact.

Version 0.1.0.

### Install

```text
/plugin marketplace add therogueroadmap/rogue-mods
/plugin install sharingan@rogue-mods
```

### Settings

`Modo de color` in the plugin's config menu: `auto` (follows the app), `claro` (light) or `oscuro` (dark).

### Requirements

- Claude Code with mod support (hooks modules). The mod API is early access and may change between releases.
- The backdrop, colors and message styles only draw in the desktop and mobile apps. The terminal shows the row above the prompt, the status line and the commands.
- In `auto` mode the backdrop reads the app's mode on desktop; on mobile it may stay light. Pick `claro` or `oscuro` there.
- `/kai` compacts between turns; while Claude is answering it says so and does nothing.
- Use one theme mod at a time: the last theme set wins.

### Status

In progress.

## Español

Tema para la interfaz de Claude inspirado en el Sharingan. El ojo está atado a la ventana de contexto: cuanto más contexto se usa, más tomoe gana, hasta que pasado el 80 % el Mangekyō marca el contexto degradado como un genjutsu y cada respuesta lleva un borde rojo. **Kai (解)** compacta la conversación, rompe la ilusión y devuelve el ojo a un tomoe.

Agrega un fondo animado con el ojo de la etapa, modo oscuro (tinta) y claro (papel washi), una banda sobre el prompt con el botón `解 Kai` en Genjutsu, una entrada en la línea de estado, avisos al cambiar de etapa y los comandos `/sharingan` y `/kai`. La instalación, los ajustes y los requisitos están en la sección en inglés.

## License

MIT
