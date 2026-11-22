// Generated from rogue-road/hooks/scene.ts by design-system/scripts/build.mts.
// La escena de rogue-road: un camino que cruza el paisaje de izquierda a
// derecha, un sol que sale al amanecer y se pone al atardecer, y un explorador
// encapuchado cuya posición sobre el camino es el porcentaje de contexto usado.
// Funciones puras: no tocan `$`, así que también sirven para generar las
// muestras del sistema de diseño.

                              
                                              
                                       

/** Paleta del brand de The Rogue Roadmap. */
export const BRAND = { navy: '#0A1B35', orange: '#F7792C', cream: '#FCF3E1' }         

// ─── Cielo: fotogramas del día según el contexto usado ───────────────

                                                                                    
                                     

export const SKY            = [
  { at: 0, top: '#2B2F5C', mid: '#8C6A9E', horizon: '#F6B38E', far: '#5A4F72', near: '#2E3A57' },
  { at: 15, top: '#4D6FA3', mid: '#C9A6B8', horizon: '#FAD3A8', far: '#727A9C', near: '#3B4D66' },
  { at: 35, top: '#6FA6D6', mid: '#B9D8EC', horizon: '#FCF3E1', far: '#8EA6BD', near: '#4A6670' },
  { at: 55, top: '#5C9FD8', mid: '#A8D3F0', horizon: '#FCEFD6', far: '#87A0B3', near: '#486A66' },
  { at: 75, top: '#5B7FB0', mid: '#E8B98A', horizon: '#F7A15A', far: '#7E6E80', near: '#3F4A5C' },
  { at: 90, top: '#2C3566', mid: '#C2607A', horizon: '#F7792C', far: '#4A3A5E', near: '#1E2A45' },
  { at: 100, top: '#0A1B35', mid: '#2C2F5E', horizon: '#8A3F5A', far: '#1E2342', near: '#0E1A30' },
]

const toRgb = (hex        )                           => {
  const n = Number.parseInt(hex.slice(1, 7), 16)

  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (rgb                          )      =>
  `#${rgb.map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`

/** Mezcla `a` hacia `b` en la proporción `t` (0 = a, 1 = b). */
export const mix = (a        , b        , t        )      => {
  const x = toRgb(a)
  const y = toRgb(b)

  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

const clamp = (v        , lo        , hi        )         => Math.max(lo, Math.min(hi, v))

/** El cielo de modo claro para un porcentaje de contexto. */
export const skyAt = (percent        )      => {
  const p = clamp(percent, 0, 100)
  let k = 0
  while (k < SKY.length - 2 && (SKY[k + 1]?.at ?? 100) <= p) {
    k++
  }
  const a = SKY[k] ?? SKY[0] 
  const b = SKY[k + 1] ?? a
  const t = b.at === a.at ? 0 : (p - a.at) / (b.at - a.at)

  return {
    top: mix(a.top, b.top, t),
    mid: mix(a.mid, b.mid, t),
    horizon: mix(a.horizon, b.horizon, t),
    far: mix(a.far, b.far, t),
    near: mix(a.near, b.near, t),
  }
}

/** El mismo cielo visto de noche: hundido en el navy del brand, no invertido. */
export const nightOf = (s     )      => ({
  top: mix(s.top, BRAND.navy, 0.55),
  mid: mix(s.mid, BRAND.navy, 0.5),
  horizon: mix(s.horizon, BRAND.navy, 0.38),
  far: mix(s.far, BRAND.navy, 0.55),
  near: mix(s.near, '#071428', 0.6),
})

// ─── Geometría: el camino, las colinas y el sol ──────────────────────
// Banda de 1600 × 520; el horizonte está en y = 330.

const W = 1600
const HORIZON = 330

const hillTop = (u        )         => 395 - 75 * u + 14 * Math.sin(2.4 * Math.PI * u + 0.6)
const roadY = (u        )         => hillTop(u) + 40 + 12 * Math.sin(3 * Math.PI * u)
const roadX = (u        )         => 60 + 1480 * u

const N = 64
const ROAD                     = Array.from({ length: N }, (_, i) => {
  const u = i / (N - 1)

  return [roadX(u), roadY(u)]
})

const LENGTHS = ROAD.reduce          ((acc, p, i) => {
  const q = ROAD[i - 1]
  acc.push(q === undefined ? 0 : (acc[i - 1] ?? 0) + Math.hypot(p[0] - q[0], p[1] - q[1]))

  return acc
}, [])
const TOTAL = LENGTHS[LENGTHS.length - 1] ?? 1

/** Punto del camino a una fracción `f` (0 a 1) de su largo. */
export const roadPoint = (f        )                   => {
  const target = clamp(f, 0, 1) * TOTAL
  let i = 1
  while (i < N - 1 && (LENGTHS[i] ?? 0) < target) {
    i++
  }
  const a = ROAD[i - 1] 
  const b = ROAD[i] 
  const la = LENGTHS[i - 1] ?? 0
  const lb = LENGTHS[i] ?? la
  const t = lb === la ? 0 : (target - la) / (lb - la)

  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

const r1 = (n        )         => (Math.round(n * 10) / 10).toString()
const ROAD_D = `M${ROAD.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')}`

const ridge = (from        , to        , step        , y                       , base        )         => {
  const pts           = []
  for (let x = from; x <= to; x += step) {
    pts.push(`${r1(x)} ${r1(y(x))}`)
  }

  return `M${from} ${base} L${pts.join(' L')} L${to} ${base} Z`
}

// Montañas lejanas: picos suaves sobre el horizonte, extendidas a los lados
// para pantallas anchas.
const FAR_D = ridge(-1600, 3200, 40, x => HORIZON + 10 - 70 * Math.abs(Math.sin(x / 260)) - 30 * Math.abs(Math.sin(x / 97 + 1.3)), 1200)
const MID_D = ridge(-1600, 3200, 40, x => HORIZON + 34 - 34 * Math.abs(Math.sin(x / 180 + 0.7)) - 12 * Math.sin(x / 61), 1200)
const NEAR_D = ridge(-1600, 3200, 20, x => hillTop(clamp((x - 60) / 1480, -0.2, 1.2)), 1600)

/** Posición del sol: sale por la izquierda, culmina al mediodía y se pone por la derecha pasado el 90 %. */
export const sunAt = (percent        )                           => {
  const t = clamp(percent / 90, 0, 1.15)
  const arc = Math.sin(Math.min(t, 1) * Math.PI) * 240

  return { x: 140 + 1320 * Math.min(t, 1.05), y: HORIZON - arc + (t > 1 ? (t - 1) * 600 : 0) }
}

// ─── El explorador ───────────────────────────────────────────────────
// Silueta propia: capucha en pico, capa, bufanda naranja, bastón y farol.
// Coordenadas locales con los pies en (0, 0); mira a la derecha.

const ROGUE = `<g class="rogue-body">
<path class="cape" d="M-9 -44 C-18 -34 -25 -20 -29 -7 L-12 -9 Z"/>
<path class="ink" d="M-1 -66 C-11 -61 -14 -51 -12 -42 L12 -42 C12 -53 7 -61 -1 -66 Z"/>
<ellipse class="face" cx="4.5" cy="-49" rx="4.2" ry="5.2"/>
<path class="ink" d="M-12 -43 C-15 -30 -16 -18 -14 -8 L13 -9 C13 -20 13 -32 12 -43 Z"/>
<path class="scarf" d="M-11 -44 L12 -44 L12 -39 L-11 -39 Z"/>
<path class="scarf scarf-tail" d="M-10 -43 L-21 -38 L-19 -34 L-9 -39 Z"/>
<g class="staff"><line class="pole" x1="16" y1="-58" x2="18" y2="1"/><circle class="ink" cx="16" cy="-59" r="2.4"/>
<g class="lantern"><line class="pole thin" x1="16" y1="-57" x2="16" y2="-49"/><rect class="lamp" x="12.6" y="-49" width="6.8" height="8" rx="2"/><circle class="lamp-glow" cx="16" cy="-45" r="14"/></g></g>
</g>
<g class="legs"><path class="leg leg-a" d="M-4 -10 L-6 0"/><path class="leg leg-b" d="M5 -10 L7 0"/></g>
<g class="dust"><circle cx="-12" cy="-1" r="2.2"/><circle cx="-20" cy="-3" r="1.6"/><circle cx="-27" cy="-1" r="1.2"/></g>
<g class="bubble" transform="translate(-2 -84)"><path class="bubble-box" d="M-18 -11 H18 A7 7 0 0 1 25 -4 V4 A7 7 0 0 1 18 11 H4 L-1 17 L-4 11 H-18 A7 7 0 0 1 -25 4 V-4 A7 7 0 0 1 -18 -11 Z"/>
<circle class="dot d1" cx="-9" cy="0" r="2.6"/><circle class="dot d2" cx="0" cy="0" r="2.6"/><circle class="dot d3" cx="9" cy="0" r="2.6"/></g>`

/** El explorador solo, para usarlo como avatar fuera de la escena. */
export const rogueGlyph = ROGUE

// ─── La escena completa ──────────────────────────────────────────────

const vars = (s     , figure     , face     , ground     , road     , trail     , bubble     )         =>
  `--top: ${s.top}; --mid: ${s.mid}; --horizon: ${s.horizon}; --far: ${s.far}; --near: ${s.near}; ` +
  `--figure: ${figure}; --face: ${face}; --ground: ${ground}; --road: ${road}; --trail: ${trail}; --bubble: ${bubble};`

const STARS = [
  [120, 60], [260, 140], [410, 40], [530, 110], [700, 70], [860, 30], [990, 120], [1130, 60], [1270, 150], [1420, 50], [1520, 120],
  [340, 210], [780, 190], [1200, 230], [60, 200],
]

                                                                           

export const scene = ({ percent, pace, mode }            )         => {
  const p = percent ?? 0
  const day = skyAt(p)
  const night = nightOf(day)
  const land = { ...day, near: mix(day.near, '#F4EAD6', 0.22) }
  const light = vars(land, BRAND.navy, mix(day.horizon, BRAND.cream, 0.4), '#F4EAD6', mix(day.near, BRAND.cream, 0.55), BRAND.orange, BRAND.cream)
  const dark = vars(night, BRAND.cream, BRAND.navy, BRAND.navy, mix(night.near, BRAND.cream, 0.28), BRAND.orange, '#13284A')
  const palette =
    mode === 'oscuro'
      ? `svg { ${dark} }`
      : mode === 'claro'
        ? `svg { ${light} }`
        : `svg { ${light} } @media (prefers-color-scheme: dark) { svg { ${dark} } }`

  const f = 0.03 + 0.94 * (Math.min(p, 100) / 100)
  const [rx, ry] = roadPoint(f)
  const sun = sunAt(p)
  const stars = clamp((p - 78) / 18, 0, 1)
  const warm = clamp(Math.abs(p - 45) / 45, 0, 1)
  const sunColor = mix('#FFD27A', BRAND.orange, warm)
  const glow = 0.35 + 0.35 * warm
  const milestones = [0.25, 0.5, 0.75]
    .map(m => {
      const [mx, my] = roadPoint(0.03 + 0.94 * m)
      const passed = f >= 0.03 + 0.94 * m

      return `<g transform="translate(${r1(mx)} ${r1(my)})"><path class="${passed ? 'cairn passed' : 'cairn'}" d="M-7 0 L7 0 L5 -5 L-5 -5 Z M-4 -5 L4 -5 L3 -10 L-3 -10 Z M-2 -10 L2 -10 L0 -14 Z"/></g>`
    })
    .join('')
  const [cx, cy] = roadPoint(0.995)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<style>
${palette}
@keyframes rr-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.6px) } }
@keyframes rr-step-a { 0%, 100% { transform: rotate(22deg) } 50% { transform: rotate(-22deg) } }
@keyframes rr-step-b { 0%, 100% { transform: rotate(-22deg) } 50% { transform: rotate(22deg) } }
@keyframes rr-sway { 0%, 100% { transform: rotate(0deg) } 50% { transform: rotate(-7deg) } }
@keyframes rr-staff { 0%, 100% { transform: rotate(-4deg) } 50% { transform: rotate(5deg) } }
@keyframes rr-dust { 0% { opacity: 0.5; transform: translateX(0) } 100% { opacity: 0; transform: translateX(-10px) } }
@keyframes rr-dot { 0%, 100% { opacity: 0.25 } 50% { opacity: 1 } }
@keyframes rr-breathe { 0%, 100% { opacity: 0.35 } 50% { opacity: 0.8 } }
@keyframes rr-drift { 0% { transform: translateX(0) } 100% { transform: translateX(60px) } }
@keyframes rr-twinkle { 0%, 100% { opacity: 0.4 } 50% { opacity: 1 } }
.s-top { stop-color: var(--top) } .s-mid { stop-color: var(--mid) } .s-hor { stop-color: var(--horizon) }
.s-ground { stop-color: var(--ground) }
.far { fill: var(--far); opacity: 0.75 } .midr { fill: var(--far) } .near { fill: var(--near) }
.road-ahead { fill: none; stroke: var(--road); stroke-width: 3; stroke-dasharray: 2 9; stroke-linecap: round; opacity: 0.85 }
.road-done { fill: none; stroke: var(--trail); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round }
.cairn { fill: var(--road) } .cairn.passed { fill: var(--trail) }
.tent { fill: var(--road) } .tent-door { fill: var(--near) } .flag { fill: var(--trail) }
.ink { fill: var(--figure) } .cape { fill: var(--figure); opacity: 0.9 } .face { fill: var(--face) }
.scarf { fill: ${BRAND.orange} }
.pole { stroke: var(--figure); stroke-width: 2.4; stroke-linecap: round } .pole.thin { stroke-width: 1.2 }
.leg { stroke: var(--figure); stroke-width: 4.2; stroke-linecap: round; fill: none }
.lamp { fill: ${BRAND.orange} } .lamp-glow { fill: ${BRAND.orange}; opacity: 0 }
.dust circle { fill: var(--road); opacity: 0 }
.bubble { opacity: 0 } .bubble-box { fill: var(--bubble); stroke: var(--figure); stroke-width: 1.6 } .dot { fill: var(--figure) }
.sun { fill: ${sunColor} } .sun-glow { stop-color: ${sunColor} }
.star { fill: #FCF3E1 } .moon { fill: #FCF3E1 }
.cloud { fill: #FCF3E1; opacity: 0.32 }
.clouds { animation: rr-drift 90s linear infinite alternate }
.star.tw { animation: rr-twinkle 6s ease-in-out infinite }
.leg, .cape, .staff, .scarf-tail { transform-box: fill-box }
.leg { transform-origin: 50% 0% } .cape { transform-origin: 100% 0% } .staff { transform-origin: 50% 100% } .scarf-tail { transform-origin: 100% 0% }
.explora .rogue-body { animation: rr-bob 0.8s ease-in-out infinite }
.explora .leg-a { animation: rr-step-a 0.8s ease-in-out infinite }
.explora .leg-b { animation: rr-step-b 0.8s ease-in-out infinite }
.explora .cape, .explora .scarf-tail { animation: rr-sway 1.6s ease-in-out infinite }
.explora .staff { animation: rr-staff 0.8s ease-in-out infinite }
.explora .dust circle { animation: rr-dust 0.8s ease-out infinite }
.explora .dust circle:nth-child(2) { animation-delay: 0.2s } .explora .dust circle:nth-child(3) { animation-delay: 0.4s }
.espera .bubble { opacity: 1 }
.espera .dot { animation: rr-dot 2.4s ease-in-out infinite } .espera .d2 { animation-delay: 0.4s } .espera .d3 { animation-delay: 0.8s }
.espera .lamp-glow { opacity: 0.5; animation: rr-breathe 4s ease-in-out infinite }
</style>
<defs>
<linearGradient id="rrSky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" class="s-top"/><stop offset="0.26" class="s-mid"/><stop offset="0.44" class="s-hor"/>
</linearGradient>
<linearGradient id="rrMist" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" class="s-ground" stop-opacity="0"/><stop offset="0.4" class="s-ground" stop-opacity="0.86"/><stop offset="1" class="s-ground" stop-opacity="1"/>
</linearGradient>
<radialGradient id="rrSun"><stop offset="0.3" class="sun-glow" stop-opacity="${glow.toFixed(2)}"/><stop offset="1" class="sun-glow" stop-opacity="0"/></radialGradient>
</defs>
<!-- cielo -->
<rect width="100%" height="100%" fill="url(#rrSky)"/>
<svg width="100%" height="64%" viewBox="0 0 ${W} 520" preserveAspectRatio="xMidYMax meet" overflow="visible">
<!-- estrellas y luna al anochecer -->
<g opacity="${stars.toFixed(2)}">
${STARS.map(([x, y], i) => `<circle class="${i % 3 === 0 ? 'star tw' : 'star'}" cx="${x}" cy="${y}" r="${i % 4 === 0 ? 1.8 : 1.2}"${i % 3 === 0 ? ` style="animation-delay: ${i % 5}s"` : ''}/>`).join('')}
<path class="moon" d="M560 62 A34 34 0 1 0 596 110 A28 28 0 1 1 560 62 Z"/>
</g>
<!-- sol -->
<circle cx="${r1(sun.x)}" cy="${r1(sun.y)}" r="130" fill="url(#rrSun)"/>
<circle class="sun" cx="${r1(sun.x)}" cy="${r1(sun.y)}" r="40"/>
<!-- nubes -->
<g class="clouds" opacity="${(1 - stars).toFixed(2)}">
<path class="cloud" d="M200 150 h140 a22 22 0 0 0 -30 -26 a34 34 0 0 0 -62 -8 a24 24 0 0 0 -48 34 Z"/>
<path class="cloud" d="M980 96 h180 a26 26 0 0 0 -36 -30 a40 40 0 0 0 -74 -10 a28 28 0 0 0 -70 40 Z"/>
</g>
<!-- montañas -->
<path class="far" d="${FAR_D}"/>
<path class="midr" d="${MID_D}" opacity="0.9"/>
<path class="near" d="${NEAR_D}"/>
<!-- el camino: punteado por delante, naranja lo recorrido -->
<path class="road-ahead" d="${ROAD_D}"/>
<path class="road-done" d="${ROAD_D}" pathLength="100" stroke-dasharray="${r1(f * 100)} 200"/>
${milestones}
<!-- el campamento al final del camino -->
<g transform="translate(${r1(cx)} ${r1(cy)})"><path class="tent" d="M-16 0 L0 -22 L16 0 Z"/><path class="tent-door" d="M-4 0 L0 -8 L4 0 Z"/><line class="pole thin" x1="0" y1="-22" x2="0" y2="-34"/><path class="flag" d="M0 -34 L10 -31 L0 -28 Z"/></g>
<!-- el explorador -->
<g class="${pace}" transform="translate(${r1(rx)} ${r1(ry)}) scale(1.3)">
${ROGUE}
</g>
</svg>
<!-- bruma: el paisaje se funde con la página bajo la conversación -->
<rect y="50%" width="100%" height="50%" fill="url(#rrMist)"/>
</svg>`
}
