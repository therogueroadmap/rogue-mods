import { expect, test } from 'claude-code/testing'

test('session.start fija el tema de la etapa 3 al 50 %', async ($, on) => {
  const sets: unknown[] = []
  on('command.register', () => ({ value: { command: 'chakra' } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 100000, window: 200000, percent: 50 }, rateLimits: [] } }))
  on('theme.set', (_, e) => { sets.push(e); return { value: { isDrawn: true, requestId: 't' } } })
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets.length).toBe(1)
})

test('al pasar del 10 % al 85 % se degrada a Rasengan incompleto y avisa', async ($, on) => {
  const toasts: string[] = []
  on('command.register', () => ({ value: { command: 'chakra' } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 20000, window: 200000, percent: 10 }, rateLimits: [] } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', (_, e) => { toasts.push(String((e as { text?: string }).text ?? e)); return { value: undefined } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure({ context: { tokens: 170000, window: 200000, percent: 85 }, rateLimits: [], changed: ['context'] })
  expect(toasts.length).toBe(1)

  const ui = await $.ui.mount({ plugin: 'rasenshuriken', component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never)
  expect((await ui.find({ type: 'Text', text: /Rasengan incompleto/ })) !== undefined).toBe(true)
  await ui.unmount()
})

test('el modo claro fija el esquema claro y pinta un cielo de día', { options: { modo: 'claro' } }, async ($, on) => {
  const sets: { overrideColorScheme?: string; backdrop?: { scene?: string } }[] = []
  on('command.register', () => ({ value: { command: 'chakra' } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 10000, window: 200000, percent: 5 }, rateLimits: [] } }))
  on('theme.set', (_, e) => { sets.push(e as never); return { value: { isDrawn: true, requestId: 't' } } })
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets[0]?.overrideColorScheme).toBe('light')
  expect(sets[0]?.backdrop?.scene).toBe('etapa-1-claro')

  const ui = await $.ui.mount({ plugin: 'rasenshuriken', component: 'Backdrop', surface: 'desktop', props: { scene: 'etapa-1-claro', plugin: 'rasenshuriken', glass: false } } as never)
  const svg = await ui.find({ type: 'Svg' } as never) as { props?: { source?: string } } | undefined
  expect(svg?.props?.source?.includes('--sky: #E8F0F8')).toBe(true)
  expect(svg?.props?.source?.includes('prefers-color-scheme')).toBe(false)
  await ui.unmount()
})
