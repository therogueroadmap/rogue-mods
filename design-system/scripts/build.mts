// Builds the generated parts of the design system from tokens/tokens.json and
// the rogue-road mod's scene, so there is one source for each:
//
//   tokens/tokens.css                      CSS custom properties, light, dark and day phases
//   showcase/scene.js                      the mod's scene, types stripped, for the showcase
//   assets/rogue-explorer.svg              the explorer alone, both poses
//   assets/scene-<phase>.svg               one still of the road per phase
//   claude-desktop/rogue-roadmap-design/   the skill's copy of tokens.css and components.css
//
// Run from the repository root with Node 22.13 or newer:
//   node --experimental-strip-types design-system/scripts/build.mts
// With --check it writes nothing and fails when a generated file is out of date.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'

import { BRAND, ROGUE_STYLE, rogueGlyph, scene } from '../../rogue-road/hooks/scene.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const isCheck = process.argv.includes('--check')
let stale = 0

const emit = (rel: string, text: string): void => {
  const path = join(root, rel)
  if (isCheck) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) {
      console.log(`out of date: design-system/${rel}`)
      stale++
    }
    return
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  console.log(`wrote design-system/${rel}`)
}

// ─── Tokens → CSS ────────────────────────────────────────────────────

type Node = { [key: string]: Node | unknown }
const tokens = JSON.parse(readFileSync(join(root, 'tokens/tokens.json'), 'utf8')) as Node

const get = (path: string): unknown => path.split('.').reduce<unknown>((n, k) => (n as Node | undefined)?.[k], tokens)

const resolve = (value: unknown): string => {
  if (typeof value === 'string') {
    const ref = /^\{(.+)\}$/.exec(value)
    if (ref !== null) {
      return resolve((get(ref[1] as string) as Node)['$value'])
    }
    return value
  }
  if (Array.isArray(value)) {
    return typeof value[0] === 'number'
      ? `cubic-bezier(${value.join(', ')})`
      : value.map(v => (/\s/.test(String(v)) ? `"${v}"` : String(v))).join(', ')
  }
  return String(value)
}

const flat = (node: Node, prefix: string, out: [string, string][] = []): [string, string][] => {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) {
      continue
    }
    const name = `${prefix}-${key}`
    const c = child as Node
    if (c !== null && typeof c === 'object' && '$value' in c) {
      out.push([name, resolve(c['$value'])])
    } else if (c !== null && typeof c === 'object') {
      flat(c, name, out)
    }
  }
  return out
}

const block = (sel: string, pairs: [string, string][], extra = ''): string =>
  `${sel} {\n${pairs.map(([k, v]) => `  ${k}: ${v};`).join('\n')}${extra}\n}`

const primitives = [
  ...flat(get('color') as Node, '--rr-color'),
  ...flat(get('font') as Node, '--rr-font'),
  ...flat(get('space') as Node, '--rr-space'),
  ...flat(get('radius') as Node, '--rr-radius'),
  ...flat(get('shadow') as Node, '--rr-shadow'),
  ...flat(get('motion') as Node, '--rr-motion'),
]
const light = flat(get('theme.light') as Node, '--rr')
const dark = flat(get('theme.dark') as Node, '--rr')
const phases = Object.entries(get('day') as Node).filter(([k]) => !k.startsWith('$'))

const phaseCss = phases
  .map(([name, p]) => {
    const n = p as Node
    const sky = n['sky'] as Node

    return block(`[data-rr-phase="${name}"]`, [
      ['--rr-phase-accent', resolve((n['accent'] as Node)['$value'])],
      ['--rr-sky-top', resolve((sky['top'] as Node)['$value'])],
      ['--rr-sky-mid', resolve((sky['mid'] as Node)['$value'])],
      ['--rr-sky-horizon', resolve((sky['horizon'] as Node)['$value'])],
    ])
  })
  .join('\n\n')

const css = `/* The Rogue Roadmap design system: tokens.
   Generated from tokens.json by scripts/build.mts. Do not edit by hand.

   Light values on :root; dark under prefers-color-scheme (unless
   data-theme="light") and under data-theme="dark", so an explicit choice
   wins both ways. A day phase is chosen with data-rr-phase on any element. */

${block(':root', [...primitives, ...light, ['--rr-phase-accent', 'var(--rr-accent)']], '\n  color-scheme: light;')}

@media (prefers-color-scheme: dark) {
${block(':root:not([data-theme="light"])', dark, '\n  color-scheme: dark;').replace(/^/gm, '  ')}
}

${block(':root[data-theme="dark"]', dark, '\n  color-scheme: dark;')}

${phaseCss}
`
emit('tokens/tokens.css', css)

// ─── Contrast report ─────────────────────────────────────────────────

const lum = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1, 7), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0)
}
const ratio = (a: string, b: string): number => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}
if (process.argv.includes('--contrast')) {
  for (const [mode, pairs] of [['light', light], ['dark', dark]] as const) {
    const t = Object.fromEntries(pairs.map(([k, v]) => [k.replace('--rr-', ''), v]))
    for (const fg of ['text-primary', 'text-secondary', 'text-muted', 'accent-text']) {
      for (const bg of ['bg-page', 'bg-surface', 'bg-raised']) {
        console.log(`${mode}\t${fg} on ${bg}\t${ratio(t[fg] ?? '', t[bg] ?? '').toFixed(2)}`)
      }
    }
    console.log(`${mode}\ton-accent on accent\t${ratio(t['on-accent'] ?? '', t['accent'] ?? '').toFixed(2)}`)
  }
}

// ─── Scene and explorer ──────────────────────────────────────────────

const sceneSource = readFileSync(join(root, '../rogue-road/hooks/scene.ts'), 'utf8')
emit(
  'showcase/scene.js',
  `// Generated from rogue-road/hooks/scene.ts by design-system/scripts/build.mts.\n${stripTypeScriptTypes(sceneSource)}`,
)

const explorer = (pace: 'explora' | 'espera', x: number): string =>
  `<g class="${pace}" transform="translate(${x} 150) scale(1.1)">${rogueGlyph}</g>`
emit(
  'assets/rogue-explorer.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 176" width="520" height="352">
<style>
svg { --figure: ${BRAND.navy}; --staff: ${BRAND.navy}; --boot: #5A3A26; --bubble: ${BRAND.cream} }
${ROGUE_STYLE}
.explora .stride-a { transform: rotate(18deg) } .explora .stride-b { transform: rotate(-18deg) }
.espera .lamp-glow { opacity: 0.4 }
</style>
<!-- left: walking while Claude works, right: waiting for the person -->
${explorer('explora', 70)}
${explorer('espera', 190)}
</svg>
`,
)

const stills: [string, number, 'explora' | 'espera'][] = [
  ['alba', 4, 'explora'],
  ['manana', 25, 'explora'],
  ['mediodia', 45, 'explora'],
  ['tarde', 65, 'explora'],
  ['atardecer', 82, 'espera'],
  ['anochecer', 96, 'espera'],
]
for (const [name, percent, pace] of stills) {
  emit(`assets/scene-${name}.svg`, `${scene({ percent, pace, mode: 'claro' })}\n`)
}

// ─── The skill's copies ──────────────────────────────────────────────

const skill = 'claude-desktop/rogue-roadmap-design'
emit(`${skill}/tokens.css`, css)
emit(`${skill}/components.css`, readFileSync(join(root, 'components/components.css'), 'utf8'))

if (stale > 0) {
  process.exit(1)
}
