# rogue-road

> [English](#english) · [Español](#español)

## English

A theme for Claude's interface built on The Rogue Roadmap brand. A hooded explorer — the rogue — walks a winding road. The road is the context window: the explorer sets out at **dawn** with an empty context, and every answer pushes the sun west until **dusk** marks a context that is nearly full. **Acampar** (camp) compacts the conversation, and a new day begins.

The explorer walks only while Claude works. When Claude needs you — the turn ended, a permission prompt, a question, a plan to approve — it stops, lights its lantern and waits with a bubble over its head.

| Context used | Phase | Scene |
|---|---|---|
| 0–15 % | ◓ Alba | Sun rising on the left, violet and peach sky |
| 15–35 % | ☀ Mañana | Clear blue sky, the trail starts to glow orange |
| 35–55 % | ☀ Mediodía | Sun at its highest, halfway down the road |
| 55–75 % | ☀ Tarde | Golden light, long shadows |
| 75–90 % | ◒ Atardecer | Orange sunset, the `⛺ Acampar` button appears |
| 90–100 % | ☾ Anochecer | Stars, moon, the camp at the end of the road |

What it adds:

- An animated backdrop with the road, the sun, the explorer and the camp (desktop and mobile apps). The road keeps to the sides of the window, out of the reading column.
- A badge in the top-left corner, always in view: the explorer, a ring with the context used, the phase and its state.
- Cream (light) and navy (dark) palettes from the brand, with an accent that follows the time of day.
- Message styles: the person's messages in navy (cream at night), Claude's on paper.
- A row above the prompt and a status line entry, in every surface including the terminal: `◓ Alba  ━━━◆┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ▲  12 % · explorando`.
- A toast when the phase changes, `/rogue-road` with the details and `/acampar` to compact.

Version 0.2.0.

### Install

```text
/plugin marketplace add therogueroadmap/rogue-mods
/plugin install rogue-road@rogue-mods
```

### Settings

`Modo de color` in the plugin's config menu: `auto` (follows the app), `claro` (light) or `oscuro` (dark).

### Behaviour in the terminal (CLI)

The terminal draws no backdrop or colors, so the mod there is the row above the prompt — a miniature road where `━` is the ground covered, `◆` the explorer walking, `◇` the explorer waiting for you and `▲` the camp — plus the status line, the phase toasts and both commands. The `Ocultar` button hides the row until the next `/rogue-road`.

### Requirements

- Claude Code with mod support (hooks modules). The mod API is early access and may change between releases.
- The backdrop, colors and message styles only draw in the desktop and mobile apps. The terminal shows the row above the prompt, the status line and the commands.
- In `auto` mode the backdrop reads the app's mode on desktop; on mobile it may stay light. Pick `claro` or `oscuro` there.
- `/acampar` compacts between turns; it is queued and runs as soon as Claude is free.
- Use one theme mod at a time: the last theme set wins.

### Status

In progress.

## Español

Tema para la interfaz de Claude con el brand de The Rogue Roadmap. Un explorador encapuchado —el rogue— recorre un camino sinuoso que es la ventana de contexto: sale al **amanecer** con el contexto vacío y cada respuesta empuja el sol hacia el oeste, hasta que el **atardecer** y el anochecer marcan un contexto casi lleno. **Acampar** (`/acampar` o el botón `⛺ Acampar`) compacta la conversación y empieza un nuevo día.

El explorador solo camina mientras Claude trabaja. Cuando Claude te necesita (terminó el turno, pide un permiso, hace una pregunta o espera que apruebes un plan) se detiene, enciende su farol y espera con un globo sobre la cabeza.

Agrega un fondo animado (apps de escritorio y móvil), paletas crema (claro) y navy (oscuro) del brand con un acento que sigue la hora del día, estilos de mensaje, una banda sobre el prompt con un camino en miniatura que también funciona en la terminal, una entrada en la línea de estado, avisos al cambiar de fase y los comandos `/rogue-road` y `/acampar`. La instalación, los ajustes y los requisitos están en la sección en inglés.

## License

MIT
