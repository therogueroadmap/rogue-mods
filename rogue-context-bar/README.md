# rogue-context-bar

> [English](#english) · [Español](#español)

## English

A context bar above the prompt, with no theme. It shows how the context window is spent, by `/context` category, and the session's usage limits and cost, in the terminal and in the desktop app.

```text
██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Context 7% · 68.8k/1M  ■ System prompt 4.5k  ■ System tools 21.3k  ■ Messages 25.2k  ■ Autocompact buffer 33k  ■ Free space 898.2k
claude-opus-5-5 · 5h limit 9% (resets 23:10) · 7d limit 45% (resets Fri 20:00) · autocompacts at 967k · ≈ US$0.31 (estimated)
```

- **The bar** fills the row's whole width, one colour per category, as `/context` draws them.
- **The legend** names each category with its tokens, after the context percentage and the tokens used out of the window.
- **The extras line** shows the model, each usage-limit window with its fill and when it resets (with the weekday when it is not today), the token count at which auto-compaction runs, and the session's estimated cost. Parts with no data are left out.
- **Warning colours:** the context percentage turns yellow from 45 % and red from 60 %; each usage limit turns yellow from 70 % and red from 90 %.
- **`/context-bar`** hides or shows the bar, and the choice is kept across sessions.

The figures are `/context`'s local estimate (no extra requests). The cost is an estimate, not the bill.

### Install

```text
/plugin marketplace add therogueroadmap/rogue-mods
/plugin install rogue-context-bar@rogue-mods
```

Restart Claude Code after installing so the bar loads.

It combines with any theme. `rogue-road` already shows the same breakdown in its own row, so with both installed you see it twice: use one or the other.

### Credits

Based on the `context-bar` example in the Claude Code mods documentation, extended with the usage limits, the auto-compaction threshold, the estimated cost and the warning colours.

## Español

Una barra de contexto sobre el prompt, sin tema. Muestra en qué se gasta la ventana de contexto, por categoría de `/context`, y los límites de uso y el costo de la sesión, en la terminal y en la app de escritorio.

- **La barra** ocupa todo el ancho de la fila, un color por categoría, como las dibuja `/context`.
- **La leyenda** nombra cada categoría con sus tokens, después del porcentaje de contexto y los tokens usados sobre la ventana.
- **La línea de extras** muestra el modelo, cada ventana de límite de uso con su porcentaje y cuándo se reinicia (con el día de la semana si no es hoy), los tokens a los que se autocompacta y el costo estimado de la sesión. Lo que no tiene datos no aparece.
- **Colores de alerta:** el porcentaje de contexto se pone amarillo desde el 45 % y rojo desde el 60 %; cada límite de uso, amarillo desde el 70 % y rojo desde el 90 %.
- **`/context-bar`** oculta o muestra la barra, y la elección se recuerda entre sesiones.

Las cifras son la estimación local de `/context` (sin pedidos extra). El costo es una estimación, no la factura.

Para instalarlo, usa los dos comandos de arriba y reinicia Claude Code. Se combina con cualquier tema; `rogue-road` ya muestra el mismo desglose en su fila, así que conviene usar uno u otro.

Basado en el ejemplo `context-bar` de la documentación de mods de Claude Code, con los límites de uso, el umbral de autocompactación, el costo estimado y los colores de alerta añadidos.
