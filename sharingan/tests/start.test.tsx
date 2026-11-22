import { expect, test } from 'claude-code/testing'

const usage = (percent: number) => ({
  value: { startedAt: 0, context: { tokens: percent * 2000, window: 200000, percent }, rateLimits: [] },
})

test('session.start fija Santomoe al 60 %', async ($, on) => {
  const sets: { backdrop?: { scene?: string } }[] = []
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(60))
  on('theme.set', (_, e) => { sets.push(e as never); return { value: { isDrawn: true, requestId: 't' } } })
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets.length).toBe(1)
  expect(sets[0]?.backdrop?.scene).toBe('etapa-3-auto')
})

test('al pasar del 10 % al 90 % entra en Mangekyō, avisa y ofrece Kai', async ($, on) => {
  const toasts: string[] = []
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(10))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', (_, e) => { toasts.push(String((e as { text?: string }).text ?? e)); return { value: undefined } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure({ context: { tokens: 180000, window: 200000, percent: 90 }, rateLimits: [], changed: ['context'] })
  expect(toasts.length).toBe(1)
  expect(toasts[0]?.includes('Mangekyō')).toBe(true)

  const ui = await $.ui.mount({ plugin: 'sharingan', component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never)
  expect((await ui.find({ type: 'Text', text: /Mangekyō/ })) !== undefined).toBe(true)
  expect((await ui.find({ type: 'Button', key: 'kai' } as never)) !== undefined).toBe(true)
  await ui.unmount()
})

test('el modo claro pinta papel washi y fija el esquema claro', { options: { modo: 'claro' } }, async ($, on) => {
  const sets: { overrideColorScheme?: string }[] = []
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(5))
  on('theme.set', (_, e) => { sets.push(e as never); return { value: { isDrawn: true, requestId: 't' } } })
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets[0]?.overrideColorScheme).toBe('light')

  const ui = await $.ui.mount({ plugin: 'sharingan', component: 'Backdrop', surface: 'desktop', props: { scene: 'etapa-1-claro', plugin: 'sharingan', glass: false } } as never)
  const svg = (await ui.find({ type: 'Svg' } as never)) as { props?: { source?: string } } | undefined
  expect(svg?.props?.source?.includes('--ground: #F3EBE6')).toBe(true)
  expect(svg?.props?.source?.includes('prefers-color-scheme')).toBe(false)
  await ui.unmount()
})
