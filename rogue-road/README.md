# rogue-road

> [English](#english) · [Español](#español)

## English

A theme for Claude's interface built on The Rogue Roadmap brand. A hooded traveller — the rogue, with a backpack, a map and a lantern — walks a winding road. The road is the context window: the explorer sets out at **dawn** with an empty context, and every answer pushes the sun west until **dusk** marks a context that is nearly full. **Acampar** (camp) compacts the conversation, and a new day begins.

The explorer lives in a vignette in the bottom-left corner, beside the conversation. While Claude works it walks in place and the world scrolls behind it. When Claude needs you — the turn ended, a permission prompt, a question, a plan to approve — everything stops: it lights its lantern and waits with a bubble over its head. On the landscape behind, an orange marker shows how far along the road it is.

The day also changes the light: the mountains glow on the sun's side, the explorer's shadow is long at dawn and dusk, haze thickens through the day, birds cross the morning, fireflies come out at dusk and a campfire burns at the camp at nightfall.

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
- A toast when the phase changes, `/rogue-road-mod` with the details and `/make-camp` to compact.
- **Milestones on the road.** Each commit, push, pull request or test run that passes plants a small flag on the road where it happened in the context (orange commit, green tests, violet PR, cream push). The row above the prompt marks them with `•`. A new dawn starts a fresh road; the logbook keeps the old ones.
- **Weather that follows the work.** Two failed tools in the last ten cloud the sky, four bring rain, and tests that pass clear it. A usage limit over 80 % brings a storm with distant lightning. Each change comes with a toast.
- **Travel companions.** Each subagent walks beside the explorer while it works (up to three, then `+N`) and leaves when it finishes. The row shows `⚇ N`.
- **A logbook pane.** `/logbook`, the `Bitácora` button or a click on the badge opens a pane beside the conversation: today's milestones, phases, weather and companions grouped by phase, with the time and the context at each, plus a summary of earlier days.
- **Ambient sound (desktop).** Birds at dawn, wind at midday, crickets at dusk and the campfire at night, with rain and thunder when the weather turns, and short cues when you send, when Claude finishes, asks or fails, and when you camp. The app synthesises it: there are no audio files. Turn it on with the speaker in the session's title bar; turn the mod's sound on or off with `/sound on|off`, the `♪` button in the row, or the `Sonido ambiental` setting.
- **An interactive backdrop.** Click the badge to open the logbook, the explorer for the phase and a tip, and the camp to camp from 75 % on.

- **Closing the day.** `/clear-trail` clears the context and starts from nothing. `/trail-log [focus]` asks Claude for an end-of-session summary. `/pass-the-map [purpose]` asks Claude for a handoff file a new session can pick up, with the [`handoff`](https://github.com/mattpocock/skills/blob/main/docs/productivity/handoff.md) skill when it is installed. Both attach the day's logbook.

- **Three languages.** Spanish, English or French for the row, the logbook, the toasts, the badge and the requests to Claude; the commands stay in English.

Version 0.9.1.

### Install

```text
/plugin marketplace add therogueroadmap/rogue-mods
/plugin install rogue-road@rogue-mods
```

### Settings

In the plugin's config menu:

- `Idioma · Language · Langue`: `español` (default), `english` or `français`.
- `Modo de color`: `auto` (follows the app), `claro` (light) or `oscuro` (dark).
- `Sonido ambiental`: `activado` (default) or `desactivado`. `/sound` and the row's `♪` button change it for the session and remember the choice until this setting changes.

### The row above the prompt

The same row draws in the terminal and in the desktop app:

```text
☀ Mediodía ━━•━━━•━━━━◇┄┄┄┄┄┄┄ ▲ 49 % · 154.6k/1M · esperándote · ☁ nublado · ⚇ 2      ☰  ♪  ▴  Ocultar
██████████████████▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
■ System prompt 4.5k  ■ System tools 21.3k  ■ Memory files 8.3k  ■ Messages 105.5k  ▒ Autocompact buffer 33k  ░ Free space 812.4k
Opus 5.5 · límite 5 h 23 % (reinicia 18:00) · límite 7 días 41 % · autocompacta a 967k · ≈ US$ 3.20 (estimado)
```

The bar and the legend are `/context`'s breakdown, each category in the colour `/context` gives it, estimated locally after each model response (no extra requests). The cost is an estimate, not the bill. `▴` / `▾` shows or hides everything below the first line, `☰` opens the logbook, `♪` turns the sound on or off and `Ocultar` hides the row.

### Behaviour in the terminal (CLI)

The terminal draws no backdrop or colors, so the mod there is the row above the prompt — a miniature road where `━` is the ground covered, `◆` the explorer walking, `◇` the explorer waiting for you and `▲` the camp — plus the status line, the phase and weather toasts, the logbook pane (opened with `/logbook`) and the commands. The terminal plays no sound. The `Ocultar` button hides the row until the next `/rogue-road-mod`.

### Requirements

- Claude Code with mod support (hooks modules). The mod API is early access and may change between releases.
- The backdrop, colors and message styles only draw in the desktop and mobile apps. The terminal shows the row above the prompt, the status line and the commands.
- In `auto` mode the backdrop reads the app's mode on desktop; on mobile it may stay light. Pick `claro` or `oscuro` there.
- `/make-camp` compacts between turns; it is queued and runs as soon as Claude is free.
- Use one theme mod at a time: the last theme set wins.

### Status

In progress.

## Español

Tema para la interfaz de Claude con el brand de The Rogue Roadmap. Un explorador encapuchado —el rogue— recorre un camino sinuoso que es la ventana de contexto: sale al **amanecer** con el contexto vacío y cada respuesta empuja el sol hacia el oeste, hasta que el **atardecer** y el anochecer marcan un contexto casi lleno. **Acampar** (`/make-camp` o el botón `⛺ Acampar`) compacta la conversación y empieza un nuevo día.

El explorador solo camina mientras Claude trabaja. Cuando Claude te necesita (terminó el turno, pide un permiso, hace una pregunta o espera que apruebes un plan) se detiene, enciende su farol y espera con un globo sobre la cabeza.

El explorador vive en una viñeta en la esquina inferior izquierda: camina en el lugar con el mundo desplazándose detrás mientras Claude trabaja, y se detiene a esperarte cuando Claude te necesita. La luz, las sombras, la bruma, los pájaros, las luciérnagas y la fogata siguen la hora del día.

Agrega un fondo animado (apps de escritorio y móvil), paletas crema (claro) y navy (oscuro) del brand con un acento que sigue la hora del día, estilos de mensaje, una banda sobre el prompt con un camino en miniatura que también funciona en la terminal, una entrada en la línea de estado, avisos al cambiar de fase y los comandos `/rogue-road-mod` y `/make-camp`. Desde la 0.6.0 el viaje también cuenta lo que pasa en la sesión:

- **Hitos en el camino:** cada commit, push, PR o ejecución de tests que pasa deja un banderín donde ocurrió (naranja, verde, violeta o crema). En la banda se ven como `•`.
- **Clima:** dos herramientas fallidas de las últimas diez nublan el cielo, cuatro traen lluvia y los tests en verde lo despejan. Un límite de uso sobre el 80 % trae tormenta.
- **Compañeros de viaje:** cada subagente camina junto al explorador mientras trabaja y se va al terminar.
- **Bitácora:** `/logbook`, el botón `Bitácora` o un clic en la insignia abren un panel con los hitos, fases, clima y compañeros del día, agrupados por fase, y un resumen de los días anteriores.
- **Sonido ambiental (escritorio):** pájaros al alba, viento al mediodía, grillos al atardecer y la fogata de noche, más lluvia y truenos según el clima, y señales breves al enviar, terminar, preguntar, fallar y acampar. Se activa con el parlante de la barra de título; el sonido del mod se habilita o deshabilita con `/sound on|off`, el botón `♪` de la banda o el ajuste `Sonido ambiental`.
- **Fondo interactivo:** un clic en la insignia abre la bitácora, en el explorador muestra la fase y un consejo y en el campamento acampa (desde el 75 %).

Para cerrar el día: `/clear-trail` limpia el contexto y empieza de cero, `/trail-log [foco]` le pide a Claude el resumen de la sesión y `/pass-the-map [propósito]` le pide un handoff para continuar en una sesión nueva (con la skill `handoff` si está instalada). Los dos últimos adjuntan la bitácora del día.

El ajuste **Idioma** elige español, inglés o francés para la banda, la bitácora, los avisos, la insignia y los pedidos a Claude; los comandos quedan en inglés.

La instalación, los ajustes y los requisitos están en la sección en inglés.

## License

MIT
