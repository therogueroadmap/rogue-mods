import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Chakra } from '../types'
import { makeColors } from './make-colors.js'

// ─── Las cinco etapas ────────────────────────────────────────────────
// Cada 20 % de contexto usado, el jutsu pierde una capa.

type Stage = {
  name: string
  kanji: string
  power: number
  tip: string
  /** Color de chakra de la etapa, también el acento del tema. */
  c1: `#${string}`
  c2: string
  c3: string
  /** Relleno de las aspas (con alfa). */
  blade: string
  bladeScale: number
  bladeOpacity: number
  discOpacity: number
  core: number
  ringOpacity: number
  ringDash: string
  halo: number
  spin: number
  ringSpin: number
  coreSpin: number
  isFlickering: boolean
}

const STAGES: Stage[] = [
  {
    name: 'Fūton: Rasenshuriken', kanji: '風遁・螺旋手裏剣', power: 100,
    tip: 'Ventana fresca: máxima precisión y memoria nítida de toda la conversación.',
    c1: '#7FE3FF', c2: '#2FA8F5', c3: '#0B4FA8', blade: '#D6F6FF6B',
    bladeScale: 1, bladeOpacity: 1, discOpacity: 0.7, core: 22,
    ringOpacity: 1, ringDash: '18 10', halo: 98, spin: 1.4, ringSpin: 0.9, coreSpin: 0.6, isFlickering: false,
  },
  {
    name: 'Rasenshuriken inestable', kanji: '不安定な螺旋手裏剣', power: 78,
    tip: 'Las aspas de viento se fragmentan: los detalles tempranos empiezan a perder nitidez.',
    c1: '#86D9F5', c2: '#3A9BD8', c3: '#164E8E', blade: '#D6F6FF33',
    bladeScale: 0.72, bladeOpacity: 0.5, discOpacity: 0.35, core: 22,
    ringOpacity: 0.85, ringDash: '14 12', halo: 80, spin: 2.4, ringSpin: 1.4, coreSpin: 0.9, isFlickering: false,
  },
  {
    name: 'Ōdama Rasengan', kanji: '大玉螺旋丸', power: 55,
    tip: 'Se perdió la naturaleza de viento: queda una gran esfera de chakra, potente pero menos precisa.',
    c1: '#8ACFEA', c2: '#4A8FC4', c3: '#1F4A7A', blade: '#00000000',
    bladeScale: 0.4, bladeOpacity: 0, discOpacity: 0, core: 46,
    ringOpacity: 0.7, ringDash: '22 12', halo: 86, spin: 3, ringSpin: 2, coreSpin: 1.2, isFlickering: false,
  },
  {
    name: 'Rasengan', kanji: '螺旋丸', power: 32,
    tip: 'La esfera se encoge. Conviene resumir (/compact) antes de que el chakra se agote.',
    c1: '#9CC3D6', c2: '#5D88A8', c3: '#2C4560', blade: '#00000000',
    bladeScale: 0.4, bladeOpacity: 0, discOpacity: 0, core: 32,
    ringOpacity: 0.45, ringDash: '10 14', halo: 62, spin: 4.5, ringSpin: 3, coreSpin: 2, isFlickering: false,
  },
  {
    name: 'Rasengan incompleto', kanji: '未完成の螺旋丸', power: 12,
    tip: 'Chakra al límite: la esfera titila. Compacta o abre una conversación nueva para recuperar el Rasenshuriken.',
    c1: '#A6B8C4', c2: '#6F8597', c3: '#38475A', blade: '#00000000',
    bladeScale: 0.4, bladeOpacity: 0, discOpacity: 0, core: 17,
    ringOpacity: 0.25, ringDash: '5 15', halo: 40, spin: 7, ringSpin: 5, coreSpin: 3.5, isFlickering: true,
  },
]

// Modo claro: el mismo jutsu bajo un cielo de día. Los azules son más
// profundos para que la esfera se lea sobre un fondo pálido.
type Palette = { c1: `#${string}`; c2: string; c3: string; blade: string; band: string }

const LIGHT: Palette[] = [
  { c1: '#0E9AD6', c2: '#0B6FB8', c3: '#08408A', blade: '#0E9AD638', band: '#1FA3DB' },
  { c1: '#2496CF', c2: '#1C6FAE', c3: '#174A80', blade: '#2496CF1F', band: '#3A9CCB' },
  { c1: '#3A8FBE', c2: '#2B6E9E', c3: '#1F4A73', blade: '#00000000', band: '#4A93B8' },
  { c1: '#5D8BA6', c2: '#476F8A', c3: '#33506A', blade: '#00000000', band: '#6A8FA5' },
  { c1: '#7F909C', c2: '#66757F', c3: '#4C5761', blade: '#00000000', band: '#7E8E99' },
]

type Mode = 'auto' | 'claro' | 'oscuro'

const modeOf = (value: unknown): Mode => (value === 'claro' || value === 'oscuro' ? value : 'auto')

const lightAt = (i: number): Palette => {
  const p = LIGHT[Math.max(0, Math.min(4, i))]
  if (p === undefined) {
    throw new Error('etapa fuera de rango')
  }

  return p
}

const stageAt = (i: number): Stage => {
  const s = STAGES[Math.max(0, Math.min(4, i))]
  if (s === undefined) {
    throw new Error('etapa fuera de rango')
  }

  return s
}

const stageOf = (percent: number | null): number =>
  percent === null ? 0 : Math.max(0, Math.min(4, Math.floor(percent / 20)))

// ─── Colores: noche profunda y cielo de día, acento según la etapa ──

const DARK_ANCHORS = {
  'surface-0': '#060A13',
  'surface-1': '#0A101C',
  'surface-2': '#0F1828',
  'surface-3': '#121D30',
  'text-primary': '#E6F1FF',
  'text-secondary': '#B4C5DC',
  'text-muted': '#93A7C2',
}

const LIGHT_ANCHORS = {
  'surface-0': '#E8F0F8',
  'surface-1': '#EFF5FA',
  'surface-2': '#F7FAFD',
  'surface-3': '#F7FAFD',
  'text-primary': '#0B1A2E',
  'text-secondary': '#33465F',
  'text-muted': '#4E627C',
}

const ROLES = { danger: '#E5646E', success: '#5FD3A0', warning: '#F2B45A', pro: '#B59CFF' }
const LIGHT_ROLES = { danger: '#C23B47', success: '#1F8A5B', warning: '#A86A0C', pro: '#6B4FC4' }

const themes = STAGES.map((s, i) => {
  const made = makeColors({
    label: `Rasenshuriken · ${s.name}`,
    roles: { accent: s.c1, ...ROLES },
    light: { roles: { accent: lightAt(i).c1, ...LIGHT_ROLES }, gray: { anchors: LIGHT_ANCHORS } },
    dark: { gray: { anchors: DARK_ANCHORS } },
  })
  // Colores de los mensajes, distintos en cada modo.
  const inputs = made.theme.inputs as Record<string, Record<string, string> | undefined>
  inputs.light = {
    ...inputs.light,
    'bg-user-message': '#D9E6F3',
    'text-user-message': '#0B1A2E',
    'bg-assistant-message': '#F7FAFD',
    'text-assistant-message': '#0B1A2E',
  }
  inputs.dark = {
    ...inputs.dark,
    'bg-user-message': '#132036',
    'text-user-message': '#E6F1FF',
    'bg-assistant-message': '#0A101C',
    'text-assistant-message': '#E6F1FF',
  }

  return made
})

// ─── La escena: cielo nocturno y el jutsu en la esquina superior derecha ──

const BLADE = 'M8,-14 C34,-44 74,-46 94,-14 C72,-28 44,-24 16,6 Z'
const STREAK = 'M22,-12 C46,-32 70,-32 86,-18'
const K = 3.4 // unidades del emblema (200) → escena (2400)
const CX = 1860
const CY = 520

const STARS = [
  [120, 90, 1.2], [340, 210, 0.9], [620, 70, 1.4], [880, 300, 0.8], [1040, 140, 1.1],
  [1300, 60, 0.9], [210, 420, 1], [760, 520, 0.7], [1180, 460, 1.2], [1500, 360, 0.8],
  [90, 700, 0.9], [460, 820, 1.1], [980, 760, 0.8], [1380, 880, 1], [1560, 640, 0.7],
]

const arc = (r: number, a0: number, a1: number): string => {
  const pt = (a: number) => [CX + r * Math.cos((a * Math.PI) / 180), CY + r * Math.sin((a * Math.PI) / 180)]
  const [x0 = 0, y0 = 0] = pt(a0)
  const [x1 = 0, y1 = 0] = pt(a1)

  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`
}

const vars = (p: { c1: string; c2: string; c3: string; blade: string }, sky: string, star: string, halo: number): string =>
  `--c1: ${p.c1}; --c2: ${p.c2}; --c3: ${p.c3}; --blade: ${p.blade}; --sky: ${sky}; --star: ${star}; --halo: ${halo};`

const scene = (i: number, mode: Mode): string => {
  const s = stageAt(i)
  const dark = vars(s, '#060A13', '#CFE6FF', 0.42)
  const light = vars(lightAt(i), '#E8F0F8', '#9DB7D1', 0.24)
  const palette =
    mode === 'oscuro'
      ? `svg { ${dark} }`
      : mode === 'claro'
        ? `svg { ${light} }`
        : `svg { ${light} } @media (prefers-color-scheme: dark) { svg { ${dark} } }`
  const core = s.core * K
  const blades = [0, 90, 180, 270]
    .map(r => `<path transform="rotate(${r})" d="${BLADE}"/><path transform="rotate(${r})" d="${STREAK}" fill="none" stroke-opacity="0.8"/>`)
    .join('')
  const stars = STARS.map(([x = 0, y = 0, r = 1]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')
  const flicker = s.isFlickering ? ' class="flicker"' : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<style>
${palette}
@keyframes rs-spin { to { transform: rotate(360deg) } }
@keyframes rs-rev { to { transform: rotate(-360deg) } }
@keyframes rs-flicker { 0%, 100% { opacity: 0.9 } 50% { opacity: 0.45 } }
@keyframes rs-drift { 0%, 100% { opacity: 0.35 } 50% { opacity: 0.7 } }
.spin { transform-box: view-box; transform-origin: ${CX}px ${CY}px; animation: rs-spin ${s.spin}s linear infinite }
.ring { transform-box: view-box; transform-origin: ${CX}px ${CY}px; animation: rs-rev ${s.ringSpin}s linear infinite }
.core { transform-box: view-box; transform-origin: ${CX}px ${CY}px; animation: rs-spin ${s.coreSpin}s linear infinite }
.flicker { animation: rs-flicker 2.4s ease-in-out infinite }
.stars { fill: var(--star); opacity: 0.5; animation: rs-drift 9s ease-in-out infinite }
.sky { fill: var(--sky) }
.wind { fill: none; stroke: var(--c1); stroke-opacity: 0.08 }
.disc { fill: var(--c1); stroke: var(--c1) }
.blades { fill: var(--blade); stroke: var(--c1) }
.rings { fill: none; stroke: var(--c1) }
.k1 { stop-color: var(--c1) }
.k2 { stop-color: var(--c2) }
.k3 { stop-color: var(--c3) }
.g0 { stop-color: var(--c1); stop-opacity: var(--halo) }
.g1 { stop-color: var(--c1); stop-opacity: 0 }
</style>
<defs>
<radialGradient id="rsCore" cx="50%" cy="44%" r="56%">
<stop offset="0%" stop-color="#FFFFFF"/>
<stop offset="38%" class="k1"/>
<stop offset="78%" class="k2"/>
<stop offset="100%" class="k3"/>
</radialGradient>
<radialGradient id="rsGlow">
<stop offset="0%" class="g0"/>
<stop offset="100%" class="g1"/>
</radialGradient>
</defs>
<rect class="sky" width="100%" height="100%"/>
<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<g class="stars">${stars}</g>
<g class="wind" stroke-width="1.2">
<path d="M-40 860 C320 760 620 900 980 800 S1500 700 1660 760"/>
<path d="M-40 940 C360 860 700 980 1060 890 S1520 820 1660 860"/>
</g>
</svg>
<svg width="100%" height="100%" viewBox="0 0 2400 2400" preserveAspectRatio="xMaxYMin meet">
<g${flicker}>
<circle cx="${CX}" cy="${CY}" r="${s.halo * K}" fill="url(#rsGlow)"/>
<g class="spin">
<circle class="disc" cx="${CX}" cy="${CY}" r="${88 * K}" fill-opacity="${(s.discOpacity * 0.14).toFixed(3)}" stroke-opacity="${s.discOpacity}" stroke-width="2.5" stroke-dasharray="6 14"/>
<g class="blades" transform="translate(${CX} ${CY}) scale(${(K * s.bladeScale).toFixed(3)})" opacity="${s.bladeOpacity}" stroke-width="0.9">${blades}</g>
</g>
<g class="ring rings">
<circle cx="${CX}" cy="${CY}" r="${core + 9 * K}" stroke-width="5" stroke-dasharray="${s.ringDash.split(' ').map(n => Number(n) * K).join(' ')}" opacity="${s.ringOpacity}"/>
<circle cx="${CX}" cy="${CY}" r="${core + 18 * K}" stroke-width="3" stroke-dasharray="${3 * K} ${9 * K}" opacity="${(s.ringOpacity * 0.6).toFixed(2)}"/>
</g>
<circle cx="${CX}" cy="${CY}" r="${core}" fill="url(#rsCore)"/>
<g class="core" fill="none" stroke="#FFFFFF" stroke-linecap="round" opacity="0.85">
<path d="${arc(core * 0.62, -20, 130)}" stroke-width="5"/>
<path d="${arc(core * 0.34, 160, 300)}" stroke-width="4"/>
</g>
</g>
</svg>
</svg>`
}

// ─── El tema completo de una etapa ───────────────────────────────────

const look = (i: number, mode: Mode): ThemeSetArgs => ({
  colors: themes[Math.max(0, Math.min(4, i))]?.theme,
  ...(mode === 'auto' ? {} : { overrideColorScheme: mode === 'claro' ? ('light' as const) : ('dark' as const) }),
  backdrop: { scene: `etapa-${i + 1}-${mode}`, glass: { blur: 18, opacity: 0.74 } },
  style: {
    Heading: { color: 'text-accent' },
    UserMessage: { backgroundColor: 'bg-user-message', color: 'text-user-message', borderColor: 'border', borderWidth: 1, radius: [16, 16, 4, 16], padding: 14 },
    AssistantMessage: { backgroundColor: 'bg-assistant-message', color: 'text-assistant-message', radius: 14, paddingX: 16, paddingY: 12 },
    ToolUse: { color: 'text-secondary', backgroundColor: 'surface-2', radius: 8, paddingX: 8 },
  },
})

async function applyStage($: EngineInterface, i: number, mode: Mode): Promise<void> {
  const s = stageAt(i)
  const set = await $.theme.set(look(i, mode)).catch(async (error: unknown) => {
    // Una versión que no acepta `style`: el tema sin estilos de mensaje.
    $.ui.log(String(error))
    const { style: _style, ...plain } = look(i, mode)

    return $.theme.set(plain)
  })
  if (!set.isDrawn && set.reason !== undefined) {
    $.ui.log(`rasenshuriken: ${set.reason}`)
  }
  $.ui.status(`螺旋 ${s.name} · poder ${s.power} %`)
}

const meter = (power: number): string => {
  const full = Math.round(power / 20)

  return '▰'.repeat(full) + '▱'.repeat(5 - full)
}

// ─── Estado ──────────────────────────────────────────────────────────

const chakra = atom({ plugin: 'rasenshuriken', key: 'chakra' } as const, { stage: 0, percent: null } as Chakra)
const isBandHidden = atom({ plugin: 'rasenshuriken', key: 'isBandHidden' } as const, false)

export const register: Register = (on, options) => {
  const mode = modeOf(options.modo)

  on('session.start', async ($, e, next) => {
    const unpainted = themes.flatMap(t => t.problems).find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.log(unpainted)
    }

    await $.command.register({
      name: 'chakra',
      description: 'Muestra la etapa del Rasenshuriken según el uso de contexto',
    })

    const { context } = await $.session.usage()
    const percent = context.percent ?? null
    const stage = stageOf(percent)
    await update($, chakra, () => ({ stage, percent }))
    await applyStage($, stage, mode)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      const percent = e.context.percent ?? null
      const stage = stageOf(percent)
      const before = await read($, chakra)
      await update($, chakra, () => ({ stage, percent }))

      if (before.stage !== stage) {
        await applyStage($, stage, mode)
        const s = stageAt(stage)
        $.ui.toast(
          stage > before.stage
            ? `El chakra se degrada: ${s.name} (${s.kanji})`
            : `¡Chakra restaurado! ${s.name} (${s.kanji})`,
        )
      }
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== 'rasenshuriken' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const match = /^etapa-(\d)/.exec(e.props.scene)
    const i = match === null ? (await read($, chakra)).stage : Number(match[1]) - 1
    const s = stageAt(i)

    return <Svg source={scene(i, mode)} alt={`${s.name}: una esfera de chakra azul que gira en la esquina del cielo`} isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isBandHidden))) {
      return next(e)
    }
    const { stage, percent } = await read($, chakra)
    const s = stageAt(stage)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" gap={1}>
        <Text color={lightAt(stage).band}>
          螺旋 {s.name}
        </Text>
        <Text dimColor>
          · contexto {percent === null ? '—' : `${percent} %`} · poder {meter(s.power)} {s.power} %
        </Text>
        <Button key="ocultar" label="Ocultar" onPress={() => update($, isBandHidden, () => true)} />
      </Box>
    )
  })

  on('command.run', { command: 'chakra' }, async $ => {
    const { context } = await $.session.usage()
    const percent = context.percent ?? null
    const stage = stageOf(percent)
    await update($, chakra, () => ({ stage, percent }))
    await update($, isBandHidden, () => false)
    const s = stageAt(stage)
    const ladder = STAGES.map((x, k) => `${k === stage ? '▶' : ' '} ${k * 20}–${k * 20 + 20} %  ${x.name}`).join('\n')

    return {
      text: [
        `${s.kanji} · ${s.name}`,
        `Contexto usado: ${percent === null ? 'sin medir aún' : `${percent} %`} · Poder del jutsu: ${meter(s.power)} ${s.power} %`,
        s.tip,
        '',
        ladder,
      ].join('\n'),
    }
  })
}
