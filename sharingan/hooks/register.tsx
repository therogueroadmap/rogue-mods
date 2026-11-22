import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Eye } from '../types'
import { makeColors } from './make-colors.js'

// ─── Las cuatro etapas ───────────────────────────────────────────────
// El ojo gana tomoe a medida que crece el contexto. Pasado el 80 %, el
// Mangekyō marca el genjutsu: el modelo puede ver lo que no existe.

type Stage = {
  name: string
  kanji: string
  range: string
  tip: string
  tomoe: number
  isMangekyo: boolean
  /** Segundos por vuelta del ojo. */
  spin: number
  /** Brillo rojo alrededor del ojo, 0 a 1. */
  glow: number
  /** Viñeta roja en los bordes de la escena, 0 a 1. */
  vignette: number
  /** Acento del tema en cada modo. */
  dark: `#${string}`
  light: `#${string}`
}

const STAGES: Stage[] = [
  {
    name: 'Ittomoe · Despertar', kanji: '一つ巴', range: '0–25 %', tomoe: 1, isMangekyo: false,
    tip: 'Contexto nítido. La interfaz está en calma: un tomoe gira despacio.',
    spin: 14, glow: 0, vignette: 0, dark: '#FF8A92', light: '#9C4A52',
  },
  {
    name: 'Nitomoe · Percepción', kanji: '二つ巴', range: '25–50 %', tomoe: 2, isMangekyo: false,
    tip: 'El ojo sigue más hilos. La precisión sigue intacta.',
    spin: 9, glow: 0, vignette: 0.06, dark: '#FF6B75', light: '#A83F49',
  },
  {
    name: 'Santomoe · Carga plena', kanji: '三つ巴', range: '50–80 %', tomoe: 3, isMangekyo: false,
    tip: 'Tres tomoe y giro rápido. Lo más antiguo de la conversación empieza a desdibujarse.',
    spin: 5, glow: 0.28, vignette: 0.1, dark: '#FF4D5A', light: '#B3101D',
  },
  {
    name: 'Mangekyō · Genjutsu', kanji: '万華鏡', range: '80–100 %', tomoe: 0, isMangekyo: true,
    tip: 'Degradación del contexto: las respuestas pueden mezclar realidad e ilusión. Usa /kai para compactar y romper el genjutsu.',
    spin: 18, glow: 0.55, vignette: 0.18, dark: '#FF3346', light: '#C00D20',
  },
]

const LAST = STAGES.length - 1

const stageAt = (i: number): Stage => {
  const s = STAGES[Math.max(0, Math.min(LAST, i))]
  if (s === undefined) {
    throw new Error('etapa fuera de rango')
  }

  return s
}

const stageOf = (percent: number | null): number => {
  if (percent === null || percent < 25) {
    return 0
  }
  if (percent < 50) {
    return 1
  }

  return percent < 80 ? 2 : 3
}

type Mode = 'auto' | 'claro' | 'oscuro'

const modeOf = (value: unknown): Mode => (value === 'claro' || value === 'oscuro' ? value : 'auto')

// ─── Colores: tinta de noche y papel washi de día ────────────────────

const DARK_ANCHORS = {
  'surface-0': '#0D0A0B',
  'surface-1': '#171012',
  'surface-2': '#1C1214',
  'surface-3': '#21161A',
  'text-primary': '#EFE6E3',
  'text-secondary': '#C9B8B4',
  'text-muted': '#A8948F',
}

const LIGHT_ANCHORS = {
  'surface-0': '#F3EBE6',
  'surface-1': '#F8F2EE',
  'surface-2': '#FCF8F5',
  'surface-3': '#FCF8F5',
  'text-primary': '#1F1416',
  'text-secondary': '#4A3A3C',
  'text-muted': '#6A5652',
}

const ROLES = { danger: '#FF5C5C', success: '#5FD3A0', warning: '#FFB08A', pro: '#B59CFF' }
const LIGHT_ROLES = { danger: '#B4232F', success: '#1F7A52', warning: '#9A4A12', pro: '#6B4FC4' }

const themes = STAGES.map(s => {
  const made = makeColors({
    label: `Sharingan · ${s.name}`,
    roles: { accent: s.dark, ...ROLES },
    light: { roles: { accent: s.light, ...LIGHT_ROLES }, gray: { anchors: LIGHT_ANCHORS } },
    dark: { gray: { anchors: DARK_ANCHORS } },
  })
  // Colores de los mensajes, distintos en cada modo.
  const inputs = made.theme.inputs as Record<string, Record<string, string> | undefined>
  inputs.light = {
    ...inputs.light,
    'bg-user-message': '#EFE2DC',
    'text-user-message': '#1F1416',
    'bg-assistant-message': '#FCF8F5',
    'text-assistant-message': '#1F1416',
  }
  inputs.dark = {
    ...inputs.dark,
    'bg-user-message': '#21161A',
    'text-user-message': '#EFE6E3',
    'bg-assistant-message': '#171012',
    'text-assistant-message': '#EFE6E3',
  }

  return made
})

// ─── La escena: el ojo en la esquina superior derecha ────────────────

const K = 7 // unidades del ojo (100) → escena (2400)
const CX = 1860
const CY = 520
const OX = CX - 50 * K
const OY = CY - 50 * K

const TOMOE = '<circle cx="50" cy="21" r="5.6"/><path d="M50 15.4 C41.5 14.6 36 19.5 36.2 27.5 C38.8 22.6 43.5 21.4 46.6 25.4 Z"/>'

const tomoe = (count: number): string => {
  const angles = count === 1 ? [0] : count === 2 ? [0, 180] : [0, 120, 240]

  return angles.map(a => `<g transform="rotate(${a} 50 50)">${TOMOE}</g>`).join('')
}

const pupil = (s: Stage): string =>
  s.isMangekyo
    ? `<circle cx="50" cy="50" r="42.5" fill="none" stroke="#5E0610" stroke-width="6" opacity="0.85"/>
<g class="spin">
<circle cx="50" cy="50" r="31" fill="none"/>
<circle cx="50" cy="50" r="24" fill="none" stroke="#0B0606" stroke-width="4.5"/>
<g stroke="#0B0606" stroke-width="3" stroke-linecap="round">
<line x1="50" y1="26" x2="50" y2="36" transform="rotate(60 50 50)"/>
<line x1="50" y1="26" x2="50" y2="36" transform="rotate(180 50 50)"/>
<line x1="50" y1="26" x2="50" y2="36" transform="rotate(300 50 50)"/>
</g>
<g fill="#D0121F" stroke="#0B0606" stroke-width="3.5">
<circle cx="50" cy="26" r="6.5"/>
<circle cx="50" cy="26" r="6.5" transform="rotate(120 50 50)"/>
<circle cx="50" cy="26" r="6.5" transform="rotate(240 50 50)"/>
</g>
</g>
<circle cx="50" cy="50" r="3.6" fill="#0B0606"/>`
    : `<circle cx="50" cy="50" r="29" fill="none" stroke="#3B0409" stroke-width="1.2"/>
<g class="spin" fill="#0B0606">
<circle cx="50" cy="50" r="31" fill="none"/>
${tomoe(s.tomoe)}
</g>
<circle cx="50" cy="50" r="9.5" fill="#0B0606"/>`

const scene = (i: number, mode: Mode): string => {
  const s = stageAt(i)
  const dark = `--ground: #0D0A0B; --veil: #FF283C; --dust: #EFE6E3;`
  const light = `--ground: #F3EBE6; --veil: #C00D20; --dust: #6A5652;`
  const palette =
    mode === 'oscuro'
      ? `svg { ${dark} }`
      : mode === 'claro'
        ? `svg { ${light} }`
        : `svg { ${light} } @media (prefers-color-scheme: dark) { svg { ${dark} } }`
  const ripples = s.isMangekyo
    ? [0, 3, 6]
        .map(d => `<circle class="ripple" cx="${CX}" cy="${CY}" r="${48 * K}" style="animation-delay: ${d}s"/>`)
        .join('')
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<style>
${palette}
@keyframes sg-spin { to { transform: rotate(360deg) } }
@keyframes sg-ripple { 0% { transform: scale(1); opacity: 0.22 } 100% { transform: scale(2.6); opacity: 0 } }
@keyframes sg-breathe { 0%, 100% { opacity: 0.55 } 50% { opacity: 1 } }
.ground { fill: var(--ground) }
.vignette { stop-color: var(--veil) }
.dust { fill: var(--dust); opacity: 0.18 }
.spin { transform-box: fill-box; transform-origin: center; animation: sg-spin ${s.spin}s linear infinite }
.ripple { fill: none; stroke: var(--veil); stroke-width: 6; opacity: 0; transform-box: fill-box; transform-origin: center; animation: sg-ripple 9s ease-out infinite }
.halo { animation: sg-breathe 7s ease-in-out infinite }
</style>
<defs>
<radialGradient id="sgIris" cx="50%" cy="42%" r="60%">
<stop offset="0%" stop-color="#FF5A5F"/>
<stop offset="55%" stop-color="#D0121F"/>
<stop offset="100%" stop-color="#5E0610"/>
</radialGradient>
<radialGradient id="sgVignette" cx="50%" cy="50%" r="75%">
<stop offset="55%" class="vignette" stop-opacity="0"/>
<stop offset="100%" class="vignette" stop-opacity="${s.vignette}"/>
</radialGradient>
<radialGradient id="sgGlow">
<stop offset="60%" stop-color="#FF283C" stop-opacity="${s.glow}"/>
<stop offset="100%" stop-color="#FF283C" stop-opacity="0"/>
</radialGradient>
</defs>
<rect class="ground" width="100%" height="100%"/>
<rect width="100%" height="100%" fill="url(#sgVignette)"/>
<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<g class="dust">
<circle cx="140" cy="820" r="1.4"/><circle cx="420" cy="900" r="1"/><circle cx="760" cy="860" r="1.2"/>
<circle cx="1080" cy="930" r="0.9"/><circle cx="300" cy="640" r="0.8"/><circle cx="1500" cy="780" r="1.1"/>
</g>
</svg>
<svg width="100%" height="100%" viewBox="0 0 2400 2400" preserveAspectRatio="xMaxYMin meet">
${ripples}
<circle class="halo" cx="${CX}" cy="${CY}" r="${62 * K}" fill="url(#sgGlow)"/>
<g transform="translate(${OX} ${OY}) scale(${K})">
<circle cx="50" cy="50" r="47" fill="url(#sgIris)" stroke="#0B0606" stroke-width="3"/>
${pupil(s)}
<ellipse cx="37" cy="31" rx="9" ry="4.5" fill="#FFFFFF" opacity="0.16" transform="rotate(-32 37 31)"/>
</g>
</svg>
</svg>`
}

// ─── El tema completo de una etapa ───────────────────────────────────

const look = (i: number, mode: Mode): ThemeSetArgs => {
  const s = stageAt(i)

  return {
    colors: themes[Math.max(0, Math.min(LAST, i))]?.theme,
    ...(mode === 'auto' ? {} : { overrideColorScheme: mode === 'claro' ? ('light' as const) : ('dark' as const) }),
    backdrop: { scene: `etapa-${i + 1}-${mode}`, glass: { blur: 18, opacity: 0.76 } },
    style: {
      Heading: { color: 'text-accent' },
      UserMessage: { backgroundColor: 'bg-user-message', color: 'text-user-message', borderColor: 'border', borderWidth: 1, radius: 16, padding: 14 },
      // En Genjutsu, cada respuesta lleva un borde rojo: puede contener ilusiones.
      AssistantMessage: s.isMangekyo
        ? { backgroundColor: 'bg-assistant-message', color: 'text-assistant-message', borderColor: 'border-accent', borderWidth: 1, radius: 16, paddingX: 16, paddingY: 12 }
        : { backgroundColor: 'bg-assistant-message', color: 'text-assistant-message', radius: 16, paddingX: 16, paddingY: 12 },
      ToolUse: { color: 'text-secondary', backgroundColor: 'surface-2', radius: 10, paddingX: 8 },
    },
  }
}

async function applyStage($: EngineInterface, i: number, mode: Mode, percent: number | null): Promise<void> {
  const s = stageAt(i)
  const set = await $.theme.set(look(i, mode)).catch(async (error: unknown) => {
    // Una versión que no acepta `style`: el tema sin estilos de mensaje.
    $.ui.log(String(error))
    const { style: _style, ...plain } = look(i, mode)

    return $.theme.set(plain)
  })
  if (!set.isDrawn && set.reason !== undefined) {
    $.ui.log(`sharingan: ${set.reason}`)
  }
  $.ui.status(`写輪眼 ${s.name}${percent === null ? '' : ` · ${percent} %`}`)
}

const KAI_FOCUS = 'Conserva solo lo verificado; descarta suposiciones que no se confirmaron.'

// Kai encarga el /compact de Claude Code, que queda en cola y corre en cuanto
// la sesión está libre. No se espera su resultado: quien lo pide (un botón, el
// fin de un turno) todavía tiene la sesión ocupada.
function kai($: EngineInterface): void {
  $.command.run({ command: 'compact', args: KAI_FOCUS }).catch((error: unknown) => {
    $.ui.log(`sharingan: Kai no pudo compactar: ${String(error)}`)
    $.ui.toast('Kai no pudo compactar. Usa /compact directamente.')
  })
}

const KAI_TEXT = '解 Kai: rompiendo la ilusión. La conversación se compacta en cuanto Claude queda libre.'

const marks = (s: Stage): string => (s.isMangekyo ? '◈' : '●'.repeat(s.tomoe) + '○'.repeat(3 - s.tomoe))

// ─── Estado ──────────────────────────────────────────────────────────

const eye = atom({ plugin: 'sharingan', key: 'eye' } as const, { stage: 0, percent: null } as Eye)
const isBandHidden = atom({ plugin: 'sharingan', key: 'isBandHidden' } as const, false)
const isKaiPending = atom({ plugin: 'sharingan', key: 'isKaiPending' } as const, false)

export const register: Register = (on, options) => {
  const mode = modeOf(options.modo)

  on('session.start', async ($, e, next) => {
    const unpainted = themes.flatMap(t => t.problems).find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.log(unpainted)
    }

    await $.command.register({ name: 'sharingan', description: 'Muestra la etapa del Sharingan según el uso de contexto' })
    await $.command.register({ name: 'kai', description: 'Kai: compacta la conversación y rompe el genjutsu' })

    const { context } = await $.session.usage()
    const percent = context.percent ?? null
    const stage = stageOf(percent)
    await update($, eye, () => ({ stage, percent }))
    await applyStage($, stage, mode, percent)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      const percent = e.context.percent ?? null
      const stage = stageOf(percent)
      const before = await read($, eye)
      await update($, eye, () => ({ stage, percent }))

      if (before.stage !== stage) {
        await applyStage($, stage, mode, percent)
        const s = stageAt(stage)
        if (stage < before.stage) {
          $.ui.toast(`解 Kai: la ilusión se rompe. ${s.name}`)
        } else if (s.isMangekyo) {
          $.ui.toast('Mangekyō · Genjutsu: las respuestas pueden mezclar realidad e ilusión. /kai para compactar.')
        } else {
          $.ui.toast(`El Sharingan despierta: ${s.name}`)
        }
      } else {
        $.ui.status(`写輪眼 ${stageAt(stage).name}${percent === null ? '' : ` · ${percent} %`}`)
      }
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== 'sharingan' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const match = /^etapa-(\d)/.exec(e.props.scene)
    const i = match === null ? (await read($, eye)).stage : Number(match[1]) - 1
    const s = stageAt(i)

    return <Svg source={scene(i, mode)} alt={`Sharingan, ${s.name}: un ojo rojo que gira en la esquina`} isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isBandHidden))) {
      return next(e)
    }
    const { stage, percent } = await read($, eye)
    const s = stageAt(stage)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" gap={1}>
        <Text color={s.isMangekyo ? '#E8384A' : '#D8505C'}>
          写輪眼 {s.name}
        </Text>
        <Text dimColor>
          · contexto {percent === null ? '—' : `${percent} %`} · {marks(s)}
        </Text>
        {s.isMangekyo && (
          <Button
            key="kai"
            label="解 Kai"
            onPress={() => {
              kai($)
              $.ui.toast(KAI_TEXT)
            }}
          />
        )}
        <Button key="ocultar" label="Ocultar" onPress={() => update($, isBandHidden, () => true)} />
      </Box>
    )
  })

  on('command.run', { command: 'sharingan' }, async $ => {
    const { context } = await $.session.usage()
    const percent = context.percent ?? null
    const stage = stageOf(percent)
    await update($, eye, () => ({ stage, percent }))
    await update($, isBandHidden, () => false)
    const s = stageAt(stage)
    const ladder = STAGES.map((x, k) => `${k === stage ? '▶' : ' '} ${x.range.padEnd(9)} ${x.name}`).join('\n')

    return {
      text: [
        `写輪眼 ${s.kanji} · ${s.name}  ${marks(s)}`,
        `Contexto usado: ${percent === null ? 'sin medir aún' : `${percent} %`}`,
        s.tip,
        '',
        ladder,
      ].join('\n'),
    }
  })

  // Un comando no puede encargar otro comando mientras ocupa la sesión: /kai
  // deja Kai pendiente y lo encarga al terminar su propio turno.
  on('command.run', { command: 'kai' }, async $ => {
    await update($, isKaiPending, () => true)

    return { text: KAI_TEXT }
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (await read($, isKaiPending)) {
      await update($, isKaiPending, () => false)
      kai($)
    }

    return result
  })
}
