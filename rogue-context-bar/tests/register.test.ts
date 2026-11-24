import { expect, mock, test } from 'claude-code/testing'
import type { SessionUsage } from 'claude-code'
import type { TestBody } from 'claude-code/testing'

import { CONTEXT_ALERT, LIMIT_ALERT, PLACEMENT, alertOf, bandBarWidth, cells, extrasText, formatTokens, resetText, statusText } from '../hooks/register'

const fakeUsage: SessionUsage = {
  startedAt: 0,
  rateLimits: [],
  context: {
    window: 200_000,
    tokens: 60_000,
    percent: 30,
    breakdown: {
      categories: [
        { name: 'System prompt', tokens: 20_000, color: 'promptBorder', isDeferred: false, kind: 'used' },
        { name: 'Messages', tokens: 40_000, color: 'permission', isDeferred: false, kind: 'used' },
        { name: 'MCP tools (deferred)', tokens: 9_000, color: 'inactive', isDeferred: true, kind: 'deferred' },
        { name: 'Free space', tokens: 140_000, color: 'inactive', isDeferred: false, kind: 'free' },
      ],
      totalTokens: 60_000,
      maxTokens: 200_000,
      rawMaxTokens: 200_000,
      autocompactSource: 'model-default',
      percentage: 30,
      gridRows: [],
      model: 'test-model',
      memoryFiles: [],
      mcpTools: [],
      agents: [],
      isAutoCompactEnabled: true,
      autoCompactThreshold: 167_000,
      apiUsage: null,
    },
  },
}

const toggle = {
  command: 'context-bar',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

const bandProps = {
  hasSurvey: false,
  isCollapsed: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 40,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
} as const

type On = Parameters<TestBody>[1]

/** Answers the engine events these tests raise: nothing beneath the plugin answers them in the test harness. */
const engine = (on: On, stored: Record<string, unknown> = {}) => {
  mock.store(on, stored)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('ui.status', () => ({ value: undefined }))
}

test('cells fill the width in proportion and keep tiny rows visible', () => {
  expect(cells([{ tokens: 1 }, { tokens: 1 }], 10)).toEqual([5, 5])
  expect(cells([{ tokens: 30 }, { tokens: 70 }], 10)).toEqual([3, 7])
  const tiny = cells([{ tokens: 1 }, { tokens: 10_000 }], 20)
  expect(tiny).toEqual([1, 19])
  expect(cells([], 10)).toEqual([])
  expect(formatTokens(1_500)).toBe('1.5k')
  expect(formatTokens(200_000)).toBe('200k')
})

test('band bar fills the terminal and uses the rogue-road width on desktop', () => {
  expect(bandBarWidth('terminal', 120)).toBe(120)
  expect(bandBarWidth('terminal', 4)).toBe(10)
  expect(bandBarWidth('vscode', 90)).toBe(90)
  // desktop: (bodyColumns - 2) capped to 20..160, then 72%, at least 16.
  expect(bandBarWidth('desktop', 120)).toBe(85)
  expect(bandBarWidth('desktop', 300)).toBe(115)
  expect(bandBarWidth('desktop', 10)).toBe(16)
})

test('status line shows the bar with one glyph per used category', () => {
  const text = statusText(
    {
      rows: [
        { name: 'System prompt', tokens: 20_000, color: 'promptBorder', kind: 'used' },
        { name: 'Messages', tokens: 40_000, color: 'permission', kind: 'used' },
        { name: 'Free space', tokens: 140_000, color: 'inactive', kind: 'free' },
      ],
      totalTokens: 60_000,
      maxTokens: 200_000,
      percent: 30,
    },
    10,
  )
  expect(text).toBe('ctx 30% [#==.......] 60k/200k · # System prompt 20k · = Messages 40k')
})

test('/context-bar toggles the status line', async ($, on) => {
  engine(on)
  on('session.usage', () => ({ value: fakeUsage }))
  expect((await $.command.run(toggle)).text).toBe('Context bar hidden.')
  expect((await $.command.run(toggle)).text).toBe('Context bar shown.')
})

test('a hide stored by an earlier session keeps the bar hidden', async ($, on) => {
  engine(on, { isHidden: true })
  on('session.usage', () => ({ value: fakeUsage }))

  await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })

  // The stored hide holds: the next /context-bar shows the bar again.
  expect((await $.command.run(toggle)).text).toBe('Context bar shown.')
})

for (const surface of PLACEMENT === 'above' ? (['terminal', 'desktop'] as const) : []) {
  test(`${surface}: bar draws after a context measure and /context-bar toggles it`, async ($, on) => {
  engine(on)
    on('session.usage', () => ({ value: fakeUsage }))

    await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })

    const shown = await $.ui.mount({ plugin: 'rogue-context-bar', surface, component: 'AbovePrompt', props: bandProps })
    expect(await shown.find({ text: /Context 30%/ })).toBeDefined()
    expect(await shown.find({ text: /Messages 40k/ })).toBeDefined()
    expect(await shown.find({ text: /deferred/ })).toBeUndefined()

    const hidden = await $.command.run(toggle)
    expect(hidden.text).toBe('Context bar hidden.')
    const gone = await $.ui.mount({ plugin: 'rogue-context-bar', surface, component: 'AbovePrompt', props: bandProps })
    expect(await gone.find({ text: /Context 30%/ })).toBeUndefined()

    const back = await $.command.run(toggle)
    expect(back.text).toBe('Context bar shown.')
  })
}

test('resetText shows the time today and the weekday on another day', () => {
  const now = new Date(2026, 10, 23, 1, 0)
  expect(resetText(new Date(2026, 10, 23, 4, 10).toISOString(), now)).toBe(' (resets 04:10)')
  expect(resetText(new Date(2026, 10, 27, 20, 0).toISOString(), now)).toBe(' (resets Fri 20:00)')
  expect(resetText(null, now)).toBe('')
  expect(resetText('not a date', now)).toBe('')
})

test('extrasText lists model, limits, autocompaction and cost, leaving out what is missing', () => {
  const now = new Date(2026, 10, 23, 1, 0)
  const base = { rows: [], totalTokens: 0, maxTokens: 1_000_000, percent: 0 }
  expect(
    extrasText(
      {
        ...base,
        model: 'claude-opus-5-5',
        limits: [
          { kind: 'five_hour', percentUsed: 1, resetsAt: new Date(2026, 10, 23, 4, 10).toISOString() },
          { kind: 'seven_day', percentUsed: 45, resetsAt: new Date(2026, 10, 27, 20, 0).toISOString() },
        ],
        threshold: 967_000,
        usd: 0,
      },
      now,
    ),
  ).toBe('claude-opus-5-5 · 5h limit 1% (resets 04:10) · 7d limit 45% (resets Fri 20:00) · autocompacts at 967k · ≈ US$0.00 (estimated)')
  // A value stored by 0.1.0 has no extras: the line is empty and the band leaves it out.
  expect(extrasText(base, now)).toBe('')
})

test('the band draws the extras line and a limits change refreshes it', async ($, on) => {
  engine(on)
  let percentUsed = 10
  on('session.usage', () => ({
    value: { ...fakeUsage, rateLimits: [{ kind: 'five_hour', percentUsed }], cost: { usd: 0.31 } },
  }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })
  const first = await $.ui.mount({ plugin: 'rogue-context-bar', surface: 'terminal', component: 'AbovePrompt', props: bandProps })
  expect(await first.find({ text: /test-model · 5h limit 10% · autocompacts at 167k · ≈ US\$0\.31 \(estimated\)/ })).toBeDefined()
  await first.unmount()

  percentUsed = 11
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['rateLimits'] })
  const second = await $.ui.mount({ plugin: 'rogue-context-bar', surface: 'terminal', component: 'AbovePrompt', props: bandProps })
  expect(await second.find({ text: /5h limit 11%/ })).toBeDefined()
  await second.unmount()
})

test('alertOf: limits yellow from 70 % and red from 90 %, context from 45 % and 60 %', () => {
  expect(alertOf(69.9, LIMIT_ALERT)).toBe(undefined)
  expect(alertOf(70, LIMIT_ALERT)).toBe('warning')
  expect(alertOf(89.9, LIMIT_ALERT)).toBe('warning')
  expect(alertOf(90, LIMIT_ALERT)).toBe('error')
  expect(alertOf(44.9, CONTEXT_ALERT)).toBe(undefined)
  expect(alertOf(45, CONTEXT_ALERT)).toBe('warning')
  expect(alertOf(59.9, CONTEXT_ALERT)).toBe('warning')
  expect(alertOf(60, CONTEXT_ALERT)).toBe('error')
})

test('the band paints each limit in its alert colour and leaves the rest dim', async ($, on) => {
  engine(on)
  on('session.usage', () => ({
    value: {
      ...fakeUsage,
      rateLimits: [
        { kind: 'five_hour', percentUsed: 10 },
        { kind: 'seven_day', percentUsed: 75 },
        { kind: 'spend_limit', percentUsed: 95 },
      ],
    },
  }))
  await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })
  const band = await $.ui.mount({ plugin: 'rogue-context-bar', surface: 'terminal', component: 'AbovePrompt', props: bandProps })
  const colorOf = async (text: RegExp) =>
    ((await band.find({ type: 'Text', text })) as { props?: { color?: string } } | undefined)?.props?.color
  expect(await colorOf(/^5h limit 10%$/)).toBe(undefined)
  expect(await colorOf(/^7d limit 75%$/)).toBe('warning')
  expect(await colorOf(/^spend limit 95%$/)).toBe('error')
  // 30 % of context: below 45 %, no alert colour.
  expect(await colorOf(/^30%$/)).toBe(undefined)
  await band.unmount()
})
