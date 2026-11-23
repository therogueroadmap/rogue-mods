import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { BarLimit, BarRow, BarUsage } from '../types'

const COMMAND = 'context-bar'

/**
 * Where the bar shows: `status` as a plain-text status line under the prompt,
 * `above` as the coloured band above it.
 */
export const PLACEMENT = 'above' as 'status' | 'above'

/** Cells of the status-line bar; the line is shared, so it stays short. */
const STATUS_WIDTH = 30

/**
 * The status line has no colours: one ASCII glyph per used category, in order.
 * Block and pattern glyphs (▞ ▤ ...) are missing from common Windows terminal fonts.
 */
const USED_GLYPHS = ['#', '=', '+', '*', '%', '@', '&', '$'] as const

const usage = atom({ plugin: 'rogue-context-bar', key: 'usage' } as const, null)
const isHidden = atom({ plugin: 'rogue-context-bar', key: 'isHidden' } as const, false)

/** `$.store` key that keeps /context-bar's hide across sessions. */
const HIDDEN_KEY = 'isHidden'

/**
 * Splits `width` cells across the rows in proportion to their tokens
 * (largest remainder), giving every non-empty row at least one cell while
 * there is room.
 */
export function cells(rows: readonly { tokens: number }[], width: number): number[] {
  const total = rows.reduce((sum, row) => sum + row.tokens, 0)
  if (total <= 0 || width <= 0) {
    return rows.map(() => 0)
  }

  const exact = rows.map(row => (row.tokens / total) * width)
  const out = exact.map(Math.floor)
  const left = width - out.reduce((sum, n) => sum + n, 0)
  const byRemainder = exact
    .map((value, i) => ({ i, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest)
    .slice(0, left)
  for (const { i } of byRemainder) {
    out[i] = (out[i] ?? 0) + 1
  }

  // A tiny category still shows: borrow a cell from the widest row.
  rows.forEach((row, i) => {
    if (row.tokens > 0 && out[i] === 0) {
      const widest = out.indexOf(Math.max(...out))
      const room = out[widest] ?? 0
      if (room > 1) {
        out[widest] = room - 1
        out[i] = 1
      }
    }
  })

  return out
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(tokens)
}

const LIMIT_NAMES: Record<string, string> = { five_hour: '5h limit', seven_day: '7d limit', spend_limit: 'spend limit' }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** `(resets 04:10)` today, `(resets Fri 20:00)` on another day; '' with no valid reset. */
export function resetText(resetsAt: string | null, now = new Date()): string {
  if (resetsAt === null) return ''
  const at = new Date(resetsAt)
  if (Number.isNaN(at.getTime())) return ''
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  const isToday = at.toDateString() === now.toDateString()

  return ` (resets ${isToday ? '' : `${DAYS[at.getDay()]} `}${time})`
}

/** Alert colour: `warning` (yellow) from `warn` %, `error` (red) from `danger` %, none below. */
export type Alert = 'warning' | 'error' | undefined

export const LIMIT_ALERT = { warn: 70, danger: 90 } as const
export const CONTEXT_ALERT = { warn: 45, danger: 60 } as const

export function alertOf(percent: number, at: { warn: number; danger: number }): Alert {
  if (percent >= at.danger) return 'error'
  if (percent >= at.warn) return 'warning'
  return undefined
}

/** The extras line's parts, each with the alert colour it draws in (only the limits take one). */
export function extrasParts(current: BarUsage, now = new Date()): { text: string; alert: Alert }[] {
  const limits: BarLimit[] = current.limits ?? []

  return [
    current.model ? { text: current.model, alert: undefined } : null,
    ...limits.map(l => ({
      text: `${LIMIT_NAMES[l.kind] ?? l.kind} ${l.percentUsed}%${resetText(l.resetsAt, now)}`,
      alert: alertOf(l.percentUsed, LIMIT_ALERT),
    })),
    current.threshold === null || current.threshold === undefined
      ? null
      : { text: `autocompacts at ${formatTokens(current.threshold)}`, alert: undefined },
    current.usd === null || current.usd === undefined
      ? null
      : { text: `≈ US$${current.usd.toFixed(2)} (estimated)`, alert: undefined },
  ].filter((part): part is { text: string; alert: Alert } => part !== null)
}

/**
 * The extras line: `Opus 5.5 · 5h limit 1% (resets 04:10) · 7d limit 45% (resets Fri 20:00)
 * · autocompacts at 967k · ≈ US$0.31 (estimated)`. Parts with no data are left out.
 */
export function extrasText(current: BarUsage, now = new Date()): string {
  return extrasParts(current, now)
    .map(part => part.text)
    .join(' · ')
}

function glyphOf(row: BarRow, usedIndex: number): string {
  if (row.kind === 'free') return '.'
  if (row.kind === 'buffer') return '~'
  return USED_GLYPHS[usedIndex % USED_GLYPHS.length] ?? '#'
}

/**
 * The status-line form: `ctx 30% [##===.....] 60k/200k · # System prompt 20k · = Messages 40k`.
 * Only used categories go in the legend; free space and the buffer read off the bar.
 */
export function statusText(current: BarUsage, width = STATUS_WIDTH): string {
  const widths = cells(current.rows, width)
  let usedIndex = 0
  let bar = ''
  const legend: string[] = []
  current.rows.forEach((row, i) => {
    const glyph = glyphOf(row, usedIndex)
    if (row.kind === 'used') {
      usedIndex += 1
      legend.push(`${glyph} ${row.name} ${formatTokens(row.tokens)}`)
    }
    bar += glyph.repeat(widths[i] ?? 0)
  })

  return [
    `ctx ${current.percent}% [${bar}] ${formatTokens(current.totalTokens)}/${formatTokens(current.maxTokens)}`,
    ...legend,
  ].join(' · ')
}

async function show($: EngineInterface): Promise<void> {
  if (PLACEMENT !== 'status') {
    // Clears a status line left by a load that ran in `status` mode.
    $.ui.status(undefined)
    return
  }
  const current = await read($, usage)
  const hidden = await read($, isHidden)
  $.ui.status(hidden || current === null ? undefined : statusText(current))
}

async function refresh($: EngineInterface): Promise<void> {
  try {
    const { context, rateLimits, cost } = await $.session.usage({ breakdown: 'summary' })
    const breakdown = context.breakdown
    if (!breakdown) {
      return
    }

    const rows: BarRow[] = []
    for (const category of breakdown.categories) {
      if (category.kind === 'deferred' || category.tokens <= 0) continue
      rows.push({
        name: category.name,
        tokens: category.tokens,
        color: category.color,
        kind: category.kind,
      })
    }
    const next: BarUsage = {
      rows,
      totalTokens: breakdown.totalTokens,
      maxTokens: breakdown.rawMaxTokens,
      percent: breakdown.percentage,
      model: breakdown.model ?? null,
      limits: rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt ?? null })),
      threshold: breakdown.autoCompactThreshold ?? null,
      usd: cost?.usd ?? null,
    }
    await update($, usage, () => next)
    await show($)
  } catch {
    // No session bound yet, or the estimate failed: keep the last bar.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Show or hide the context window bar above the prompt',
    })
    const wasHidden = (await $.store.get(HIDDEN_KEY)) === true
    await update($, isHidden, () => wasHidden)
    void refresh($)

    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    const hidden = await update($, isHidden, was => !was)
    await $.store.set(HIDDEN_KEY, hidden)
    if (hidden) {
      await show($)
    } else {
      await refresh($)
    }

    return { text: hidden ? 'Context bar hidden.' : 'Context bar shown.' }
  })

  on('session.measure', async ($, e, next) => {
    // The extras line follows the limits and the cost too, not only the context.
    const isRelevant = e.changed.some(unit => unit === 'context' || unit === 'rateLimits' || unit === 'cost')
    if (isRelevant && !(await read($, isHidden))) {
      await refresh($)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, usage)
    if (PLACEMENT !== 'above' || e.props.hasSurvey || current === null || (await read($, isHidden))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const widths = cells(current.rows, Math.max(10, e.props.bodyColumns))
    const extras = extrasParts(current)
    const contextAlert = alertOf(current.percent, CONTEXT_ALERT)

    return (
      <Box flexDirection="column">
        <Box>
          {current.rows.map((row, i) => {
            const width = widths[i] ?? 0

            return width > 0 ? (
              <Text color={row.color}>{(row.kind === 'free' ? '░' : '█').repeat(width)}</Text>
            ) : null
          })}
        </Box>
        <Box flexWrap="wrap" columnGap={2}>
          <Text>
            <Text dimColor>Context </Text>
            <Text key="context-percent" color={contextAlert} dimColor={contextAlert === undefined}>
              {current.percent}%
            </Text>
            <Text dimColor>
              {' '}
              · {formatTokens(current.totalTokens)}/{formatTokens(current.maxTokens)}
            </Text>
          </Text>
          {current.rows.map(row => (
            <Text>
              <Text color={row.color}>■</Text>
              <Text dimColor>
                {' '}
                {row.name} {formatTokens(row.tokens)}
              </Text>
            </Text>
          ))}
        </Box>
        {extras.length > 0 && (
          <Text wrap="wrap">
            {extras.map((part, i) => (
              <Text key={`extra-${i}`}>
                {i > 0 && <Text dimColor> · </Text>}
                <Text color={part.alert} dimColor={part.alert === undefined}>
                  {part.text}
                </Text>
              </Text>
            ))}
          </Text>
        )}
      </Box>
    )
  })
}
