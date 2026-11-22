import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Ledger, LedgerRow, Pace, Trail } from '../types'
import { makeColors } from './make-colors.js'
import { BRAND, scene } from './scene'
import type { Hex, Mode } from './scene'

// ─── Las seis fases del día ──────────────────────────────────────────
// La exploración empieza al alba con el contexto vacío; cada respuesta
// empuja el sol hacia el oeste. Al anochecer conviene acampar (/acampar
// compacta la conversación) para que vuelva a amanecer.

type Phase = {
  name: string
  icon: string
  from: number
  tip: string
  /** Matiz del acento del tema en esta fase. */
  accent: Hex
}

const PHASES: Phase[] = [
  { name: 'Alba', icon: '◓', from: 0, accent: '#E0708D', tip: 'El camino está despejado: contexto fresco y todo por explorar.' },
  { name: 'Mañana', icon: '☀', from: 15, accent: '#F7792C', tip: 'Buen ritmo. El explorador avanza con el sol a la espalda.' },
  { name: 'Mediodía', icon: '☀', from: 35, accent: '#F7792C', tip: 'Medio camino recorrido. La conversación tiene mucho contexto útil.' },
  { name: 'Tarde', icon: '☀', from: 55, accent: '#F2672E', tip: 'Las sombras se alargan: lo más antiguo de la conversación empieza a pesar.' },
  { name: 'Atardecer', icon: '◒', from: 75, accent: '#EC553F', tip: 'Queda poca luz. Planea dónde acampar: /acampar compacta y trae un nuevo amanecer.' },
  { name: 'Anochecer', icon: '☾', from: 90, accent: '#8C7BEA', tip: 'Caminar de noche es arriesgado: el contexto está casi lleno. Acampa con /acampar.' },
]

const LAST = PHASES.length - 1
const CAMP_FROM = 75

const phaseAt = (i: number): Phase => PHASES[Math.max(0, Math.min(LAST, i))] ?? PHASES[0]!

const phaseOf = (percent: number | null): number => {
  const p = percent ?? 0
  let i = 0
  while (i < LAST && p >= (PHASES[i + 1]?.from ?? 101)) {
    i++
  }

  return i
}

const modeOf = (value: unknown): Mode => (value === 'claro' || value === 'oscuro' ? value : 'auto')

// ─── Colores: papel crema de día, navy de noche ──────────────────────

const LIGHT_ANCHORS = {
  'surface-0': '#F4EAD6',
  'surface-1': '#F8F0E0',
  'surface-2': '#FCF6EA',
  'surface-3': '#FCF6EA',
  'text-primary': '#0A1B35',
  'text-secondary': '#2E3D57',
  'text-muted': '#56627A',
}

const DARK_ANCHORS = {
  'surface-0': '#0A1B35',
  'surface-1': '#0E213F',
  'surface-2': '#122746',
  'surface-3': '#152B4D',
  'text-primary': '#FCF3E1',
  'text-secondary': '#D9D0BF',
  'text-muted': '#AFAA9F',
}

const ROLES = { danger: '#E5484D', success: '#4CC38A', warning: '#F5B544', pro: '#9D8CF2' }
const LIGHT_ROLES = { danger: '#C42B3A', success: '#2F7D55', warning: '#9A6212', pro: '#6550C8' }

const themes = PHASES.map(ph => {
  const made = makeColors({
    label: `Rogue Road · ${ph.name}`,
    roles: { accent: ph.accent, ...ROLES },
    light: { roles: { accent: ph.accent, ...LIGHT_ROLES }, gray: { anchors: LIGHT_ANCHORS } },
    dark: { gray: { anchors: DARK_ANCHORS } },
  })
  const inputs = made.theme.inputs as Record<string, Record<string, string> | undefined>
  inputs.light = {
    ...inputs.light,
    'bg-user-message': '#0A1B35',
    'text-user-message': '#FCF3E1',
    'bg-assistant-message': '#FCF6EA',
    'text-assistant-message': '#0A1B35',
  }
  inputs.dark = {
    ...inputs.dark,
    'bg-user-message': '#FCF3E1',
    'text-user-message': '#0A1B35',
    'bg-assistant-message': '#0E213F',
    'text-assistant-message': '#FCF3E1',
  }

  return made
})

// ─── El tema completo de una fase ────────────────────────────────────

const look = (i: number, mode: Mode): ThemeSetArgs => ({
  colors: themes[Math.max(0, Math.min(LAST, i))]?.theme,
  ...(mode === 'auto' ? {} : { overrideColorScheme: mode === 'claro' ? ('light' as const) : ('dark' as const) }),
  backdrop: { scene: `fase-${i + 1}-${mode}`, glass: { blur: 16, opacity: 0.7 } },
  style: {
    Heading: { color: 'text-accent', fontWeight: 'semibold' },
    UserMessage: { backgroundColor: 'bg-user-message', color: 'text-user-message', radius: [18, 18, 4, 18], paddingX: 16, paddingY: 12 },
    AssistantMessage: { backgroundColor: 'bg-assistant-message', color: 'text-assistant-message', borderColor: 'border', borderWidth: 1, radius: [4, 18, 18, 18], paddingX: 16, paddingY: 12 },
    ToolUse: { color: 'text-secondary', backgroundColor: 'surface-2', radius: 10, paddingX: 8 },
  },
})

const statusOf = (trail: Trail, pace: Pace): string => {
  const ph = phaseAt(trail.phase)
  const pct = trail.percent === null ? '' : ` · ${trail.percent} %`

  return `${ph.icon} ${ph.name}${pct} · ${pace === 'explora' ? 'explorando' : 'esperándote'}`
}

// El tema se pinta una vez por fase y por carga del módulo: si el mod se carga
// a mitad de sesión, o la app se conecta después, el primer evento lo pinta.
let paintedPhase = -1
let lastDraw = 'sin pintar aún'

async function applyPhase($: EngineInterface, i: number, mode: Mode): Promise<void> {
  const set = await $.theme.set(look(i, mode)).catch(async (error: unknown) => {
    // Una versión que no acepta `style`: el tema sin estilos de mensaje.
    $.ui.log(String(error))
    const { style: _style, ...plain } = look(i, mode)

    return $.theme.set(plain)
  })
  paintedPhase = set.isDrawn ? i : -1
  lastDraw = set.isDrawn ? 'pintado' : `no pintado: ${set.reason ?? 'sin motivo'}`
  if (!set.isDrawn) {
    $.ui.log(`rogue-road: ${lastDraw}`)
  }
}

async function ensurePainted($: EngineInterface, mode: Mode): Promise<void> {
  const { phase } = await read($, trail)
  if (paintedPhase !== phase) {
    await applyPhase($, phase, mode)
  }
}

// /acampar encarga el /compact de Claude Code, que corre en cuanto la sesión
// queda libre. Quien lo pide aún tiene la sesión ocupada: no se espera.
const CAMP_FOCUS = 'Conserva el rumbo: objetivos, decisiones tomadas, archivos tocados y próximos pasos. Descarta lo explorado sin salida.'
const CAMP_TEXT = '⛺ Acampando: la conversación se compacta en cuanto Claude queda libre. Mañana amanece de nuevo.'

function camp($: EngineInterface): void {
  $.command.run({ command: 'compact', args: CAMP_FOCUS }).catch((error: unknown) => {
    $.ui.log(`rogue-road: no se pudo acampar: ${String(error)}`)
    $.ui.toast('No se pudo acampar. Usa /compact directamente.')
  })
}

/** Camino en miniatura para la terminal: recorrido, explorador, por recorrer y campamento. */
const miniRoad = (percent: number | null, pace: Pace, cells = 18): { done: string; rogue: string; ahead: string } => {
  const at = Math.round((Math.min(percent ?? 0, 100) / 100) * (cells - 1))

  return { done: '━'.repeat(at), rogue: pace === 'explora' ? '◆' : '◇', ahead: '┄'.repeat(cells - 1 - at) }
}

// ─── Estado ──────────────────────────────────────────────────────────

const trail = atom({ plugin: 'rogue-road', key: 'trail' } as const, { phase: 0, percent: null } as Trail)
const pace = atom({ plugin: 'rogue-road', key: 'pace' } as const, 'espera' as Pace)
const isBandHidden = atom({ plugin: 'rogue-road', key: 'isBandHidden' } as const, false)
const isCampPending = atom({ plugin: 'rogue-road', key: 'isCampPending' } as const, false)
const ledger = atom({ plugin: 'rogue-road', key: 'ledger' } as const, null as Ledger | null)
const isDetailed = atom({ plugin: 'rogue-road', key: 'isDetailed' } as const, true)

// ─── El libro de ruta: lo que la banda cuenta además del camino ──────

/** Tokens legibles: 812, 4.5k, 154.6k, 1M. */
const tokensOf = (n: number): string => {
  if (n >= 1_000_000) {
    return `${Math.round(n / 100_000) / 10}M`.replace('.0M', 'M')
  }
  if (n >= 1000) {
    return `${Math.round(n / 100) / 10}k`.replace('.0k', 'k')
  }

  return String(Math.round(n))
}

const LIMIT_NAMES: Record<string, string> = { five_hour: '5 h', seven_day: '7 días', spend_limit: 'gasto' }

/** Hora local corta de un instante ISO, para el reinicio de un límite. */
const resetOf = (iso: string | null): string => {
  if (iso === null) {
    return ''
  }
  const d = new Date(iso)

  return Number.isNaN(d.getTime()) ? '' : ` (reinicia ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')})`
}

/**
 * Lee el contexto con el desglose de /context, estimado localmente (`summary`:
 * no envía pedidos), más los límites de uso y el costo.
 */
async function refreshLedger($: EngineInterface): Promise<void> {
  const usage = await $.session.usage({ breakdown: 'summary' }).catch(() => $.session.usage())
  const b = usage.context.breakdown
  const rows: LedgerRow[] = (b?.categories ?? [])
    .filter(c => c.kind !== 'deferred' && c.tokens > 0)
    .map(c => ({ name: c.name, tokens: c.tokens, color: c.color, kind: c.kind }))
  const next: Ledger = {
    tokens: usage.context.tokens ?? null,
    window: usage.context.window,
    rows,
    max: b?.rawMaxTokens ?? usage.context.window,
    threshold: b?.autoCompactThreshold ?? null,
    model: b?.model ?? null,
    limits: usage.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt ?? null })),
    usd: usage.cost?.usd ?? null,
  }
  await update($, ledger, () => next)
}

/**
 * La barra del desglose, de `width` celdas: cada categoría en su color, el
 * colchón de autocompactación en ▒ y el espacio libre en ░. Reparte las celdas
 * por el método del mayor resto, así siempre suman `width`.
 */
const barOf = (rows: LedgerRow[], max: number, width: number): { row: LedgerRow; cells: number }[] => {
  const order = [...rows.filter(r => r.kind === 'used'), ...rows.filter(r => r.kind === 'buffer'), ...rows.filter(r => r.kind === 'free')]
  const total = Math.max(max, order.reduce((sum, r) => sum + r.tokens, 0))
  const exact = order.map(r => (r.tokens / total) * width)
  const cells = exact.map(Math.floor)
  let left = width - cells.reduce((a, c) => a + c, 0)
  const byRest = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of byRest) {
    if (left <= 0) {
      break
    }
    cells[i] = (cells[i] ?? 0) + 1
    left--
  }

  return order.map((row, i) => ({ row, cells: cells[i] ?? 0 })).filter(x => x.cells > 0)
}

async function setPace($: EngineInterface, next: Pace): Promise<void> {
  if ((await read($, pace)) === next) {
    return
  }
  await update($, pace, () => next)
  $.ui.status(statusOf(await read($, trail), next))
}

export const register: Register = (on, options) => {
  const mode = modeOf(options.modo)

  on('session.start', async ($, e, next) => {
    const unpainted = themes.flatMap(t => t.problems).find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.log(unpainted)
    }

    await $.command.register({ name: 'rogue-road', description: 'Muestra en qué punto del camino (y del día) va la sesión' })
    await $.command.register({ name: 'acampar', description: 'Acampa: compacta la conversación y vuelve a amanecer' })

    const { context } = await $.session.usage()
    const percent = context.percent ?? null
    const phase = phaseOf(percent)
    await update($, trail, () => ({ phase, percent }))
    await update($, pace, () => 'espera' as Pace)
    await refreshLedger($).catch(() => undefined)
    await applyPhase($, phase, mode)
    $.ui.status(statusOf({ phase, percent }, 'espera'))

    return next(e)
  })

  // El contexto mueve el sol y al explorador.
  on('session.measure', async ($, e, next) => {
    // El libro de ruta sigue al contexto, a los límites y al costo.
    await refreshLedger($).catch(() => undefined)
    if (e.changed.includes('context')) {
      const percent = e.context.percent ?? null
      const phase = phaseOf(percent)
      const before = await read($, trail)
      await update($, trail, () => ({ phase, percent }))
      $.ui.status(statusOf({ phase, percent }, await read($, pace)))

      if (before.phase !== phase || paintedPhase !== phase) {
        await applyPhase($, phase, mode)
      }
      if (before.phase !== phase) {
        const ph = phaseAt(phase)
        if (phase < before.phase) {
          $.ui.toast(`Nuevo amanecer: ${ph.name}. El campamento quedó atrás y el camino sigue.`)
        } else if (phase >= LAST) {
          $.ui.toast(`☾ Anochecer: el contexto está casi lleno. /acampar para compactar y amanecer de nuevo.`)
        } else if ((PHASES[phase]?.from ?? 0) >= CAMP_FROM) {
          $.ui.toast(`◒ Atardecer: queda poca luz. Piensa dónde acampar (/acampar).`)
        } else {
          $.ui.toast(`${ph.icon} ${ph.name}: el explorador sigue el camino.`)
        }
      }
    }

    return next(e)
  })

  // Una app que se conecta después del inicio recibe el tema.
  on('session.attach', async ($, e, next) => {
    const result = await next(e)
    await applyPhase($, (await read($, trail)).phase, mode)

    return result
  })

  // ─── Caminar o esperar ─────────────────────────────────────────────
  // Camina mientras Claude trabaja; se detiene (con su farol y un globo de
  // espera) cuando Claude necesita a la persona: al terminar el turno, ante
  // un permiso, una pregunta o la aprobación de un plan.

  on('turn.start', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      await setPace($, 'explora')
      await ensurePainted($, mode)
    }

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      await setPace($, 'espera')
      if (await read($, isCampPending)) {
        await update($, isCampPending, () => false)
        camp($)
      }
    }

    return result
  })

  on('classic.PermissionRequest', async ($, e, next) => {
    await setPace($, 'espera')

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.Notification', async ($, e, next) => {
    if (e.notification_type !== 'auth_success') {
      await setPace($, 'espera')
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.PostToolUse', async ($, e, next) => {
    await setPace($, 'explora')

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.PostToolUseFailure', async ($, e, next) => {
    await setPace($, 'explora')

    return next(e)
  }).catch(($, e, next) => next(e))

  // Una pregunta o un plan por aprobar: espera mientras el diálogo está abierto.
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    await setPace($, 'espera')
    const result = await next(e)
    await setPace($, 'explora')

    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'ExitPlanMode' }, async ($, e, next) => {
    await setPace($, 'espera')
    const result = await next(e)
    await setPace($, 'explora')

    return result
  }).catch(($, e, next) => next(e))

  // ─── Lo que se dibuja ──────────────────────────────────────────────

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== 'rogue-road' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const { percent, phase } = await read($, trail)
    const now = await read($, pace)
    const ph = phaseAt(phase)
    const alt = `${ph.name}: un explorador encapuchado ${now === 'explora' ? 'camina' : 'espera con su farol'} sobre un camino; ${percent ?? 0} % del contexto recorrido`

    return <Svg source={scene({ percent, pace: now, mode, label: ph.name })} alt={alt} isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isBandHidden))) {
      return next(e)
    }
    const { phase, percent } = await read($, trail)
    const now = await read($, pace)
    const book = await read($, ledger)
    const detailed = await read($, isDetailed)
    const ph = phaseAt(phase)
    const road = miniRoad(percent, now)
    const width = Math.max(20, Math.min(160, (e.props.bodyColumns ?? 80) - 2))
    const { Box, Button, Text } = $.ui.resolve(e)
    const used = book?.rows.filter(r => r.kind === 'used') ?? []
    const buffer = book?.rows.find(r => r.kind === 'buffer')
    const free = book?.rows.find(r => r.kind === 'free')
    const fill = book?.tokens === null || book === null ? '' : ` · ${tokensOf(book.tokens)}/${tokensOf(book.window)}`
    const extras = [
      book?.model ?? null,
      ...(book?.limits ?? []).map(l => `límite ${LIMIT_NAMES[l.kind] ?? l.kind} ${l.percentUsed} %${resetOf(l.resetsAt)}`),
      book?.threshold === null || book?.threshold === undefined ? null : `autocompacta a ${tokensOf(book.threshold)}`,
      book?.usd === null || book?.usd === undefined ? null : `≈ US$ ${book.usd.toFixed(2)} (estimado)`,
    ].filter((x): x is string => x !== null)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Text color={ph.accent}>
            {ph.icon} {ph.name}
          </Text>
          <Text>
            <Text color={BRAND.orange}>{road.done}</Text>
            <Text bold>{road.rogue}</Text>
            <Text dimColor>{road.ahead}</Text>
            <Text dimColor> ▲</Text>
          </Text>
          <Text dimColor>
            {percent === null ? '—' : `${percent} %`}
            {fill} · {now === 'explora' ? 'explorando' : 'esperándote'}
          </Text>
          {(percent ?? 0) >= CAMP_FROM && (
            <Button
              key="acampar"
              label="⛺ Acampar"
              onPress={() => {
                camp($)
                $.ui.toast(CAMP_TEXT)
              }}
            />
          )}
          <Button key="detalle" label={detailed ? 'Menos' : 'Detalle'} onPress={() => update($, isDetailed, d => !d)} />
          <Button key="ocultar" label="Ocultar" onPress={() => update($, isBandHidden, () => true)} />
        </Box>
        {detailed && book !== null && book.rows.length > 0 && (
          <Text>
            {barOf(book.rows, book.max, width).map(({ row, cells }) =>
              row.kind === 'free' ? (
                <Text key={row.name} dimColor>
                  {'░'.repeat(cells)}
                </Text>
              ) : row.kind === 'buffer' ? (
                <Text key={row.name} dimColor>
                  {'▒'.repeat(cells)}
                </Text>
              ) : (
                <Text key={row.name} color={row.color}>
                  {'█'.repeat(cells)}
                </Text>
              ),
            )}
          </Text>
        )}
        {detailed && used.length > 0 && (
          <Text wrap="wrap">
            {used.map(r => (
              <Text key={r.name}>
                <Text color={r.color}>■ </Text>
                <Text dimColor>
                  {r.name} {tokensOf(r.tokens)}
                  {'   '}
                </Text>
              </Text>
            ))}
            {buffer !== undefined && <Text dimColor>▒ {buffer.name} {tokensOf(buffer.tokens)}   </Text>}
            {free !== undefined && <Text dimColor>░ {free.name} {tokensOf(free.tokens)}</Text>}
          </Text>
        )}
        {detailed && extras.length > 0 && <Text dimColor>{extras.join(' · ')}</Text>}
      </Box>
    )
  })

  on('command.run', { command: 'rogue-road' }, async $ => {
    const { context } = await $.session.usage()
    const percent = context.percent ?? null
    const phase = phaseOf(percent)
    await update($, trail, () => ({ phase, percent }))
    await update($, isBandHidden, () => false)
    await applyPhase($, phase, mode)
    const surfaces = await $.session.surfaces()
    const ph = phaseAt(phase)
    const road = miniRoad(percent, await read($, pace), 24)
    const ladder = PHASES.map((x, k) => {
      const to = PHASES[k + 1]?.from ?? 100
      const range = `${x.from}–${to} %`

      return `${k === phase ? '▶' : ' '} ${range.padEnd(9)} ${x.icon} ${x.name}`
    }).join('\n')

    return {
      text: [
        `${ph.icon} ${ph.name} · contexto ${percent === null ? 'sin medir aún' : `${percent} %`}`,
        `${road.done}${road.rogue}${road.ahead} ▲`,
        ph.tip,
        '',
        ladder,
        '',
        `Superficies: ${surfaces.length === 0 ? 'ninguna' : surfaces.join(', ')} · fondo ${lastDraw}`,
      ].join('\n'),
    }
  })

  // Un comando no puede encargar otro mientras ocupa la sesión: /acampar
  // deja el campamento pendiente y lo encarga al terminar su propio turno.
  on('command.run', { command: 'acampar' }, async $ => {
    await update($, isCampPending, () => true)

    return { text: CAMP_TEXT }
  })
}
