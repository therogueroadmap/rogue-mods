import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeResult, ThemeSetArgs } from 'claude-code'

import type { Companion, Entry, EntryKind, Ledger, LedgerRow, MarkKind, Pace, Trail, Weather } from '../types'
import { makeColors } from './make-colors.js'
import { BRAND, MARK_COLORS, MAX_MARKS, scene, zoneAt } from './scene'
import type { Hex, Mode } from './scene'
import { soundOf } from './sound'

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

const look = (i: number, mode: Mode, weather: Weather, isSoundOn: boolean): ThemeSetArgs => ({
  colors: themes[Math.max(0, Math.min(LAST, i))]?.theme,
  ...(isSoundOn ? { sound: soundOf(Math.max(0, Math.min(LAST, i)), weather) } : {}),
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

// El tema se pinta una vez por fase (y por clima, si suena) y por carga del
// módulo: si el mod se carga a mitad de sesión, o la app se conecta después,
// el primer evento lo pinta.
let paintedKey = ''
let lastDraw = 'sin pintar aún'
let soundNote = ''

/** Pinta el tema; si la app no acepta el sonido o el estilo, lo pinta sin ellos. */
async function setLook($: EngineInterface, args: ThemeSetArgs): Promise<ThemeResult> {
  try {
    const set = await $.theme.set(args)
    soundNote = args.sound === undefined ? 'sonido apagado' : 'sonido listo (actívalo con el parlante de la barra de título)'

    return set
  } catch (error) {
    $.ui.log(`rogue-road: ${String(error)}`)
  }
  const { sound: _sound, ...silent } = args
  soundNote = args.sound === undefined ? 'sonido apagado' : 'la app no aceptó el sonido'
  try {
    return await $.theme.set(silent)
  } catch (error) {
    // Una versión que no acepta `style`: el tema sin estilos de mensaje.
    $.ui.log(`rogue-road: ${String(error)}`)
    const { style: _style, ...plain } = silent

    return $.theme.set(plain)
  }
}

async function paint($: EngineInterface, mode: Mode, isForced = false): Promise<void> {
  const { phase } = await read($, trail)
  const w = await read($, weather)
  const isSound = await read($, isSoundOn)
  const key = `${phase}|${isSound ? w : '-'}|${isSound}`
  if (!isForced && key === paintedKey) {
    return
  }
  const set = await setLook($, look(phase, mode, w, isSound))
  paintedKey = set.isDrawn ? key : ''
  lastDraw = set.isDrawn ? 'pintado' : `no pintado: ${set.reason ?? 'sin motivo'}`
  if (!set.isDrawn) {
    $.ui.log(`rogue-road: ${lastDraw}`)
  }
}

// /acampar encarga el /compact de Claude Code, que corre en cuanto la sesión
// queda libre. Quien lo pide aún tiene la sesión ocupada: no se espera.
const CAMP_FOCUS = 'Conserva el rumbo: objetivos, decisiones tomadas, archivos tocados y próximos pasos. Descarta lo explorado sin salida.'
const CAMP_TEXT = '⛺ Acampando: la conversación se compacta en cuanto Claude queda libre. Mañana amanece de nuevo.'

function camp($: EngineInterface): void {
  void addEntry($, 'acampada', 'Acampa: la conversación se compacta')
  $.command.run({ command: 'compact', args: CAMP_FOCUS }).catch((error: unknown) => {
    $.ui.log(`rogue-road: no se pudo acampar: ${String(error)}`)
    $.ui.toast('No se pudo acampar. Usa /compact directamente.')
  })
}

/** Camino en miniatura para la terminal: recorrido (• en cada hito), explorador, por recorrer y campamento. */
const miniRoad = (percent: number | null, pace: Pace, cells = 18, marks: number[] = []): { done: string; rogue: string; ahead: string } => {
  const cellOf = (p: number): number => Math.round((Math.min(Math.max(p, 0), 100) / 100) * (cells - 1))
  const at = cellOf(percent ?? 0)
  // Un hito recién hecho queda justo detrás del explorador.
  const marked = new Set(marks.map(p => Math.min(cellOf(p), at - 1)))
  const done = Array.from({ length: at }, (_, k) => (marked.has(k) ? '•' : '━')).join('')

  return { done, rogue: pace === 'explora' ? '◆' : '◇', ahead: '┄'.repeat(cells - 1 - at) }
}

// ─── Estado ──────────────────────────────────────────────────────────

const trail = atom({ plugin: 'rogue-road', key: 'trail' } as const, { phase: 0, percent: null } as Trail)
const pace = atom({ plugin: 'rogue-road', key: 'pace' } as const, 'espera' as Pace)
const isBandHidden = atom({ plugin: 'rogue-road', key: 'isBandHidden' } as const, false)
const isCampPending = atom({ plugin: 'rogue-road', key: 'isCampPending' } as const, false)
const ledger = atom({ plugin: 'rogue-road', key: 'ledger' } as const, null as Ledger | null)
const isDetailed = atom({ plugin: 'rogue-road', key: 'isDetailed' } as const, true)
const journal = atom({ plugin: 'rogue-road', key: 'journal' } as const, [] as Entry[])
const weather = atom({ plugin: 'rogue-road', key: 'weather' } as const, 'despejado' as Weather)
const recent = atom({ plugin: 'rogue-road', key: 'recent' } as const, [] as boolean[])
const companions = atom({ plugin: 'rogue-road', key: 'companions' } as const, [] as Companion[])
const isSoundOn = atom({ plugin: 'rogue-road', key: 'isSoundOn' } as const, true)

// ─── La bitácora: hitos, fases, clima y compañeros ───────────────────

const JOURNAL_MAX = 300
const MARK_KINDS: readonly string[] = ['commit', 'tests', 'pr', 'push']

async function addEntry($: EngineInterface, kind: EntryKind, label: string): Promise<void> {
  const { percent } = await read($, trail)
  const entry: Entry = { at: Date.now(), percent: percent ?? 0, kind, label }
  await update($, journal, list => [...list, entry].slice(-JOURNAL_MAX))
}

/** Las entradas desde el último amanecer: el día de viaje en curso. */
const today = (list: Entry[]): Entry[] => {
  let from = 0
  list.forEach((x, k) => {
    if (x.kind === 'amanecer') {
      from = k + 1
    }
  })

  return list.slice(from)
}

const marksOf = (list: Entry[]): { percent: number; kind: string; label: string }[] =>
  today(list)
    .filter(x => MARK_KINDS.includes(x.kind))
    .slice(-MAX_MARKS)
    .map(x => ({ percent: x.percent, kind: x.kind, label: x.label }))

const TEST_RE = /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b|\bpytest\b|\bvitest\b|\bjest\b|\bcargo\s+test\b|\bgo\s+test\b|\bmake\s+test\b|\bclaude\s+plugin\s+test\b|\bphpunit\b|\brspec\b/

const text = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Reconoce un hito en una herramienta que terminó bien: commit, push, PR o tests. */
export const milestoneOf = (tool: string, input: unknown, response: unknown): { kind: MarkKind; label: string } | null => {
  const args = (input ?? {}) as Record<string, unknown>
  if (tool === 'Bash') {
    const cmd = text(args['command'])
    const out = typeof response === 'object' && response !== null ? text((response as Record<string, unknown>)['stdout']) : text(response)
    if (/\bgit\s+commit\b/.test(cmd)) {
      const subject = /^\[[^\]]+\]\s+(.+)$/m.exec(out)?.[1] ?? /\s-m\s+["']([^"'$\n]+)/.exec(cmd)?.[1] ?? 'commit'

      return { kind: 'commit', label: subject.trim().slice(0, 80) }
    }
    if (/\bgh\s+pr\s+create\b/.test(cmd)) {
      return { kind: 'pr', label: /https:\/\/\S+\/pull\/\d+/.exec(out)?.[0] ?? 'PR abierto' }
    }
    if (/\bgit\s+push\b/.test(cmd)) {
      return { kind: 'push', label: `push ${/\bgit\s+push\s+(?:-\S+\s+)*(\S+\s+\S+)/.exec(cmd)?.[1] ?? ''}`.trim() }
    }
    if (TEST_RE.test(cmd)) {
      return { kind: 'tests', label: `tests: ${cmd.slice(0, 60)}` }
    }
  }
  if (/create_pull_request$/.test(tool)) {
    return { kind: 'pr', label: text(args['title']) || 'PR abierto' }
  }

  return null
}

const MARK_TEXT: Record<MarkKind, string> = { commit: 'commit', tests: 'tests en verde', pr: 'PR', push: 'push' }

// ─── El clima: sigue a los fallos de las herramientas y a los límites ─

type Sky = { name: string; icon: string; toast: string }
const WEATHER: Record<Weather, Sky> = {
  despejado: { name: 'despejado', icon: '☼', toast: '☼ Se despeja: las herramientas vuelven a responder.' },
  nublado: { name: 'nublado', icon: '☁', toast: '☁ Se nubla: un par de herramientas fallaron.' },
  lluvia: { name: 'lluvia', icon: '☂', toast: '☂ Llueve: varias herramientas fallaron seguidas. Quizás convenga revisar el rumbo.' },
  tormenta: { name: 'tormenta', icon: '⛈', toast: '⛈ Tormenta en el horizonte: un límite de uso pasó del 80 %.' },
}
const WINDOW = 10

export const weatherOf = (results: boolean[], limits: { percentUsed: number }[]): Weather => {
  if (limits.some(l => l.percentUsed >= 80)) {
    return 'tormenta'
  }
  const fails = results.filter(ok => !ok).length

  return fails >= 4 ? 'lluvia' : fails >= 2 ? 'nublado' : 'despejado'
}

async function refreshWeather($: EngineInterface, mode: Mode): Promise<void> {
  const next = weatherOf(await read($, recent), (await read($, ledger))?.limits ?? [])
  if (next === (await read($, weather))) {
    return
  }
  await update($, weather, () => next)
  await addEntry($, 'clima', `${WEATHER[next].icon} ${WEATHER[next].name}`)
  $.ui.toast(WEATHER[next].toast)
  await paint($, mode)
}

/** Anota el resultado de una herramienta: el hito si lo hubo, y el clima. */
async function recordTool($: EngineInterface, mode: Mode, isOk: boolean, mark: { kind: MarkKind; label: string } | null): Promise<void> {
  if (mark !== null) {
    await addEntry($, mark.kind, mark.label)
  }
  // Tests en verde despejan el cielo.
  await update($, recent, list => (mark?.kind === 'tests' ? [] : [...list, isOk].slice(-WINDOW)))
  await refreshWeather($, mode)
}

// ─── El sonido: se habilita o deshabilita con /sonido o desde la banda ─

const SOUND_KEY = 'sonido'

async function setSound($: EngineInterface, mode: Mode, config: string, on: boolean): Promise<void> {
  await update($, isSoundOn, () => on)
  await $.store.set(SOUND_KEY, { on, config })
  await paint($, mode, true)
}

// ─── El panel de la bitácora ─────────────────────────────────────────

const PANE = 'bitacora'
const PANE_TITLE = 'Bitácora del viaje'

const ENTRY_ICON: Record<EntryKind, string> = {
  commit: '●', tests: '✓', pr: '⇡', push: '↑', fase: '◐', amanecer: '◓', clima: '~', compañero: '⚇', acampada: '⛺',
}

const clockOf = (ms: number): string => {
  const d = new Date(ms)

  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Resumen de un día de viaje: cuántos commits, tests, pushes y PRs. */
const tally = (list: Entry[]): string => {
  const n = (k: MarkKind): number => list.filter(x => x.kind === k).length
  const parts = (['commit', 'tests', 'push', 'pr'] as const).filter(k => n(k) > 0).map(k => `${n(k)} ${MARK_TEXT[k]}`)

  return parts.length === 0 ? 'sin hitos' : parts.join(' · ')
}

/** Los días anteriores de la bitácora, cada uno cerrado por un amanecer. */
const pastDays = (list: Entry[]): Entry[][] => {
  const days: Entry[][] = [[]]
  for (const x of list) {
    if (x.kind === 'amanecer') {
      days.push([])
    } else {
      days[days.length - 1]?.push(x)
    }
  }
  days.pop()

  return days
}

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
  const soundConfig = options.sonido === 'desactivado' ? 'desactivado' : 'activado'

  on('session.start', async ($, e, next) => {
    const unpainted = themes.flatMap(t => t.problems).find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.log(unpainted)
    }

    await $.command.register({ name: 'rogue-road', description: 'Muestra en qué punto del camino (y del día) va la sesión' })
    await $.command.register({ name: 'acampar', description: 'Acampa: compacta la conversación y vuelve a amanecer' })
    await $.command.register({ name: 'bitacora', description: 'Abre la bitácora del viaje: hitos, fases, clima y compañeros' })
    await $.command.register({ name: 'sonido', description: 'Habilita o deshabilita el sonido ambiental del camino (on | off)' })

    // El sonido: lo último elegido con /sonido, salvo que la opción del mod haya cambiado desde entonces.
    const stored = (await $.store.get(SOUND_KEY).catch(() => undefined)) as { on?: unknown; config?: unknown } | undefined
    const isSound = stored?.config === soundConfig && typeof stored.on === 'boolean' ? stored.on : soundConfig === 'activado'
    await update($, isSoundOn, () => isSound)

    const { context } = await $.session.usage()
    const percent = context.percent ?? null
    const phase = phaseOf(percent)
    await update($, trail, () => ({ phase, percent }))
    await update($, pace, () => 'espera' as Pace)
    await update($, companions, () => [])
    await refreshLedger($).catch(() => undefined)
    await paint($, mode, true)
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

      if (before.phase !== phase) {
        const ph = phaseAt(phase)
        await addEntry($, phase < before.phase ? 'amanecer' : 'fase', phase < before.phase ? `Nuevo amanecer: ${ph.name}` : `Entra en ${ph.name}`)
        if (phase < before.phase) {
          // Un nuevo día: el cielo se despeja y los hitos quedan en la bitácora.
          await update($, recent, () => [])
        }
      }
      await paint($, mode)
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
    // Un límite de uso alto trae tormenta.
    await refreshWeather($, mode)

    return next(e)
  })

  // Una app que se conecta después del inicio recibe el tema.
  on('session.attach', async ($, e, next) => {
    const result = await next(e)
    await paint($, mode, true)

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
      await paint($, mode)
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

  // Cada herramienta mueve el clima; un commit, un push, un PR o tests en
  // verde dejan un hito en el camino.
  on('classic.PostToolUse', async ($, e, next) => {
    await setPace($, 'explora')
    await recordTool($, mode, true, milestoneOf(e.tool_name, e.tool_input, e.tool_response))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.PostToolUseFailure', async ($, e, next) => {
    await setPace($, 'explora')
    if (e.is_interrupt !== true) {
      await recordTool($, mode, false, null)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // ─── Compañeros de viaje: los subagentes ───────────────────────────

  on('classic.SubagentStart', async ($, e, next) => {
    await update($, companions, list => [...list.filter(c => c.id !== e.agent_id), { id: e.agent_id, type: e.agent_type }])
    await addEntry($, 'compañero', `Se une ${e.agent_type}`)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.SubagentStop', async ($, e, next) => {
    const was = (await read($, companions)).some(c => c.id === e.agent_id)
    await update($, companions, list => list.filter(c => c.id !== e.agent_id))
    if (was) {
      await addEntry($, 'compañero', `${e.agent_type} vuelve con lo que encontró`)
    }

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
    const marks = marksOf(await read($, journal))
    const w = await read($, weather)
    const mates = (await read($, companions)).length
    const alt =
      `${ph.name}: un explorador encapuchado ${now === 'explora' ? 'camina' : 'espera con su farol'} sobre un camino; ${percent ?? 0} % del contexto recorrido` +
      `; clima ${WEATHER[w].name}; ${marks.length} hitos en el camino${mates > 0 ? `; ${mates} compañeros` : ''}`

    return <Svg source={scene({ percent, pace: now, mode, label: ph.name, marks, weather: w, companions: mates })} alt={alt} isInteractive />
  })

  // ─── Fondo interactivo ─────────────────────────────────────────────
  // Un clic en la insignia abre la bitácora; en el viajero, la fase y un
  // consejo; en el sol, el desglose del contexto; en el campamento, acampa.
  on('ui.pointer', async ($, e, next) => {
    if (!/^fase-\d-/.test(e.scene)) {
      return next(e)
    }
    const { percent, phase } = await read($, trail)
    const p = percent ?? 0
    const zone = zoneAt(e.x, e.y, p)
    if (zone === 'insignia') {
      await $.ui.open({ id: PANE, title: PANE_TITLE })
    } else if (zone === 'viajero') {
      const ph = phaseAt(phase)
      const w = WEATHER[await read($, weather)]
      const mates = await read($, companions)
      $.ui.toast(`${ph.icon} ${ph.name} · ${p} % · ${w.icon} ${w.name}${mates.length > 0 ? ` · ${mates.length} compañeros` : ''}. ${ph.tip}`)
    } else if (zone === 'sol') {
      const book = await read($, ledger)
      const rows = (book?.rows ?? []).filter(r => r.kind === 'used').map(r => `${r.name} ${tokensOf(r.tokens)}`)
      const fill = book?.tokens === null || book === null ? `${p} %` : `${tokensOf(book.tokens)}/${tokensOf(book.window)}`
      $.ui.toast(`☀ Contexto ${fill}${rows.length > 0 ? `: ${rows.join(' · ')}` : ''}`)
    } else if (zone === 'campamento') {
      if (p >= CAMP_FROM) {
        camp($)
        $.ui.toast(CAMP_TEXT)
      } else {
        $.ui.toast(`⛺ Aún hay luz (${p} %). El campamento espera al atardecer, desde el ${CAMP_FROM} %.`)
      }
    }

    return next(e)
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
    const marks = marksOf(await read($, journal))
    const w = await read($, weather)
    const mates = (await read($, companions)).length
    const isSound = await read($, isSoundOn)
    const road = miniRoad(percent, now, 18, marks.map(m => m.percent))
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
          {w !== 'despejado' && <Text color={w === 'tormenta' ? 'warning' : undefined}>{WEATHER[w].icon} {WEATHER[w].name}</Text>}
          {mates > 0 && <Text dimColor>⚇ {mates}</Text>}
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
          <Button key="bitacora" label="Bitácora" onPress={() => $.ui.open({ id: PANE, title: PANE_TITLE })} />
          <Button key="sonido" label={isSound ? '♪ Sonido' : '♪ Silencio'} onPress={() => setSound($, mode, soundConfig, !isSound)} />
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
    await paint($, mode, true)
    const surfaces = await $.session.surfaces()
    const ph = phaseAt(phase)
    const road = miniRoad(percent, await read($, pace), 24, marksOf(await read($, journal)).map(m => m.percent))
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
        `Superficies: ${surfaces.length === 0 ? 'ninguna' : surfaces.join(', ')} · fondo ${lastDraw} · ${soundNote}`,
      ].join('\n'),
    }
  })

  // Un comando no puede encargar otro mientras ocupa la sesión: /acampar
  // deja el campamento pendiente y lo encarga al terminar su propio turno.
  on('command.run', { command: 'acampar' }, async $ => {
    await update($, isCampPending, () => true)

    return { text: CAMP_TEXT }
  })

  on('command.run', { command: 'sonido' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const want = /^(on|si|sí|activar|activado|1)$/.test(arg) ? true : /^(off|no|desactivar|desactivado|0)$/.test(arg) ? false : !(await read($, isSoundOn))
    await setSound($, mode, soundConfig, want)

    return {
      text: want
        ? '♪ Sonido habilitado: el camino suena según la fase y el clima. En la app de escritorio, activa también el parlante de la barra de título.'
        : '♪ Sonido deshabilitado. /sonido on lo vuelve a habilitar.',
    }
  })

  on('command.run', { command: 'bitacora' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: PANE_TITLE })

    return { text: opened.isPlaced ? 'Bitácora abierta.' : `La bitácora queda lista para abrirse: ${opened.reason}` }
  })

  // ─── La bitácora, en un panel junto a la conversación ─────────────

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const { phase, percent } = await read($, trail)
    const list = await read($, journal)
    const w = await read($, weather)
    const mates = await read($, companions)
    const ph = phaseAt(phase)
    const day = today(list)
    const days = pastDays(list)
    const room = Math.max(6, (e.viewport?.rows ?? 40) - 10)
    const shown = day.slice(-room)
    const colorOf = (x: Entry): string | undefined =>
      MARK_KINDS.includes(x.kind) ? MARK_COLORS[x.kind] : x.kind === 'fase' || x.kind === 'amanecer' ? phaseAt(phaseOf(x.percent)).accent : undefined

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold color={ph.accent}>
            Día {days.length + 1} · {ph.icon} {ph.name} · {percent ?? 0} %
          </Text>
          <Text dimColor>
            {WEATHER[w].icon} {WEATHER[w].name} · {tally(day)}
          </Text>
          <Text dimColor>{mates.length === 0 ? 'Viaja solo.' : `⚇ Con ${mates.map(c => c.type).join(', ')}`}</Text>
        </Box>
        <Box flexDirection="column">
          {shown.length === 0 && <Text dimColor>El día recién empieza: todavía no hay nada anotado.</Text>}
          {shown.map((x, k) => {
            const head = k === 0 || phaseOf(shown[k - 1]?.percent ?? 0) !== phaseOf(x.percent)
            const at = phaseAt(phaseOf(x.percent))

            return (
              <Box key={`${x.at}-${k}`} flexDirection="column">
                {head && (
                  <Text bold color={at.accent}>
                    {at.icon} {at.name}
                  </Text>
                )}
                <Text wrap="truncate">
                  <Text color={colorOf(x)}>{ENTRY_ICON[x.kind]} </Text>
                  <Text dimColor>
                    {clockOf(x.at)} · {x.percent} %{' '}
                  </Text>
                  <Text>{MARK_KINDS.includes(x.kind) ? `${MARK_TEXT[x.kind as MarkKind]}: ${x.label}` : x.label}</Text>
                </Text>
              </Box>
            )
          })}
        </Box>
        {days.length > 0 && (
          <Box flexDirection="column">
            <Text bold>Días anteriores</Text>
            {days.slice(-5).map((d, k) => (
              <Text key={`dia-${k}`} dimColor>
                Día {days.length - Math.min(5, days.length) + k + 1}: {tally(d)}
              </Text>
            ))}
          </Box>
        )}
        {(percent ?? 0) >= CAMP_FROM && (
          <Button
            key="acampar-panel"
            label="⛺ Acampar"
            onPress={() => {
              camp($)
              $.ui.toast(CAMP_TEXT)
            }}
          />
        )}
      </Box>
    )
  })
}
