# Rogue Road · Ideas para próximas versiones

Ideas propuestas para seguir desarrollando el mod `rogue-road` después de la 0.5.0. La 0.6.0 implementó la 1, 2, 3, 5, 6 y 8; quedan pendientes la 4 y la 7. El mod se declaró estable en la 1.0.0; estas dos quedan para una versión futura. El orden va de mayor a menor impacto estimado. Todas son posibles con la API de mods actual.

**Recomendación para empezar:** la **1 + 4** (hitos y días de viaje), porque le dan sentido al camino más allá del porcentaje. La **7** es la más útil en el día a día.

| # | Idea | Grupo | Superficie | Estado |
|---|------|-------|------------|--------|
| 1 | Hitos reales en el camino | El viaje cuenta la sesión | Desktop + CLI | Hecha en 0.6.0 |
| 2 | El clima como estado del trabajo | El viaje cuenta la sesión | Desktop | Hecha en 0.6.0 |
| 3 | Compañeros de viaje (subagentes) | El viaje cuenta la sesión | Desktop + CLI | Hecha en 0.6.0 |
| 4 | Días de viaje persistentes | Continuidad | Desktop + CLI | Propuesta (recomendada) |
| 5 | Bitácora en un panel lateral | Continuidad | Desktop | Hecha en 0.6.0 |
| 6 | Sonido ambiental por fase | Presencia | Desktop | Hecha en 0.6.0 |
| 7 | Aviso al teléfono si llevas rato sin responder | Presencia | Desktop + CLI | Propuesta (más práctica) |
| 8 | Fondo interactivo | Presencia | Desktop | Hecha en 0.6.0 |

---

## Que el viaje cuente lo que pasa en la sesión

### 1. Hitos reales en el camino

Cada commit, test que pasa o PR abierto deja una piedra (un cairn) en el camino, en el punto del contexto donde ocurrió. Al pasar el puntero se ve qué fue. Así el paisaje sirve también como memoria visual de la sesión.

- **Cómo:** escuchar `classic.PostToolUse` sobre `Bash` y reconocer `git commit`, ejecuciones de tests con código de salida 0 y la creación de PRs. Guardar `{kind, label, percent}` en el estado.
- **Escena:** `scene.ts` ya dibuja cairns. Se pueden posicionar con `roadPoint(percent)` y agregar `<title>` para el tooltip.
- **CLI:** marcas en el mini camino de la banda (`━◆━•━•┄ ▲`).
- **Cuidado:** limitar la cantidad (por ejemplo, 24) para respetar `MAX_SVG`.

### 2. El clima como estado del trabajo

Si las herramientas fallan seguido, se nubla y llueve; cuando los tests pasan, se despeja. Si el límite de 5 h pasa del 80 %, se acerca una tormenta en el horizonte y aparece un aviso.

- **Cómo:** una ventana móvil de resultados de `PostToolUse` / `PostToolUseFailure` y los `rateLimits` de `session.measure`.
- **Escena:** capas de nubes más densas, lluvia en CSS lenta y relámpagos lejanos. En reduced motion, solo las nubes.

### 3. Compañeros de viaje

Cada subagente aparece como una figura pequeña que camina detrás del viajero y se va al terminar. Así se ve cuánto trabajo en paralelo hay en curso.

- **Cómo:** `turn.start` / `turn.complete` con `agentId` (hoy se ignoran) para contar los agentes activos.
- **Escena:** versiones reducidas del viajero en la viñeta, con un desfase en la animación. Como máximo 3 visibles, más un «+N».
- **CLI:** `· 2 compañeros` en la banda.

## Que el viaje continúe

### 4. Días de viaje

Cada vez que acampas se cuenta un día, que se guarda de una sesión a otra. La insignia diría «Día 3 · Mañana». Al acampar se guarda un resumen breve del día: commits, archivos tocados y tiempo.

- **Cómo:** estado persistente del plugin (por proyecto). Se incrementa en el `/acampar` y en la compactación automática.
- **Resumen:** contar los `Edit` / `Write` (archivos únicos), los commits (idea 1) y la duración desde el amanecer.
- **Banda:** mostrar el resumen del día anterior en el aviso de «Nuevo amanecer».

### 5. Una bitácora en un panel lateral

Sería un panel junto a la conversación con el diario de ruta, mostrando cada fase con lo que se hizo en ella y los hitos de la idea 1.

- **Cómo:** un componente de panel en desktop que lee el mismo estado que la banda.
- **Depende de:** las ideas 1 y 4.

## Detalles de presencia

### 6. Sonido ambiental

Para escritorio, se activa con el parlante de la barra de título. Sería suave y por fase: pájaros al alba, viento al mediodía, grillos al atardecer y la fogata de noche. También tendría sonidos breves al enviar, al terminar y al pedir permiso. La app los sintetiza, así que no hay archivos de audio.

- **Cuidado:** apagado por defecto y con el volumen bajo. Agregar una opción en `userConfig`.

### 7. Aviso en el teléfono si llevas rato sin responder

Si el explorador te espera más de 5 minutos, por ejemplo por un permiso pendiente, llega una notificación: «El viajero te espera desde hace 5 min». Se cancela sola si vuelves antes.

- **Cómo:** al pasar a `espera` por `PermissionRequest`, `AskUserQuestion` o `ExitPlanMode`, programar un temporizador. Cancelarlo en `turn.start` o `PostToolUse`.
- **Configuración:** los minutos de espera en `userConfig` (5 por defecto, 0 lo desactiva).

### 8. Fondo interactivo

Un clic en el campamento acampa, un clic en el viajero muestra la fase y un consejo, y un clic en el sol muestra el desglose del contexto.

- **Cómo:** zonas clicables en el `Backdrop` que disparan `acampar` o un toast.
- **Cuidado:** que los clics no interfieran con la conversación. Usar solo la viñeta y la insignia, que quedan fuera del área de mensajes.

---

## Otros pendientes

- Actualizar el artifact del Design System en claude.ai con la figura nueva del viajero. La ilustración y la tarjeta Explorer todavía muestran al explorador anterior.
- Regenerar `.claude-plugin/icon.png` con el build del brand (resvg) en lugar de Chromium.
