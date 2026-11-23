import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeResult, ThemeSetArgs } from 'claude-code'

import type { Companion, Entry, EntryKind, Ledger, LedgerRow, MarkKind, Pace, Trail, Weather } from '../types'
import { makeColors } from './make-colors.js'
import { BRAND, MARK_COLORS, MAX_MARKS, scene, zoneAt } from './scene'
import type { Hex, Mode } from './scene'
import { soundOf } from './sound'
import { LANG_NAMES, TEXT, langFromArg, langOf } from './i18n'
import type { Lang, Texts } from './i18n'

// ─── Las seis fases del día ──────────────────────────────────────────
// La exploración empieza al alba con el contexto vacío; cada respuesta
// empuja el sol hacia el oeste. Al anochecer conviene acampar (/make-camp
// compacta la conversación) para que vuelva a amanecer.

type Phase = {
  /** Nombre y consejo, en el idioma elegido. */
  name: string
  icon: string
  from: number
  tip: string
  /** Matiz del acento del tema en esta fase. */
  accent: Hex
}

// El idioma de la banda, la bitácora, los avisos y el fondo: lo fija register()
// con el ajuste «Idioma». Los comandos quedan en inglés en todos los idiomas.
let t: Texts = TEXT.es

const PHASES: Omit<Phase, 'name' | 'tip'>[] = [
  { icon: '◓', from: 0, accent: '#E0708D' },
  { icon: '☀', from: 15, accent: '#F7792C' },
  { icon: '☀', from: 35, accent: '#F7792C' },
  { icon: '☀', from: 55, accent: '#F2672E' },
  { icon: '◒', from: 75, accent: '#EC553F' },
  { icon: '☾', from: 90, accent: '#8C7BEA' },
]

const LAST = PHASES.length - 1
const CAMP_FROM = 75

const phaseAt = (i: number): Phase => {
  const k = Math.max(0, Math.min(LAST, i))
  const words = t.phases[k] ?? { name: '', tip: '' }

  return { ...(PHASES[k] ?? PHASES[0]!), name: words.name, tip: words.tip }
}

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

const themes = PHASES.map((ph, k) => {
  const made = makeColors({
    label: `Rogue Road · ${TEXT.es.phases[k]?.name ?? k + 1}`,
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

/** El % medido, o el estimado del desglose con `~` mientras no hay medida; '' si no hay ninguno. */
const percentText = (percent: number | null, book: Ledger | null): string => {
  if (percent !== null) {
    return `${percent} %`
  }
  const estimate = book?.estimate ?? null

  return estimate === null ? '' : `~${estimate.percent} %`
}

const statusOf = (trail: Trail, pace: Pace, book: Ledger | null = null): string => {
  const ph = phaseAt(trail.phase)
  const shown = percentText(trail.percent, book)
  const pct = shown === '' ? '' : ` · ${shown}`

  return `${ph.icon} ${ph.name}${pct} · ${pace === 'explora' ? t.walking : t.waiting}`
}

// El tema se pinta una vez por fase (y por clima, si suena) y por carga del
// módulo: si el mod se carga a mitad de sesión, o la app se conecta después,
// el primer evento lo pinta.
let paintedKey = ''
let lastDraw = ''
let loggedDraw = ''
let soundNote = ''

/** Pinta el tema; si la app no acepta el sonido o el estilo, lo pinta sin ellos. */
async function setLook($: EngineInterface, args: ThemeSetArgs): Promise<ThemeResult> {
  try {
    const set = await $.theme.set(args)
    soundNote = args.sound === undefined ? t.soundNote.off : t.soundNote.ready

    return set
  } catch (error) {
    $.ui.log(`rogue-road: ${String(error)}`)
  }
  const { sound: _sound, ...silent } = args
  soundNote = args.sound === undefined ? t.soundNote.off : t.soundNote.refused
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
  lastDraw = set.isDrawn ? t.draw.painted : t.draw.notPainted(set.reason ?? t.draw.noReason)
  // Sin app que pinte (la terminal sola) cada evento reintenta, para pintar en cuanto
  // una se conecte; el motivo va al log de depuración una vez, no a la conversación.
  // El motor ya antepone el nombre del plugin.
  if (!set.isDrawn && lastDraw !== loggedDraw) {
    $.ui.log(lastDraw, { to: 'debug' })
  }
  loggedDraw = set.isDrawn ? '' : lastDraw
}

// /make-camp encarga el /compact de Claude Code, que corre en cuanto la sesión
// queda libre. Quien lo pide aún tiene la sesión ocupada: no se espera.

function camp($: EngineInterface): void {
  void addEntry($, 'acampada', t.entry.camp)
  $.command.run({ command: 'compact', args: t.campFocus }).catch((error: unknown) => {
    $.ui.log(`rogue-road: no se pudo acampar: ${String(error)}`)
    $.ui.toast(t.toast.campFail)
  })
}

// /clear-trail encarga el /clear de Claude Code: el contexto empieza de cero.

function clearTrail($: EngineInterface): void {
  void addEntry($, 'limpieza', t.entry.clear)
  $.command.run({ command: 'clear', args: '' }).catch((error: unknown) => {
    $.ui.log(`rogue-road: no se pudo limpiar el sendero: ${String(error)}`)
    $.ui.toast(t.toast.clearFail)
  })
}

/**
 * Corre lo que quedó pendiente (acampar o limpiar) apenas termina el comando
 * que lo pidió. Si la sesión aún está ocupada, lo deja pendiente para el fin
 * del próximo turno.
 */
function runSoon($: EngineInterface): void {
  $.clock.after(400, () => {
    void runPendingNow($)
  })
}

async function tryCommand($: EngineInterface, command: string, args: string): Promise<boolean> {
  try {
    await $.command.run({ command, args })

    return true
  } catch (error) {
    $.ui.log(`rogue-road: /${command} queda para el fin del turno: ${String(error)}`)

    return false
  }
}

async function runPendingNow($: EngineInterface): Promise<void> {
  if (await read($, isCampPending)) {
    await update($, isCampPending, () => false)
    if (await tryCommand($, 'compact', t.campFocus)) {
      await addEntry($, 'acampada', t.entry.camp)
    } else {
      await update($, isCampPending, () => true)
    }
  }
  if (await read($, isClearPending)) {
    await update($, isClearPending, () => false)
    if (await tryCommand($, 'clear', '')) {
      await addEntry($, 'limpieza', t.entry.clear)
    } else {
      await update($, isClearPending, () => true)
    }
  }
}

/**
 * Le encarga un turno al modelo apenas termina el comando que lo pide: un
 * comando no puede enviar un prompt mientras ocupa la sesión.
 */
function submitSoon($: EngineInterface, text: string, what: string): void {
  $.clock.after(200, () => {
    $.prompt.submit({ text }).catch((error: unknown) => {
      $.ui.log(`rogue-road: no se pudo ${what}: ${String(error)}`)
      $.ui.toast(t.toast.submitFail(what))
    })
  })
}

/** La bitácora del día como lista para el modelo. */
const digest = (list: Entry[]): string => {
  const lines = today(list)
    .filter(x => x.kind !== 'resumen' && x.kind !== 'relevo')
    .slice(-60)
    .map(x => `- ${clockOf(x.at)} · ${x.percent} % · ${t.kinds[x.kind]}: ${x.label}`)

  return lines.length === 0 ? t.noEntries : lines.join('\n')
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
const isClearPending = atom({ plugin: 'rogue-road', key: 'isClearPending' } as const, false)
const ledger = atom({ plugin: 'rogue-road', key: 'ledger' } as const, null as Ledger | null)

/**
 * La línea de estado bajo el prompt, solo con la banda oculta: con la banda a la
 * vista repetiría lo mismo, y la terminal la dibuja como aviso (⚠, en amarillo).
 */
async function refreshStatus($: EngineInterface): Promise<void> {
  if (await read($, isBandHidden)) {
    $.ui.status(statusOf(await read($, trail), await read($, pace), await read($, ledger)))
  } else {
    $.ui.status(undefined)
  }
}
const isDetailed = atom({ plugin: 'rogue-road', key: 'isDetailed' } as const, true)
const journal = atom({ plugin: 'rogue-road', key: 'journal' } as const, [] as Entry[])
const weather = atom({ plugin: 'rogue-road', key: 'weather' } as const, 'despejado' as Weather)
const recent = atom({ plugin: 'rogue-road', key: 'recent' } as const, [] as boolean[])
const companions = atom({ plugin: 'rogue-road', key: 'companions' } as const, [] as Companion[])
const isSoundOn = atom({ plugin: 'rogue-road', key: 'isSoundOn' } as const, true)
const language = atom({ plugin: 'rogue-road', key: 'language' } as const, 'es' as Lang)

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
      return { kind: 'pr', label: /https:\/\/\S+\/pull\/\d+/.exec(out)?.[0] ?? t.entry.prOpen }
    }
    if (/\bgit\s+push\b/.test(cmd)) {
      return { kind: 'push', label: `push ${/\bgit\s+push\s+(?:-\S+\s+)*(\S+\s+\S+)/.exec(cmd)?.[1] ?? ''}`.trim() }
    }
    if (TEST_RE.test(cmd)) {
      return { kind: 'tests', label: `tests: ${cmd.slice(0, 60)}` }
    }
  }
  if (/create_pull_request$/.test(tool)) {
    return { kind: 'pr', label: text(args['title']) || t.entry.prOpen }
  }

  return null
}


// ─── El clima: sigue a los fallos de las herramientas y a los límites ─

type Sky = { name: string; icon: string; toast: string }
const WEATHER_ICON: Record<Weather, string> = { despejado: '☼', nublado: '☁', lluvia: '☂', tormenta: '⛈' }
const skyOf = (w: Weather): Sky => ({ icon: WEATHER_ICON[w], ...t.weather[w] })
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
  await addEntry($, 'clima', `${skyOf(next).icon} ${skyOf(next).name}`)
  $.ui.toast(skyOf(next).toast)
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

// ─── El sonido: se habilita o deshabilita con /sound o desde la banda ─

const SOUND_KEY = 'sonido'

// ─── El idioma del mod: el ajuste «Idioma», o lo último elegido con /language ─

const LANGUAGE_KEY = 'idioma'

/** Registra los comandos con sus descripciones en el idioma del mod; los nombres quedan en inglés. */
async function registerCommands($: EngineInterface): Promise<void> {
  await $.command.register({ name: 'rogue-road-mod', description: t.cmd.rogueRoadMod })
  await $.command.register({ name: 'make-camp', description: t.cmd.makeCamp })
  await $.command.register({ name: 'logbook', description: t.cmd.logbook })
  await $.command.register({ name: 'sound', description: t.cmd.sound, argumentHint: '[on | off]' })
  await $.command.register({ name: 'language', description: t.cmd.language, argumentHint: '[es | en | fr]' })
  await $.command.register({ name: 'clear-trail', description: t.cmd.clearTrail })
  await $.command.register({ name: 'trail-log', description: t.cmd.trailLog, argumentHint: t.cmd.trailLogHint })
  await $.command.register({ name: 'pass-the-map', description: t.cmd.passTheMap, argumentHint: t.cmd.passTheMapHint })
}

/**
 * Cambia el idioma del mod y nada más: la banda, la bitácora, la insignia y
 * los avisos se redibujan (leen `language`), los comandos cambian de
 * descripción y la línea de estado se reescribe. La interfaz de Claude no se toca.
 */
async function setLanguage($: EngineInterface, config: Lang, next: Lang): Promise<void> {
  t = TEXT[next]
  await update($, language, () => next)
  await $.store.set(LANGUAGE_KEY, { lang: next, config })
  await registerCommands($)
  await refreshStatus($)
  if ((await $.ui.panes()).some(pane => pane.id === PANE)) {
    await $.ui.open({ id: PANE, title: t.pane.title })
  }
}

async function setSound($: EngineInterface, mode: Mode, config: string, on: boolean): Promise<void> {
  await update($, isSoundOn, () => on)
  await $.store.set(SOUND_KEY, { on, config })
  await paint($, mode, true)
}

// ─── El panel de la bitácora ─────────────────────────────────────────

const PANE = 'bitacora'

const ENTRY_ICON: Record<EntryKind, string> = {
  commit: '●', tests: '✓', pr: '⇡', push: '↑', fase: '◐', amanecer: '◓', clima: '~', compañero: '⚇', acampada: '⛺',
  limpieza: '⌫', resumen: '✎', relevo: '⇢',
}

const clockOf = (ms: number): string => {
  const d = new Date(ms)

  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Resumen de un día de viaje: cuántos commits, tests, pushes y PRs. */
const tally = (list: Entry[]): string => {
  const n = (k: MarkKind): number => list.filter(x => x.kind === k).length
  const parts = (['commit', 'tests', 'push', 'pr'] as const).filter(k => n(k) > 0).map(k => `${n(k)} ${t.marks[k]}`)

  return parts.length === 0 ? t.pane.noMarks : parts.join(' · ')
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


/** Hora local corta de un instante ISO, para el reinicio de un límite. */
const resetOf = (iso: string | null): string => {
  if (iso === null) {
    return ''
  }
  const d = new Date(iso)

  return Number.isNaN(d.getTime()) ? '' : t.band.resets(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
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
    estimate: b === undefined ? null : { percent: b.percentage, tokens: b.totalTokens },
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
  await refreshStatus($)
}

export const register: Register = (on, options) => {
  const mode = modeOf(options.modo)
  const langConfig = langOf(options.idioma)
  t = TEXT[langConfig]
  const soundConfig = options.sonido === 'desactivado' ? 'desactivado' : 'activado'

  on('session.start', async ($, e, next) => {
    const unpainted = themes.flatMap(t => t.problems).find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.log(unpainted)
    }

    // El idioma: lo último elegido con /language, salvo que el ajuste del mod haya cambiado desde entonces.
    const storedLang = (await $.store.get(LANGUAGE_KEY).catch(() => undefined)) as { lang?: unknown; config?: unknown } | undefined
    const lang = storedLang?.config === langConfig && (storedLang.lang === 'es' || storedLang.lang === 'en' || storedLang.lang === 'fr') ? storedLang.lang : langConfig
    t = TEXT[lang]
    await update($, language, () => lang)
    await registerCommands($)

    // El sonido: lo último elegido con /sound, salvo que la opción del mod haya cambiado desde entonces.
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
    await refreshStatus($)

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
      await refreshStatus($)

      if (before.phase !== phase) {
        const ph = phaseAt(phase)
        await addEntry($, phase < before.phase ? 'amanecer' : 'fase', phase < before.phase ? t.entry.dawn(ph.name) : t.entry.enters(ph.name))
        if (phase < before.phase) {
          // Un nuevo día: el cielo se despeja y los hitos quedan en la bitácora.
          await update($, recent, () => [])
        }
      }
      await paint($, mode)
      if (before.phase !== phase) {
        const ph = phaseAt(phase)
        if (phase < before.phase) {
          $.ui.toast(t.toast.dawn(ph.name))
        } else if (phase >= LAST) {
          $.ui.toast(t.toast.night)
        } else if ((PHASES[phase]?.from ?? 0) >= CAMP_FROM) {
          $.ui.toast(t.toast.dusk)
        } else {
          $.ui.toast(`${ph.icon} ${t.toast.phase(ph.name)}`)
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
      if (await read($, isClearPending)) {
        await update($, isClearPending, () => false)
        clearTrail($)
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
    await addEntry($, 'compañero', t.entry.joins(e.agent_type))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.SubagentStop', async ($, e, next) => {
    const was = (await read($, companions)).some(c => c.id === e.agent_id)
    await update($, companions, list => list.filter(c => c.id !== e.agent_id))
    if (was) {
      await addEntry($, 'compañero', t.entry.returns(e.agent_type))
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
    t = TEXT[await read($, language)]
    const { percent, phase } = await read($, trail)
    const now = await read($, pace)
    const ph = phaseAt(phase)
    const marks = marksOf(await read($, journal))
    const w = await read($, weather)
    const mates = (await read($, companions)).length
    const alt = t.alt(ph.name, now === 'explora', percent ?? 0, skyOf(w).name, marks.length, mates)
    const words = { walking: t.walking, waiting: t.waiting }

    return <Svg source={scene({ percent, pace: now, mode, label: ph.name, marks, weather: w, companions: mates, words })} alt={alt} isInteractive />
  })

  // ─── Fondo interactivo ─────────────────────────────────────────────
  // Un clic en la insignia abre la bitácora; en el viajero, la fase y un
  // consejo; en el campamento, acampa.
  on('ui.pointer', async ($, e, next) => {
    if (!/^fase-\d-/.test(e.scene)) {
      return next(e)
    }
    const { percent, phase } = await read($, trail)
    const p = percent ?? 0
    const zone = zoneAt(e.x, e.y)
    if (zone === 'insignia') {
      await $.ui.open({ id: PANE, title: t.pane.title })
    } else if (zone === 'viajero') {
      const ph = phaseAt(phase)
      const w = skyOf(await read($, weather))
      const mates = await read($, companions)
      $.ui.toast(t.toast.traveler(`${ph.icon} ${ph.name} · ${p} % · ${w.icon} ${w.name}${mates.length > 0 ? ` · ${t.toast.mates(mates.length)}` : ''}`, ph.tip))
    } else if (zone === 'campamento') {
      if (p >= CAMP_FROM) {
        camp($)
        $.ui.toast(t.campText)
      } else {
        $.ui.toast(t.toast.stillLight(p, CAMP_FROM))
      }
    }

    return next(e)
  })

  // ─── La banda sobre el prompt ──────────────────────────────────────
  // Una fila de estado que no se parte (fase, camino, contexto, clima y
  // compañeros, recortada si no entra) con controles compactos a la derecha;
  // debajo, la barra del desglose: █ por categoría, ▒ el colchón y ░ lo libre.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isBandHidden))) {
      return next(e)
    }
    t = TEXT[await read($, language)]
    const { phase, percent } = await read($, trail)
    const now = await read($, pace)
    const book = await read($, ledger)
    const detailed = await read($, isDetailed)
    const ph = phaseAt(phase)
    const marks = marksOf(await read($, journal))
    const w = await read($, weather)
    const mates = (await read($, companions)).length
    const isSound = await read($, isSoundOn)
    const isGraphic = e.surface === 'desktop' || e.surface === 'mobile'
    // En la terminal, `bodyColumns` ya descuenta el `[-]` del motor: la barra ocupa
    // todo ese ancho. En el escritorio y el móvil se conserva el tope de antes.
    const columns = e.props.bodyColumns ?? 80
    const width = isGraphic ? Math.max(20, Math.min(160, columns - 2)) : Math.max(20, columns)
    const { Box, Button, Text } = $.ui.resolve(e)
    const used = book?.rows.filter(r => r.kind === 'used') ?? []
    const buffer = book?.rows.find(r => r.kind === 'buffer')
    const free = book?.rows.find(r => r.kind === 'free')
    // Sin respuesta todavía, el % y los tokens salen de la estimación del desglose, con `~`.
    const estimate = percent === null ? (book?.estimate ?? null) : null
    const shownPercent = percentText(percent, book) || '—'
    // El explorador avanza por el camino también con la estimación; la fase sigue solo a la medida.
    const road = miniRoad(percent ?? estimate?.percent ?? null, now, isGraphic ? 12 : 18, marks.map(m => m.percent))
    const fill =
      book === null
        ? ''
        : book.tokens !== null
          ? ` · ${tokensOf(book.tokens)}/${tokensOf(book.window)}`
          : estimate === null
            ? ''
            : ` · ~${tokensOf(estimate.tokens)}/${tokensOf(book.max)}`
    const extras = [
      book?.model ?? null,
      ...(book?.limits ?? []).map(l => t.band.limit(t.band.limitNames[l.kind] ?? l.kind, l.percentUsed, resetOf(l.resetsAt))),
      book?.threshold === null || book?.threshold === undefined ? null : t.band.autocompact(tokensOf(book.threshold)),
      book?.usd === null || book?.usd === undefined ? null : t.band.cost(book.usd.toFixed(2)),
    ].filter((x): x is string => x !== null)
    // La barra es de caracteres en todas las superficies, como /context. En el
    // escritorio y el móvil la letra es proporcional y █ ▒ ░ ocupan más que una
    // celda, así que la barra usa menos celdas y se recorta si aun así no entra.
    const barWidth = isGraphic ? Math.max(16, Math.round(width * 0.72)) : width
    const segments = book === null ? [] : barOf(book.rows, book.max, barWidth)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1} alignItems="center">
          <Box flexGrow={1} flexShrink={1}>
            <Text wrap="truncate">
              <Text color={ph.accent}>
                {ph.icon} {ph.name}{' '}
              </Text>
              <Text color={BRAND.orange}>{road.done}</Text>
              <Text bold>{road.rogue}</Text>
              <Text dimColor>{road.ahead} ▲ </Text>
              <Text dimColor>
                {shownPercent}
                {fill} · {now === 'explora' ? t.walking : t.waiting}
              </Text>
              {w !== 'despejado' && (
                <Text color={w === 'tormenta' ? 'warning' : undefined}>
                  {' '}
                  · {skyOf(w).icon} {skyOf(w).name}
                </Text>
              )}
              {mates > 0 && <Text dimColor> · ⚇ {mates}</Text>}
            </Text>
          </Box>
          <Box flexDirection="row" gap={1} flexShrink={0}>
            {(percent ?? 0) >= CAMP_FROM && (
              <Button
                key="acampar"
                label={t.band.camp}
                variant="primary"
                onPress={() => {
                  camp($)
                  $.ui.toast(t.campText)
                }}
              />
            )}
            <Button key="bitacora" label="☰" plain dimColor onPress={() => $.ui.open({ id: PANE, title: t.pane.title })} />
            <Button key="sonido" label={isSound ? '♪' : '✕♪'} plain dimColor onPress={() => setSound($, mode, soundConfig, !isSound)} />
            <Button key="detalle" label={detailed ? '▴' : '▾'} plain dimColor onPress={() => update($, isDetailed, d => !d)} />
            <Button key="ocultar" label={t.band.hide} role="dismiss" plain dimColor onPress={async () => {
              await update($, isBandHidden, () => true)
              await refreshStatus($)
            }} />
          </Box>
        </Box>
        {detailed && segments.length > 0 && (
          <Text wrap="truncate">
            {segments.map(({ row, cells }) =>
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
        {detailed && extras.length > 0 && <Text dimColor wrap="wrap">{extras.join(' · ')}</Text>}
      </Box>
    )
  })

  on('command.run', { command: 'rogue-road-mod' }, async $ => {
    const { context } = await $.session.usage()
    const percent = context.percent ?? null
    const phase = phaseOf(percent)
    await update($, trail, () => ({ phase, percent }))
    await update($, isBandHidden, () => false)
    await refreshStatus($)
    await paint($, mode, true)
    const surfaces = await $.session.surfaces()
    const ph = phaseAt(phase)
    const road = miniRoad(percent, await read($, pace), 24, marksOf(await read($, journal)).map(m => m.percent))
    const ladder = PHASES.map((x, k) => {
      const to = PHASES[k + 1]?.from ?? 100
      const range = `${x.from}–${to} %`

      return `${k === phase ? '▶' : ' '} ${range.padEnd(9)} ${x.icon} ${phaseAt(k).name}`
    }).join('\n')

    return {
      text: [
        `${ph.icon} ${ph.name} · ${t.reply.context} ${percent === null ? t.reply.unmeasured : `${percent} %`}`,
        `${road.done}${road.rogue}${road.ahead} ▲`,
        ph.tip,
        '',
        ladder,
        '',
        t.reply.surfaces(surfaces.length === 0 ? t.reply.none : surfaces.join(', '), lastDraw === '' ? t.draw.unpainted : lastDraw, soundNote),
      ].join('\n'),
    }
  })

  // Un comando no puede encargar otro mientras ocupa la sesión: /make-camp
  // deja el campamento pendiente y lo encarga al terminar su propio turno.
  on('command.run', { command: 'make-camp' }, async $ => {
    await update($, isCampPending, () => true)
    runSoon($)

    return { text: t.campText }
  })

  // ─── Cerrar el día: limpiar, resumir o pasar el mapa ───────────────

  on('command.run', { command: 'clear-trail' }, async $ => {
    await update($, isClearPending, () => true)
    runSoon($)

    return { text: t.clearText }
  })

  on('command.run', { command: 'trail-log' }, async ($, e) => {
    const focus = e.args.trim()
    await addEntry($, 'resumen', t.entry.summary(focus))
    submitSoon($, t.trailLogPrompt(focus, digest(await read($, journal))), t.what.summary)

    return { text: t.reply.summary }
  })

  on('command.run', { command: 'pass-the-map' }, async ($, e) => {
    const purpose = e.args.trim()
    await addEntry($, 'relevo', t.entry.handoff(purpose))
    submitSoon($, t.passTheMapPrompt(purpose, digest(await read($, journal))), t.what.handoff)

    return { text: t.reply.handoff }
  })

  on('command.run', { command: 'language' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === '') {
      return { text: t.reply.languageNow(LANG_NAMES[await read($, language)]) }
    }
    const next = langFromArg(arg)
    if (next === null) {
      return { text: t.reply.languageUnknown(arg) }
    }
    await setLanguage($, langConfig, next)

    return { text: t.reply.language(LANG_NAMES[next]) }
  })

  on('command.run', { command: 'sound' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const want = /^(on|si|sí|activar|activado|1)$/.test(arg) ? true : /^(off|no|desactivar|desactivado|0)$/.test(arg) ? false : !(await read($, isSoundOn))
    await setSound($, mode, soundConfig, want)

    return {
      text: want ? t.reply.soundOn : t.reply.soundOff,
    }
  })

  on('command.run', { command: 'logbook' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: t.pane.title })

    return { text: opened.isPlaced ? t.reply.logbookOpen : t.reply.logbookLater(opened.reason) }
  })

  // ─── La bitácora, en un panel junto a la conversación ─────────────

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    t = TEXT[await read($, language)]
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
            {t.pane.day(days.length + 1)} · {ph.icon} {ph.name} · {percent ?? 0} %
          </Text>
          <Text dimColor>
            {skyOf(w).icon} {skyOf(w).name} · {tally(day)}
          </Text>
          <Text dimColor>{mates.length === 0 ? t.pane.solo : t.pane.with(mates.map(c => c.type).join(', '))}</Text>
        </Box>
        <Box flexDirection="column">
          {shown.length === 0 && <Text dimColor>{t.pane.empty}</Text>}
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
                  <Text>{MARK_KINDS.includes(x.kind) ? `${t.marks[x.kind as MarkKind]}: ${x.label}` : x.label}</Text>
                </Text>
              </Box>
            )
          })}
        </Box>
        {days.length > 0 && (
          <Box flexDirection="column">
            <Text bold>{t.pane.pastDays}</Text>
            {days.slice(-5).map((d, k) => (
              <Text key={`dia-${k}`} dimColor>
                {t.pane.day(days.length - Math.min(5, days.length) + k + 1)}: {tally(d)}
              </Text>
            ))}
          </Box>
        )}
        {(percent ?? 0) >= CAMP_FROM && (
          <Button
            key="acampar-panel"
            label={t.band.camp}
            onPress={() => {
              camp($)
              $.ui.toast(t.campText)
            }}
          />
        )}
      </Box>
    )
  })
}
