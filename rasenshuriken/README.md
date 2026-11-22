# rasenshuriken

> [English](#english) · [Español](#español)

## English

A theme for Claude's interface inspired by the Fūton: Rasenshuriken. The jutsu is tied to the context window: as it fills up, the jutsu loses power and decays through five stages. Compacting or starting a new conversation restores it.

| Context used | Stage | Power |
|---|---|---|
| 0–20 % | Fūton: Rasenshuriken | 100 % |
| 20–40 % | Unstable Rasenshuriken | 78 % |
| 40–60 % | Ōdama Rasengan | 55 % |
| 60–80 % | Rasengan | 32 % |
| 80–100 % | Incomplete Rasengan | 12 % |

What it adds:

- An animated backdrop with the current stage's emblem (desktop and mobile apps).
- Night (dark) and day-sky (light) palettes whose accent fades with each stage.
- A row above the prompt and a status line entry with the stage, context % and power.
- A toast when the stage changes, and a `/chakra` command with the details.

Version 0.2.0.

### Install

```text
/plugin marketplace add therogueroadmap/rogue-mods
/plugin install rasenshuriken@rogue-mods
```

### Settings

`Modo de color` in the plugin's config menu: `auto` (follows the app), `claro` (light) or `oscuro` (dark).

### Requirements

- Claude Code with mod support (hooks modules). The mod API is early access and may change between releases.
- The backdrop, colors and message styles only draw in the desktop and mobile apps. The terminal shows the row above the prompt, the status line and `/chakra`.
- In `auto` mode the backdrop reads the app's mode on desktop; on mobile it may stay light. Pick `claro` or `oscuro` there.
- Use one theme mod at a time: the last theme set wins.

### Status

In progress.

## Español

Tema para la interfaz de Claude inspirado en el Fūton: Rasenshuriken. El jutsu está atado a la ventana de contexto: a medida que se llena, pierde poder y se degrada en cinco etapas, hasta un Rasengan simple. Al compactar o abrir una conversación nueva, el chakra se restaura.

Agrega un fondo animado con el emblema de la etapa, modo oscuro (noche) y claro (cielo de día), una banda sobre el prompt, una entrada en la línea de estado, avisos al cambiar de etapa y el comando `/chakra`. La instalación, los ajustes y los requisitos están en la sección en inglés.

## License

MIT
