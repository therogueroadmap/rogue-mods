import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { sunAt, zoneAt } from '../hooks/scene'

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

test('/make-camp deja el campamento pendiente y encarga el /compact al terminar el turno', async ($, on) => {
  const runs: string[] = []
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('command.run', { command: 'compact' }, (_, e) => {
    runs.push(e.args)
    return { text: 'compacted' }
  })
  on('turn.complete', () => ({ text: '' }))

  const answer = await $.command.run({ command: 'make-camp', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
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

// ─── 0.6.0: hitos, clima, compañeros, bitácora, sonido y fondo interactivo ─

type On = Parameters<TestBody>[1]

const base = (on: On, percent = 30, sets?: unknown[]) => {
  const store = new Map<string, unknown>()
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => usage(percent))
  on('theme.set', (_, e) => { sets?.push(e); return { value: { isDrawn: true, requestId: 't' } } })
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', (_, e) => ({ value: store.get((e as { key: string }).key) }))
  on('store.set', (_, e) => { store.set((e as { key: string }).key, (e as { value: unknown }).value); return { value: undefined } })
}

const backdrop = async ($: Parameters<TestBody>[0]): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'rogue-road', component: 'Backdrop', surface: 'desktop', props: { scene: 'fase-2-auto', plugin: 'rogue-road', glass: false } } as never)
  const svg = (await ui.find({ type: 'Svg' } as never)) as { props?: { source?: string } } | undefined
  await ui.unmount()

  return svg?.props?.source ?? ''
}

test('un commit deja un hito en el camino, en la banda y en la bitácora', async ($, on) => {
  base(on)
  on('classic.PostToolUse', () => ({}))
  on('ui.open', () => ({ value: { isPlaced: true, requestId: 'p' } }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.classic.PostToolUse({
    tool_name: 'Bash',
    tool_input: { command: 'git commit -m "feat: el mapa"' },
    tool_response: { stdout: '[main 1a2b3c4] feat: el mapa\n 1 file changed' },
    tool_use_id: 'u1',
  } as never)

  const source = await backdrop($)
  expect(source.includes('class="mark"')).toBe(true)
  expect(source.includes('<title>feat: el mapa</title>')).toBe(true)

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ plugin: 'rogue-road', component: 'AbovePrompt', surface, props: { hasSurvey: false } } as never)
    expect((await band.find({ type: 'Text', text: /•/ })) !== undefined).toBe(true)
    await band.unmount()
    const pane = await $.ui.mount({ plugin: 'rogue-road', component: 'Pane', requestId: 'bitacora', surface, props: { title: 'Bitácora del viaje', isFocused: false, bodyColumns: 48, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } } as never)
    expect((await pane.find({ type: 'Text', text: /commit: feat: el mapa/ })) !== undefined).toBe(true)
    expect((await pane.find({ type: 'Text', text: /1 commit/ })) !== undefined).toBe(true)
    await pane.unmount()
  }
})

test('los fallos seguidos traen lluvia y los tests en verde despejan', async ($, on) => {
  const toasts: string[] = []
  base(on)
  on('classic.PostToolUse', () => ({}))
  on('classic.PostToolUseFailure', () => ({}))
  on('ui.toast', (_, e) => { toasts.push(String((e as { text?: string }).text ?? e)); return { value: undefined } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  for (let i = 0; i < 4; i++) {
    await $.classic.PostToolUseFailure({ tool_name: 'Bash', tool_input: { command: 'make' }, tool_use_id: `f${i}`, error: 'exit 2' } as never)
  }
  expect(toasts.some(t => t.startsWith('☂'))).toBe(true)
  expect((await backdrop($)).includes('class="rain"')).toBe(true)

  await $.classic.PostToolUse({ tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_response: { stdout: 'ok' }, tool_use_id: 't1' } as never)
  expect(toasts.some(t => t.startsWith('☼'))).toBe(true)
  expect((await backdrop($)).includes('class="rain"')).toBe(false)
})

test('un límite de uso alto trae tormenta', async ($, on) => {
  let limit = 10
  on('command.register', (_, e) => ({ value: { command: (e as { name: string }).name } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 60000, window: 200000, percent: 30 }, rateLimits: [{ kind: 'five_hour', percentUsed: limit }] } as never }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.toast', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  limit = 86
  await $.session.measure({ context: { tokens: 60000, window: 200000, percent: 30 }, rateLimits: [{ kind: 'five_hour', percentUsed: 86 }], changed: ['rateLimits'] } as never)
  const source = await backdrop($)
  expect(source.includes('class="bolt"')).toBe(true)
})

test('los subagentes caminan junto al viajero y se van al terminar', async ($, on) => {
  base(on)
  on('classic.SubagentStart', () => ({}))
  on('classic.SubagentStop', () => ({}))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.classic.SubagentStart({ agent_id: 'a1', agent_type: 'Explore' } as never)
  await $.classic.SubagentStart({ agent_id: 'a2', agent_type: 'general-purpose' } as never)
  expect((await backdrop($)).includes('companion c1')).toBe(true)
  const band = await $.ui.mount({ plugin: 'rogue-road', component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never)
  expect((await band.find({ type: 'Text', text: /⚇ 2/ })) !== undefined).toBe(true)
  await band.unmount()

  await $.classic.SubagentStop({ agent_id: 'a1', agent_type: 'Explore', stop_hook_active: false, agent_transcript_path: '/x' } as never)
  await $.classic.SubagentStop({ agent_id: 'a2', agent_type: 'general-purpose', stop_hook_active: false, agent_transcript_path: '/x' } as never)
  expect((await backdrop($)).includes('companion c0')).toBe(false)
})

test('el tema suena por defecto, /sound off lo silencia y la opción lo deja apagado', async ($, on) => {
  const sets: { sound?: { ambience?: { layers: unknown[] } } }[] = []
  base(on, 92, sets)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect((sets[0]?.sound?.ambience?.layers.length ?? 0) > 0).toBe(true)

  const off = await $.command.run({ command: 'sound', args: 'off', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as never)
  expect(off.text?.includes('deshabilitado')).toBe(true)
  expect(sets[sets.length - 1]?.sound).toBe(undefined)

  const band = await $.ui.mount({ plugin: 'rogue-road', component: 'AbovePrompt', surface: 'desktop', props: { hasSurvey: false } } as never)
  await band.press({ key: 'sonido' })
  await band.unmount()
  expect((sets[sets.length - 1]?.sound?.ambience?.layers.length ?? 0) > 0).toBe(true)
})

test('con la opción de sonido desactivado el tema no suena', { options: { sonido: 'desactivado' } }, async ($, on) => {
  const sets: { sound?: unknown }[] = []
  base(on, 30, sets)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets[sets.length - 1]?.sound).toBe(undefined)
})

test('los clics del fondo caen en la insignia, el viajero, el sol y el campamento', () => {
  expect(zoneAt(0.1, 0.12, 50)).toBe('insignia')
  expect(zoneAt(0.1, 0.85, 50)).toBe('viajero')
  expect(zoneAt(0.95, 0.6, 50)).toBe('campamento')
  const sun = sunAt(40)
  expect(zoneAt(sun.x / 1600, (sun.y / 520) * 0.64, 40)).toBe('sol')
  expect(zoneAt(0.5, 0.9, 40)).toBe(null)
})

// ─── 0.7.0: cerrar el día ─────────────────────────────────────────────

const run = (command: string, args = '') =>
  ({ command, args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as never

test('/clear-trail encarga el /clear apenas queda libre la sesión', async ($, on) => {
  const runs: string[] = []
  const clock = mock.clock(on)
  base(on)
  on('ui.log', () => ({ value: undefined }))
  on('command.run', { command: 'clear' }, () => { runs.push('clear'); return { text: 'cleared' } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run(run('clear-trail'))
  expect(runs.length).toBe(0)
  await clock.advance(500)
  expect(runs).toEqual(['clear'])
})

test('/clear-trail deja la limpieza pendiente y encarga el /clear al terminar el turno', async ($, on) => {
  const runs: string[] = []
  base(on)
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('command.run', { command: 'clear' }, () => { runs.push('clear'); return { text: 'cleared' } })
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const answer = await $.command.run(run('clear-trail'))
  expect(answer.text?.startsWith('⌫')).toBe(true)
  await $.turn.complete({ reason: 'answer', answer: 'listo', durationMs: 1, isAborted: false, turnId: 't1' } as never)
  for (let i = 0; i < 20 && runs.length === 0; i++) {
    await Promise.resolve()
  }
  expect(runs).toEqual(['clear'])
})

test('/trail-log pide el resumen con la bitácora del día', async ($, on) => {
  const prompts: string[] = []
  const clock = mock.clock(on)
  base(on)
  on('classic.PostToolUse', () => ({}))
  on('prompt.submit', (_, e) => { prompts.push(e.text); return { text: e.text } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.classic.PostToolUse({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' }, tool_response: { stdout: '[main abc1234] feat: el mapa' }, tool_use_id: 'u1' } as never)

  const answer = await $.command.run(run('trail-log', 'lo pendiente'))
  expect(answer.text?.startsWith('✎')).toBe(true)
  expect(prompts.length).toBe(0)
  await clock.advance(500)
  expect(prompts[0]?.includes('/trail-log')).toBe(true)
  expect(prompts[0]?.includes('Foco pedido: lo pendiente')).toBe(true)
  expect(prompts[0]?.includes('commit: feat: el mapa')).toBe(true)
})

test('/pass-the-map pide el handoff con su propósito y las reglas de la skill', async ($, on) => {
  const prompts: string[] = []
  const clock = mock.clock(on)
  base(on)
  on('prompt.submit', (_, e) => { prompts.push(e.text); return { text: e.text } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const answer = await $.command.run(run('pass-the-map', 'prototipo del panel'))
  expect(answer.text?.startsWith('⇢')).toBe(true)
  await clock.advance(500)
  expect(prompts[0]?.includes('skill `handoff`')).toBe(true)
  expect(prompts[0]?.includes('Propósito de la próxima sesión: prototipo del panel')).toBe(true)
  expect(prompts[0]?.includes('$TMPDIR')).toBe(true)

  const pane = await $.ui.mount({ plugin: 'rogue-road', component: 'Pane', requestId: 'bitacora', surface: 'terminal', props: { title: 'Bitácora del viaje', isFocused: false, bodyColumns: 48, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } } as never)
  expect((await pane.find({ type: 'Text', text: /Pasa el mapa: prototipo del panel/ })) !== undefined).toBe(true)
  await pane.unmount()
})
