import { expect, test } from 'claude-code/testing'

const usage = (percent: number) => ({
  value: { startedAt: 0, context: { tokens: percent * 2000, window: 200000, percent }, rateLimits: [] },
})

test('session.start fija la fase Mediodía al 40 % y el explorador espera', async ($, on) => {
  const sets: { backdrop?: { scene?: string } }[] = []
  const status: string[] = []
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(40))
  on('theme.set', (_, e) => { sets.push(e as never); return { value: { isDrawn: true, requestId: 't' } } })
  on('ui.status', (_, e) => { status.push(String((e as { text?: string }).text ?? e)); return { value: undefined } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets.length).toBe(1)
  expect(sets[0]?.backdrop?.scene).toBe('fase-3-auto')
  expect(status.some(s => s.includes('Mediodía') && s.includes('esperándote'))).toBe(true)
})

test('el turno hace caminar al explorador y su fin lo detiene', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(5))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hola', turnId: 't1' } as never)

  const walking = await $.ui.mount({ plugin: 'rogue-road', component: 'Backdrop', surface: 'desktop', props: { scene: 'fase-1-auto', plugin: 'rogue-road', glass: false } } as never)
  const svg = (await walking.find({ type: 'Svg' } as never)) as { props?: { source?: string } } | undefined
  expect(svg?.props?.source?.includes('<g class="explora"')).toBe(true)
  await walking.unmount()

  await $.turn.complete({ reason: 'answer', answer: 'listo', durationMs: 1, isAborted: false, turnId: 't1' } as never)
  const waiting = await $.ui.mount({ plugin: 'rogue-road', component: 'Backdrop', surface: 'desktop', props: { scene: 'fase-1-auto', plugin: 'rogue-road', glass: false } } as never)
  const still = (await waiting.find({ type: 'Svg' } as never)) as { props?: { source?: string } } | undefined
  expect(still?.props?.source?.includes('<g class="espera"')).toBe(true)
  await waiting.unmount()
})

test('al pasar del 10 % al 92 % anochece, avisa y la banda ofrece acampar', async ($, on) => {
  const toasts: string[] = []
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(10))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', (_, e) => { toasts.push(String((e as { text?: string }).text ?? e)); return { value: undefined } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure({ context: { tokens: 184000, window: 200000, percent: 92 }, rateLimits: [], changed: ['context'] })
  expect(toasts.length).toBe(1)
  expect(toasts[0]?.includes('Anochecer')).toBe(true)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'rogue-road', component: 'AbovePrompt', surface, props: { hasSurvey: false } } as never)
    expect((await ui.find({ type: 'Text', text: /Anochecer/ })) !== undefined).toBe(true)
    expect((await ui.find({ type: 'Button', key: 'acampar' } as never)) !== undefined).toBe(true)
    await ui.unmount()
  }
})

test('el modo oscuro fija el esquema y pinta el navy del brand', { options: { modo: 'oscuro' } }, async ($, on) => {
  const sets: { overrideColorScheme?: string }[] = []
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(5))
  on('theme.set', (_, e) => { sets.push(e as never); return { value: { isDrawn: true, requestId: 't' } } })
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets[0]?.overrideColorScheme).toBe('dark')

  const ui = await $.ui.mount({ plugin: 'rogue-road', component: 'Backdrop', surface: 'desktop', props: { scene: 'fase-1-oscuro', plugin: 'rogue-road', glass: false } } as never)
  const svg = (await ui.find({ type: 'Svg' } as never)) as { props?: { source?: string } } | undefined
  expect(svg?.props?.source?.includes('--ground: #0A1B35')).toBe(true)
  expect(svg?.props?.source?.includes('prefers-color-scheme')).toBe(false)
  await ui.unmount()
})

test('/acampar deja el campamento pendiente y encarga el /compact al terminar el turno', async ($, on) => {
  const runs: string[] = []
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('command.run', { command: 'compact' }, (_, e) => {
    runs.push(e.args)
    return { text: 'compacted' }
  })
  on('turn.complete', () => ({ text: '' }))

  const answer = await $.command.run({ command: 'acampar', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
  expect(answer.text?.startsWith('⛺')).toBe(true)
  expect(runs.length).toBe(0)

  await $.turn.complete({ reason: 'answer', answer: 'listo', durationMs: 1, isAborted: false, turnId: 't1' } as never)
  for (let i = 0; i < 20 && runs.length === 0; i++) {
    await Promise.resolve()
  }
  expect(runs.length).toBe(1)
  expect(runs[0]?.includes('rumbo')).toBe(true)
})

test('el fondo lleva la insignia con la fase y el contexto, y no pasa del límite de la app', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(33))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'rogue-road', component: 'Backdrop', surface: 'desktop', props: { scene: 'fase-2-auto', plugin: 'rogue-road', glass: false } } as never)
  const svg = (await ui.find({ type: 'Svg' } as never)) as { props?: { source?: string } } | undefined
  const source = svg?.props?.source ?? ''
  expect(source.includes('class="badge"')).toBe(true)
  expect(source.includes('>Mañana</text>')).toBe(true)
  expect(source.includes('33 % · esperándote')).toBe(true)
  expect(source.length <= 126000).toBe(true)
  await ui.unmount()
})

test('el explorador vive en la viñeta del costado y al anochecer arde la fogata', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(94))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'rogue-road', component: 'Backdrop', surface: 'desktop', props: { scene: 'fase-6-auto', plugin: 'rogue-road', glass: false } } as never)
  const svg = (await ui.find({ type: 'Svg' } as never)) as { props?: { source?: string } } | undefined
  const source = svg?.props?.source ?? ''
  expect(source.includes('<g class="vignette espera"')).toBe(true)
  expect(source.includes('class="flame"')).toBe(true)
  expect(source.includes('opacity="1.00" display="none"')).toBe(false)
  await ui.unmount()
})

test('la banda muestra el desglose del contexto, los límites y el costo', async ($, on) => {
  const cat = (name: string, tokens: number, color: string, kind: string) => ({ name, tokens, color, kind, isDeferred: kind === 'deferred' })
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', (_, e) => ({
    value: {
      startedAt: 0,
      context: {
        tokens: 154600, window: 1000000, percent: 15,
        ...((e as { breakdown?: string }).breakdown === undefined ? {} : {
          breakdown: {
            categories: [
              cat('System prompt', 4500, 'promptBorder', 'used'), cat('System tools', 21300, 'inactive', 'used'),
              cat('Messages', 105500, 'permission', 'used'), cat('Autocompact buffer', 33000, 'inactive', 'buffer'),
              cat('Free space', 812400, 'inactive', 'free'),
            ],
            totalTokens: 154600, maxTokens: 1000000, rawMaxTokens: 1000000, autocompactSource: 'model-default', percentage: 15,
            gridRows: [], model: 'Opus 5.5', memoryFiles: [], mcpTools: [], agents: [], isAutoCompactEnabled: true, autoCompactThreshold: 967000,
          },
        }),
      },
      rateLimits: [{ kind: 'five_hour', percentUsed: 23 }],
      cost: { usd: 3.2 },
    } as never,
  }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'rogue-road', component: 'AbovePrompt', surface, props: { hasSurvey: false, bodyColumns: 100 } } as never)
    expect((await ui.find({ type: 'Text', text: /154\.6k\/1M/ })) !== undefined).toBe(true)
    expect((await ui.find({ type: 'Text', text: /Messages 105\.5k/ })) !== undefined).toBe(true)
    expect((await ui.find({ type: 'Text', text: /Free space 812\.4k/ })) !== undefined).toBe(true)
    expect((await ui.find({ type: 'Text', text: /límite 5 h 23 %/ })) !== undefined).toBe(true)
    expect((await ui.find({ type: 'Text', text: /US\$ 3\.20 \(estimado\)/ })) !== undefined).toBe(true)
    expect((await ui.find({ type: 'Button', key: 'detalle' } as never)) !== undefined).toBe(true)
    await ui.unmount()
  }
})
