// La escena de rogue-road: un camino que cruza el paisaje de izquierda a
// derecha, un sol que sale al amanecer y se pone al atardecer, y un explorador
// encapuchado cuya posición sobre el camino es el porcentaje de contexto usado.
// Funciones puras: no tocan `$`, así que también sirven para generar las
// muestras del sistema de diseño.

export type Hex = `#${string}`
export type Mode = 'auto' | 'claro' | 'oscuro'
export type Pace = 'explora' | 'espera'
export type Weather = 'despejado' | 'nublado' | 'lluvia' | 'tormenta'

/** Un hito del viaje sobre el camino: dónde (en % de contexto), de qué tipo y qué fue. */
export type SceneMark = { percent: number; kind: string; label: string }

/** El color del banderín de cada tipo de hito. */
export const MARK_COLORS: Record<string, Hex> = { commit: '#F7792C', tests: '#4CC38A', pr: '#9D8CF2', push: '#FCF3E1' }

/** Cuántos hitos dibuja la escena como mucho: los más recientes. */
export const MAX_MARKS = 24

/** Paleta del brand de The Rogue Roadmap. */
export const BRAND = { navy: '#0A1B35', orange: '#F7792C', cream: '#FCF3E1' } as const

// ─── Cielo: fotogramas del día según el contexto usado ───────────────

type SkyStop = { at: number; top: Hex; mid: Hex; horizon: Hex; far: Hex; near: Hex }
export type Sky = Omit<SkyStop, 'at'>

export const SKY: SkyStop[] = [
  { at: 0, top: '#2B2F5C', mid: '#8C6A9E', horizon: '#F6B38E', far: '#5A4F72', near: '#2E3A57' },
  { at: 15, top: '#4D6FA3', mid: '#C9A6B8', horizon: '#FAD3A8', far: '#727A9C', near: '#3B4D66' },
  { at: 35, top: '#6FA6D6', mid: '#B9D8EC', horizon: '#FCF3E1', far: '#8EA6BD', near: '#4A6670' },
  { at: 55, top: '#5C9FD8', mid: '#A8D3F0', horizon: '#FCEFD6', far: '#87A0B3', near: '#486A66' },
  { at: 75, top: '#5B7FB0', mid: '#E8B98A', horizon: '#F7A15A', far: '#7E6E80', near: '#3F4A5C' },
  { at: 90, top: '#2C3566', mid: '#C2607A', horizon: '#F7792C', far: '#4A3A5E', near: '#1E2A45' },
  { at: 100, top: '#0A1B35', mid: '#2C2F5E', horizon: '#8A3F5A', far: '#1E2342', near: '#0E1A30' },
]

const toRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1, 7), 16)

  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (rgb: [number, number, number]): Hex =>
  `#${rgb.map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`

/** Mezcla `a` hacia `b` en la proporción `t` (0 = a, 1 = b). */
export const mix = (a: string, b: string, t: number): Hex => {
  const x = toRgb(a)
  const y = toRgb(b)

  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** El cielo de modo claro para un porcentaje de contexto. */
export const skyAt = (percent: number): Sky => {
  const p = clamp(percent, 0, 100)
  let k = 0
  while (k < SKY.length - 2 && (SKY[k + 1]?.at ?? 100) <= p) {
    k++
  }
  const a = SKY[k] ?? SKY[0]!
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
export const nightOf = (s: Sky): Sky => ({
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

// El camino evita la columna de lectura, donde la app pone la conversación:
// sube en zigzag por la ladera izquierda, cruza el valle a lo lejos, cerca del
// horizonte, y baja en zigzag por la derecha hasta el campamento. Así el
// explorador pasa la mayor parte del viaje en los bordes de la ventana.
const WAYPOINTS: [number, number][] = [
  [30, 492], [330, 470], [70, 440], [370, 410], [120, 384], [420, 362], [520, 350],
  [680, 344], [800, 342], [920, 344],
  [1080, 350], [1180, 362], [1480, 384], [1230, 410], [1530, 440], [1270, 470], [1570, 492],
]

/** Suaviza las curvas cortando esquinas (Chaikin): sin bucles en las horquillas. */
const chaikin = (pts: [number, number][], rounds: number): [number, number][] => {
  let out = pts
  for (let r = 0; r < rounds; r++) {
    const next: [number, number][] = [out[0]!]
    for (let i = 0; i < out.length - 1; i++) {
      const [ax, ay] = out[i]!
      const [bx, by] = out[i + 1]!
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
    }
    next.push(out[out.length - 1]!)
    out = next
  }

  return out
}

const ROAD = chaikin(WAYPOINTS, 3)
const N = ROAD.length

const LENGTHS = ROAD.reduce<number[]>((acc, p, i) => {
  const q = ROAD[i - 1]
  acc.push(q === undefined ? 0 : (acc[i - 1] ?? 0) + Math.hypot(p[0] - q[0], p[1] - q[1]))

  return acc
}, [])
const TOTAL = LENGTHS[LENGTHS.length - 1] ?? 1

/** Punto del camino a una fracción `f` (0 a 1) de su largo, y si ahí avanza hacia la izquierda. */
export const roadStep = (f: number): { x: number; y: number; isLeftward: boolean } => {
  const target = clamp(f, 0, 1) * TOTAL
  let i = 1
  while (i < N - 1 && (LENGTHS[i] ?? 0) < target) {
    i++
  }
  const a = ROAD[i - 1]!
  const b = ROAD[i]!
  const la = LENGTHS[i - 1] ?? 0
  const lb = LENGTHS[i] ?? la
  const t = lb === la ? 0 : (target - la) / (lb - la)

  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, isLeftward: b[0] < a[0] - 0.01 }
}

/** Punto del camino a una fracción `f` (0 a 1) de su largo. */
export const roadPoint = (f: number): [number, number] => {
  const { x, y } = roadStep(f)

  return [x, y]
}

/** Cuánto del viaje pasa por la columna central (30 % a 70 % del ancho). */
export const centerShare = (): number => {
  let inside = 0
  for (let i = 1; i < N; i++) {
    const [x] = ROAD[i]!
    if (x > W * 0.3 && x < W * 0.7) {
      inside += (LENGTHS[i] ?? 0) - (LENGTHS[i - 1] ?? 0)
    }
  }

  return inside / TOTAL
}

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString()
const ROAD_D = `M${ROAD.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')}`

const ridge = (from: number, to: number, step: number, y: (x: number) => number, base: number): string => {
  const pts: string[] = []
  for (let x = from; x <= to; x += step) {
    pts.push(`${r1(x)} ${r1(y(x))}`)
  }

  return `M${from} ${base} L${pts.join(' L')} L${to} ${base} Z`
}

/** Lo más alto que pisa el camino cerca de cada columna, con margen. */
const roadTop = (x: number): number => {
  let top = 486
  for (const [px, py] of ROAD) {
    if (Math.abs(px - x) <= 60) {
      top = Math.min(top, py - 24)
    }
  }

  return top
}

// La ladera cercana: el contorno del camino suavizado hacia afuera, para que
// el camino siempre pise tierra y la ladera baje en pendiente suave.
const GROUND_STEP = 20
const GROUND_X = Array.from({ length: (3200 + 1600) / GROUND_STEP + 1 }, (_, i) => -1600 + i * GROUND_STEP)
const GROUND_Y = (() => {
  const raw = GROUND_X.map(roadTop)
  let ys = raw
  for (let pass = 0; pass < 14; pass++) {
    ys = ys.map((y, i) => Math.min(raw[i] ?? y, ((ys[i - 1] ?? y) + 2 * y + (ys[i + 1] ?? y)) / 4))
  }
  // Un último suavizado, sin forzar: redondea los escalones que quedan sobre el camino.
  return ys.map((y, i) => Math.min(raw[i] ?? y, y, ((ys[i - 1] ?? y) + y + (ys[i + 1] ?? y)) / 3 + 6))
})()

// Montañas lejanas: picos suaves sobre el horizonte, extendidas a los lados
// para pantallas anchas.
const farY = (x: number): number => HORIZON + 10 - 70 * Math.abs(Math.sin(x / 260)) - 30 * Math.abs(Math.sin(x / 97 + 1.3))
const midY = (x: number): number => HORIZON + 34 - 34 * Math.abs(Math.sin(x / 180 + 0.7)) - 12 * Math.sin(x / 61)
const FAR_D = ridge(-1600, 3200, 40, farY, 1200)
const MID_D = ridge(-1600, 3200, 40, midY, 1200)

const NEAR_RIM = `M${GROUND_X.flatMap((x, i) => (x >= -400 && x <= 2000 ? [`${x} ${r1(GROUND_Y[i] ?? 486)}`] : [])).join(' L')}`
const NEAR_D = `M-1600 1600 L${GROUND_X.map((x, i) => `${x} ${r1(GROUND_Y[i] ?? 486)}`).join(' L')} L3200 1600 Z`

/** Posición del sol: sale por la izquierda, culmina al mediodía y se pone por la derecha pasado el 90 %. */
export const sunAt = (percent: number): { x: number; y: number } => {
  const t = clamp(percent / 90, 0, 1.15)
  const arc = Math.sin(Math.min(t, 1) * Math.PI) * 240

  return { x: 140 + 1320 * Math.min(t, 1.05), y: HORIZON - arc + (t > 1 ? (t - 1) * 600 : 0) }
}

// ─── El explorador: el viajero ───────────────────────────────────────
// La silueta del emblema con proporciones humanas: rostro bajo la capucha en
// pico, brazos y manos, túnica con cinturón, botas, capa corta, y a la espalda
// la mochila con el mapa enrollado y el farol. Pies en (0, 0), mira a la
// derecha, unos 108 de alto. Dos poses: camina (explora) y espera.

const PACK = `<path class="strap" d="M-7 -78C-2 -70 2 -62 4 -52"/>
<rect class="pack" x="-22" y="-76" width="13" height="28" rx="5"/><rect class="pack-flap" x="-22" y="-76" width="13" height="9" rx="4"/>
<rect class="orange" x="-25" y="-83" width="18" height="7" rx="3.5"/><path class="route-mark" d="M-21 -79.5h12"/>
<line class="pole thin" x1="-20" y1="-49" x2="-27" y2="-37"/>
<circle class="lamp-glow" cx="-28" cy="-31" r="13"/><rect class="lamp" x="-31.5" y="-38" width="7" height="9" rx="2"/>`

const HEAD = `<g transform="translate(0 -76) scale(.76) translate(0 76)">
<path class="ink" d="M-8 -108C-20 -99 -22 -86 -16 -75L13 -75C16 -88 9 -99 -8 -108Z"/>
<path class="skin" d="M3 -96C10 -95 12 -88 11 -81C9 -78 4 -77 0 -79C-1 -85 -1 -91 3 -96Z"/>
<path class="ink" d="M2 -97C7 -97 11 -94 12 -89C8 -91 5 -92 1 -90Z"/>
<circle class="eye" cx="7" cy="-87" r="1.2"/><path class="nose" d="M10.6 -86L12.2 -83.2L10.4 -82.6"/>
</g>`

const TORSO = `<path class="cape" d="M-10 -76C-20 -66 -27 -48 -30 -30L-14 -33Z"/>
<path class="ink" d="M-11 -76C-13 -64 -13 -50 -12 -36L12 -36C13 -50 13 -64 11 -76Z"/>
<path class="belt" d="M-12 -46H12V-42H-12Z"/><rect class="buckle" x="2" y="-46.5" width="4" height="5" rx="1"/>
<path class="orange" d="M-12 -77H12V-71H-12Z"/>`

const leg = (cls: string, d: string, boot: string): string => `<g class="${cls}"><path class="limb" d="${d}"/><path class="boot" d="${boot}"/></g>`

const ROGUE = `<g class="pose-walk">
${leg('stride stride-b', 'M3 -46L4 -24L4 -4', 'M0 -5H8A3 3 0 0 1 11 -2V0H0Z')}
<g class="walker"><g transform="translate(0 -8)">
<g class="arm-back"><path class="limb" d="M-7 -72L-9 -58L-7 -48"/><circle class="skin" cx="-7" cy="-47" r="2.6"/></g>
${PACK}
${TORSO}
<path class="tail orange" d="M-10 -76L-24 -69L-21 -65L-9 -71Z"/>
${HEAD}
<g class="arm-front"><line class="pole" x1="18" y1="-88" x2="20" y2="9"/><circle class="ink" cx="18" cy="-89" r="2.8"/>
<path class="limb" d="M7 -72L12 -60L18 -56"/><circle class="skin" cx="18.6" cy="-56" r="3"/></g>
</g></g>
${leg('stride stride-a', 'M-3 -46L-4 -24L-4 -4', 'M-7 -5H1A3 3 0 0 1 4 -2V0H-7Z')}
<g class="dust"><circle cx="-12" cy="-1" r="2.2"/><circle cx="-20" cy="-3" r="1.6"/><circle cx="-27" cy="-1" r="1.2"/></g>
</g>
<g class="pose-wait"><g class="tilt">
${leg('still', 'M3 -46L5 -24L6 -4', 'M2 -5H10A3 3 0 0 1 13 -2V0H2Z')}
${leg('still', 'M-3 -46L-5 -24L-6 -4', 'M-9 -5H-1A3 3 0 0 1 2 -2V0H-9Z')}
<g transform="translate(0 -8)">
${PACK}
${TORSO}
<path class="orange" d="M-11 -75L-15 -58L-11 -58L-8 -71Z"/>
<path class="limb" d="M-7 -72L-6 -60L-1 -58"/><circle class="skin" cx="0" cy="-58" r="2.6"/>
<g class="look">${HEAD}</g>
<line class="pole" x1="21" y1="-96" x2="21" y2="9"/><circle class="ink" cx="21" cy="-97" r="2.8"/>
<path class="limb" d="M7 -72L14 -66L20 -68"/><circle class="skin" cx="21" cy="-68" r="2.8"/>
</g></g></g>
<g class="bubble" transform="translate(4 -116)"><path class="bubble-box" d="M-18 -11 H18 A7 7 0 0 1 25 -4 V4 A7 7 0 0 1 18 11 H4 L-1 17 L-4 11 H-18 A7 7 0 0 1 -25 4 V-4 A7 7 0 0 1 -18 -11 Z"/>
<circle class="dot d1" cx="-9" cy="0" r="2.6"/><circle class="dot d2" cx="0" cy="0" r="2.6"/><circle class="dot d3" cx="9" cy="0" r="2.6"/></g>`

/**
 * Los estilos del viajero. Leen `--figure` (la ropa), `--staff` (el bastón),
 * `--boot` y `--bubble`, y esperan la clase `explora` o `espera` en un
 * ancestro. Sus animaciones están en ROGUE_KEYFRAMES.
 */
export const ROGUE_STYLE = `.ink { fill: var(--figure) } .cape { fill: var(--figure); opacity: 0.82 }
.orange, .lamp, .buckle { fill: ${BRAND.orange} } .lamp-glow { fill: ${BRAND.orange}; opacity: 0 }
.skin { fill: #E2A77E } .eye { fill: ${BRAND.navy} } .nose { fill: none; stroke: #B97B55; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round }
.limb { fill: none; stroke: var(--figure); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round }
.boot { fill: var(--boot) } .belt { fill: #7A4E32 } .strap { fill: none; stroke: #7A4E32; stroke-width: 2.4; stroke-linecap: round }
.pack { fill: var(--figure); opacity: 0.78 } .pack-flap { fill: var(--figure) }
.route-mark { fill: none; stroke: ${BRAND.navy}; stroke-width: 0.9; stroke-dasharray: 2 2 }
.pole { fill: none; stroke: var(--staff); stroke-width: 2.6; stroke-linecap: round } .pole.thin { stroke-width: 1.3 }
.dust circle { fill: var(--road, ${BRAND.cream}); opacity: 0 }
.bubble { opacity: 0 } .bubble-box { fill: var(--bubble); stroke: var(--staff); stroke-width: 1.6 } .dot { fill: var(--staff) }
.pose-wait { display: none } .espera .pose-wait { display: inline } .espera .pose-walk { display: none }
.stride, .arm-back, .arm-front, .cape, .tail, .tilt, .look { transform-box: fill-box }
.stride, .arm-back { transform-origin: 50% 0% } .cape, .tail { transform-origin: 100% 0% } .tilt, .look { transform-origin: 50% 100% } .arm-front { transform-origin: 0% 17% }
.explora .walker { animation: rr-bob 0.8s ease-in-out infinite }
.explora .stride-a, .explora .arm-back { animation: rr-step-a 0.8s ease-in-out infinite }
.explora .stride-b { animation: rr-step-b 0.8s ease-in-out infinite }
.explora .cape, .explora .tail { animation: rr-sway 1.6s ease-in-out infinite }
.explora .arm-front { animation: rr-staff 0.8s ease-in-out infinite }
.explora .dust circle { animation: rr-dust 0.8s ease-out infinite }
.explora .dust circle:nth-child(2) { animation-delay: 0.2s } .explora .dust circle:nth-child(3) { animation-delay: 0.4s }
.espera .bubble { opacity: 1 }
.espera .dot { animation: rr-dot 2.4s ease-in-out infinite } .espera .d2 { animation-delay: 0.4s } .espera .d3 { animation-delay: 0.8s }
.espera .lamp-glow { opacity: 0.5; animation: rr-breathe 4s ease-in-out infinite }
.espera .tilt { animation: rr-idle 4s ease-in-out infinite }
.espera .look { animation: rr-look 7s ease-in-out infinite }`

export const ROGUE_KEYFRAMES = `@keyframes rr-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.8px) } }
@keyframes rr-sway { 0%, 100% { transform: rotate(0deg) } 50% { transform: rotate(-8deg) } }
@keyframes rr-staff { 0%, 100% { transform: rotate(-5deg) } 50% { transform: rotate(6deg) } }
@keyframes rr-look { 0%, 40%, 100% { transform: rotate(0deg) } 55%, 85% { transform: rotate(-5deg) } }`

/** El viajero solo, para usarlo como avatar fuera de la escena. */
export const rogueGlyph = ROGUE

// ─── La escena completa ──────────────────────────────────────────────

const vars = (s: Sky, figure: Hex, face: Hex, ground: Hex, road: Hex, trail: Hex, bubble: Hex): string =>
  `--top: ${s.top}; --mid: ${s.mid}; --horizon: ${s.horizon}; --far: ${s.far}; --near: ${s.near}; ` +
  `--figure: ${figure}; --face: ${face}; --ground: ${ground}; --road: ${road}; --trail: ${trail}; --bubble: ${bubble};`

const STARS = [
  [120, 60], [260, 140], [410, 40], [530, 110], [700, 70], [860, 30], [990, 120], [1130, 60], [1270, 150], [1420, 50], [1520, 120],
  [340, 210], [780, 190], [1200, 230], [60, 200],
]

// ─── La viñeta del explorador ────────────────────────────────────────
// El explorador vive en la esquina inferior izquierda, fuera de la columna de
// lectura. Camina en el lugar y el mundo se desplaza detrás de él (parallax):
// pinos lejanos lentos, piedras y matas cercanas rápidas, el sendero bajo los
// pies. En espera todo se detiene y él aguarda con el farol encendido.

const VG_GROUND = 846
const VG_LOOP = 400

const farPines = (): string => {
  let d = ''
  for (let copy = 0; copy < 2; copy++) {
    for (const [x, h] of [[10, 34], [46, 22], [120, 40], [150, 28], [236, 30], [300, 46], [330, 26], [372, 34]] as const) {
      const bx = x + copy * VG_LOOP
      d += `M${bx - h * 0.32} 812L${bx} ${812 - h}L${bx + h * 0.32} 812Z`
    }
  }

  return d
}

const nearThings = (): string => {
  let stones = ''
  let grass = ''
  for (let copy = 0; copy < 2; copy++) {
    const o = copy * VG_LOOP
    for (const [x, rx] of [[40, 9], [210, 6], [330, 12]] as const) {
      stones += `M${x + o - rx} ${VG_GROUND + 14}a${rx} ${rx * 0.6} 0 0 1 ${rx * 2} 0Z`
    }
    for (const x of [90, 150, 260, 300, 380]) {
      grass += `M${x + o} ${VG_GROUND + 12}l3 -11M${x + o + 4} ${VG_GROUND + 12}l1 -8M${x + o + 7} ${VG_GROUND + 12}l-2 -9`
    }
  }
  // Un poste del camino, una vez por vuelta.
  const posts = [170, 170 + VG_LOOP]
    .map(x => `<g class="post"><rect x="${x}" y="${VG_GROUND - 40}" width="4" height="52" rx="1"/><path d="M${x - 2} ${VG_GROUND - 38}h30l7 6l-7 6h-30Z"/></g>`)
    .join('')

  return `<path class="vg-stone" d="${stones}"/><path class="vg-grass" d="${grass}"/>${posts}`
}

const FAR_PINES = farPines()
const NEAR_THINGS = nearThings()

// Los compañeros (subagentes) caminan junto al viajero: uno detrás y dos delante.
const MATE_X = [72, 228, 286]

const mates = (pace: Pace, count: number): string => {
  const shown = Math.min(count, MATE_X.length)
  const figures = MATE_X.slice(0, shown)
    .map((x, k) => `<g transform="translate(${x} ${VG_GROUND}) scale(1.08)"><g class="companion c${k} ${pace}">${ROGUE}</g></g>`)
    .join('')
  const more = count > shown ? `<text class="mate-more" x="318" y="${VG_GROUND - 118}">+${count - shown}</text>` : ''

  return figures + more
}

const vignette = (pace: Pace, shadowLen: number, shadowDir: number, shadowAlpha: number, fireflies: number, companions = 0): string => `<svg width="100%" height="100%" viewBox="0 0 1600 900" preserveAspectRatio="xMinYMax meet" overflow="visible">
<g class="vignette ${pace}" mask="url(#rrVgMask)">
<path class="vg-ground" d="M-60 900V${VG_GROUND - 4}Q140 ${VG_GROUND - 22} 520 ${VG_GROUND}V900Z"/>
<g class="vg-scroll vg-far">${`<path class="vg-pines" d="${FAR_PINES}"/>`}</g>
<path class="vg-path" d="M-60 ${VG_GROUND + 6}H460"/>
<g class="vg-scroll vg-near">${NEAR_THINGS}</g>
<ellipse class="vg-shadow" cx="${r1(150 + (shadowDir * shadowLen) / 2)}" cy="${VG_GROUND + 2}" rx="${r1(shadowLen / 2 + 14)}" ry="6" opacity="${shadowAlpha.toFixed(2)}"/>
${mates(pace, companions)}
<g transform="translate(150 ${VG_GROUND}) scale(1.35)"><g class="${pace}">${ROGUE}</g></g>
<g opacity="${fireflies.toFixed(2)}">${[[60, 760], [250, 720], [320, 800], [110, 690], [380, 740]].map(([x, y], i) => `<circle class="firefly" cx="${x}" cy="${y}" r="2.6" style="animation-delay: -${i * 1.7}s"/>`).join('')}</g>
</g>
</svg>`

const LIGHT_EXTRA = `--staff: ${BRAND.navy}; --boot: #5A3A26; --mate: #3B4D66;`
const DARK_EXTRA = '--staff: #A7B0C2; --boot: #8A5A3C; --mate: #6F7A90;'

export type SceneInput = {
  percent: number | null
  pace: Pace
  mode: Mode
  /** Nombre de la fase para la insignia de la esquina, como «Mañana». */
  label?: string
  /** Los hitos reales del día: commits, tests, pushes y PRs. */
  marks?: SceneMark[]
  /** El clima del trabajo. */
  weather?: Weather
  /** Cuántos subagentes acompañan al viajero. */
  companions?: number
}

/** Qué hay bajo un clic en el fondo: la insignia, el viajero, el sol o el campamento. */
export type Zone = 'insignia' | 'viajero' | 'sol' | 'campamento' | null

/**
 * La zona de un clic, con `x` e `y` de 0 a 1 sobre el fondo. Aproxima la
 * escena en una ventana apaisada: la insignia y el viajero en la columna
 * izquierda, el campamento al final del camino a la derecha, y el sol donde
 * va según el contexto.
 */
export const zoneAt = (x: number, y: number, percent: number): Zone => {
  const sun = sunAt(percent)
  if (x < 0.22 && y < 0.24) {
    return 'insignia'
  }
  if (x < 0.24 && y > 0.66) {
    return 'viajero'
  }
  if (Math.abs(x - sun.x / W) < 0.08 && Math.abs(y - (sun.y / 520) * 0.64) < 0.1) {
    return 'sol'
  }
  if (x > 0.84 && y > 0.42 && y < 0.78) {
    return 'campamento'
  }

  return null
}

/** Lo más largo que puede ser el SVG de un fondo: la app de escritorio no dibuja nada pasado 131 072 caracteres. */
export const MAX_SVG = 126_000

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * La escena completa. Si alguna vez pasara del límite de la app, se dibuja una
 * versión liviana, sin estrellas, nubes, montañas lejanas ni hitos.
 */
export const scene = (input: SceneInput): string => {
  const full = compose(input, false)

  return full.length <= MAX_SVG ? full : compose(input, true)
}

/** La insignia de la esquina: el explorador en un círculo de cielo, el anillo de contexto y la fase. Siempre visible, en píxeles fijos, bajo la barra de título de la app (unos 48 px). */
const badge = (p: number, pace: Pace, label: string): string => {
  const state = pace === 'explora' ? 'explorando' : 'esperándote'
  const title = escape(label === '' ? `${Math.round(p)} %` : label)
  const detail = escape(label === '' ? state : `${Math.round(p)} % · ${state}`)

  return `<svg x="20" y="64" width="236" height="84" viewBox="0 0 236 84" class="badge">
<rect class="badge-box" x="0" y="0" width="236" height="84" rx="42"/>
<circle cx="42" cy="42" r="30" fill="url(#rrSky)"/>
<g clip-path="url(#rrBadgeClip)"><g class="${pace}" transform="translate(40 106) scale(0.76)">${ROGUE}</g></g>
<circle class="ring-track" cx="42" cy="42" r="33"/>
<circle class="ring" cx="42" cy="42" r="33" pathLength="100" stroke-dasharray="${r1(clamp(p, 0, 100))} 100" transform="rotate(-90 42 42)"/>
<text class="badge-title" x="88" y="38">${title}</text>
<text class="badge-detail" x="88" y="58">${detail}</text>
</svg>`
}

/** Cuánto oscurece el cielo y cuántas nubes de lluvia trae cada clima. */
const GLOOM: Record<Weather, number> = { despejado: 0, nublado: 0.14, lluvia: 0.24, tormenta: 0.34 }
const STORM_CLOUDS: [number, number, number][] = [
  [140, 120, 1.3], [760, 70, 1.6], [1240, 130, 1.4], [460, 170, 1.1], [1020, 190, 1.2], [1420, 80, 1.0],
]
const CLOUD_D = 'h180 a26 26 0 0 0 -36 -30 a40 40 0 0 0 -74 -10 a28 28 0 0 0 -70 40 Z'

const weatherSky = (w: Weather): string => {
  const n = w === 'despejado' ? 0 : w === 'nublado' ? 3 : w === 'lluvia' ? 5 : 6
  const clouds = STORM_CLOUDS.slice(0, n)
    .map(([x, y, k]) => `<path class="storm-cloud" transform="translate(${x} ${y}) scale(${k})" d="M0 0 ${CLOUD_D}"/>`)
    .join('')
  const bolt = w === 'tormenta' ? '<path class="bolt" d="M1300 170 L1284 232 L1300 230 L1280 300"/>' : ''

  return n === 0 ? '' : `<!-- clima: nubes de lluvia -->\n<g class="storm">${clouds}${bolt}</g>`
}

const weatherVeil = (w: Weather): string => {
  if (w === 'despejado') {
    return ''
  }
  const rain = w === 'lluvia' || w === 'tormenta' ? `<g class="rain"><rect y="-80" width="100%" height="120%" fill="url(#rrRain)"/></g>` : ''
  const flash = w === 'tormenta' ? '<rect class="flash" width="100%" height="100%"/>' : ''

  return `<!-- clima: el cielo se cubre, llueve o relampaguea -->\n<rect class="gloom" width="100%" height="100%" opacity="${GLOOM[w].toFixed(2)}"/>${rain}${flash}`
}

const marksOf = (marks: SceneMark[]): string =>
  marks
    .slice(-MAX_MARKS)
    .map((m, i) => {
      const [mx, my] = roadPoint(0.03 + 0.94 * (clamp(m.percent, 0, 100) / 100))
      const lean = i % 2 === 0 ? 0 : 6
      const color = MARK_COLORS[m.kind] ?? BRAND.cream

      return `<g class="mark" transform="translate(${r1(mx + lean)} ${r1(my)})"><title>${escape(m.label.slice(0, 80))}</title><line class="mark-pole" x1="0" y1="0" x2="0" y2="-24"/><path d="M0 -24 L12 -20 L0 -16 Z" fill="${color}"/><circle class="mark-foot" r="2.6"/></g>`
    })
    .join('')

const compose = ({ percent, pace, mode, label = '', marks = [], weather = 'despejado', companions = 0 }: SceneInput, lite: boolean): string => {
  const p = percent ?? 0
  const day = skyAt(p)
  const night = nightOf(day)
  const land = { ...day, near: mix(day.near, '#F4EAD6', 0.22) }
  const light = vars(land, BRAND.navy, mix(day.horizon, BRAND.cream, 0.4), '#F4EAD6', mix(day.near, BRAND.cream, 0.55), BRAND.orange, BRAND.cream)
  const dark = vars(night, '#8F99AD', BRAND.navy, BRAND.navy, mix(night.near, BRAND.cream, 0.28), BRAND.orange, '#13284A')
  const palette =
    mode === 'oscuro'
      ? `svg { ${dark} ${DARK_EXTRA} }`
      : mode === 'claro'
        ? `svg { ${light} ${LIGHT_EXTRA} }`
        : `svg { ${light} ${LIGHT_EXTRA} } @media (prefers-color-scheme: dark) { svg { ${dark} ${DARK_EXTRA} } }`

  const f = 0.03 + 0.94 * (Math.min(p, 100) / 100)
  const [rx, ry] = roadPoint(f)
  const sun = sunAt(p)
  const stars = clamp((p - 78) / 18, 0, 1)
  const warm = clamp(Math.abs(p - 45) / 45, 0, 1)
  const sunColor = mix('#FFD27A', BRAND.orange, warm)
  const glow = 0.35 + 0.35 * warm
  // Luz y sombra: de qué lado está el sol y qué tan alto va.
  const side = clamp((sun.x - 800) / 660, -1, 1)
  const height = Math.sin(clamp(p / 90, 0, 1) * Math.PI)
  const litAlpha = (0.2 + 0.5 * Math.abs(side)) * (1 - stars * 0.85)
  const shadowLen = 24 + 150 * (1 - height)
  const shadowDir = side < 0 ? 1 : -1
  const shadowAlpha = 0.4 * (1 - stars * 0.6)
  // La atmósfera sigue al contexto: bruma que crece, pájaros por la mañana,
  // luciérnagas al atardecer y la fogata del campamento al anochecer.
  const haze = 0.06 + 0.34 * clamp(p / 100, 0, 1)
  const birds = clamp((p - 6) / 8, 0, 1) * clamp((46 - p) / 10, 0, 1)
  const fireflies = clamp((p - 68) / 10, 0, 1) * clamp((99 - p) / 6, 0, 1)
  const fire = clamp((p - 84) / 6, 0, 1)
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
@keyframes rr-step-a { 0%, 100% { transform: rotate(22deg) } 50% { transform: rotate(-22deg) } }
@keyframes rr-step-b { 0%, 100% { transform: rotate(-22deg) } 50% { transform: rotate(22deg) } }
@keyframes rr-dust { 0% { opacity: 0.5; transform: translateX(0) } 100% { opacity: 0; transform: translateX(-10px) } }
@keyframes rr-dot { 0%, 100% { opacity: 0.25 } 50% { opacity: 1 } }
@keyframes rr-breathe { 0%, 100% { opacity: 0.35 } 50% { opacity: 0.8 } }
${ROGUE_KEYFRAMES}
@keyframes rr-drift { 0% { transform: translateX(0) } 100% { transform: translateX(60px) } }
@keyframes rr-twinkle { 0%, 100% { opacity: 0.4 } 50% { opacity: 1 } }
@keyframes rr-scroll { to { transform: translateX(-${VG_LOOP}px) } }
@keyframes rr-trail { to { stroke-dashoffset: -24 } }
@keyframes rr-idle { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(0.7px) } }
@keyframes rr-pulse { 0% { transform: scale(0.6); opacity: 0.6 } 100% { transform: scale(1.6); opacity: 0 } }
@keyframes rr-glide { 0% { transform: translate(0, 0) } 100% { transform: translate(260px, -30px) } }
@keyframes rr-flap { 0%, 100% { transform: scaleY(1) } 50% { transform: scaleY(0.55) } }
@keyframes rr-float { 0% { transform: translate(0, 0) } 100% { transform: translate(14px, -22px) } }
@keyframes rr-glim { 0%, 100% { opacity: 0.15 } 50% { opacity: 1 } }
@keyframes rr-flame { 0%, 100% { transform: scale(1, 1) } 50% { transform: scale(0.92, 1.12) } }
@keyframes rr-smoke { 0% { transform: translate(0, 0) scale(0.6); opacity: 0 } 15% { opacity: 0.35 } 100% { transform: translate(-30px, -90px) scale(2.2); opacity: 0 } }
.s-top { stop-color: var(--top) } .s-mid { stop-color: var(--mid) } .s-hor { stop-color: var(--horizon) }
.s-ground { stop-color: var(--ground) }
.far { fill: var(--far); opacity: 0.75 } .midr { fill: var(--far) } .near { fill: var(--near) }
.road-ahead { fill: none; stroke: var(--road); stroke-width: 3; stroke-dasharray: 2 9; stroke-linecap: round; opacity: 0.85 }
.road-done { fill: none; stroke: var(--trail); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round }
.cairn { fill: var(--road) } .cairn.passed { fill: var(--trail) }
.tent { fill: var(--road) } .tent-door { fill: var(--near) } .flag { fill: var(--trail) }
.sun { fill: ${sunColor} } .sun-glow { stop-color: ${sunColor} }
.star { fill: #FCF3E1 } .moon { fill: #FCF3E1 }
.cloud { fill: #FCF3E1; opacity: 0.32 }
.clouds { animation: rr-drift 90s linear infinite alternate }
.star.tw { animation: rr-twinkle 6s ease-in-out infinite }
${ROGUE_STYLE}
.rim { fill: none; stroke: ${sunColor}; stroke-width: 2; stroke-linejoin: round }
.haze-band { stop-color: var(--horizon) }
.marker-dot { fill: var(--trail); stroke: var(--bubble); stroke-width: 2 }
.marker-pulse { fill: var(--trail); opacity: 0; transform-box: fill-box; transform-origin: center }
.explora .marker-pulse { animation: rr-pulse 1.6s ease-out infinite }
.bird { fill: none; stroke: var(--figure); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transform-box: fill-box; transform-origin: center; animation: rr-flap 1.2s ease-in-out infinite }
.birds { animation: rr-glide 80s linear infinite alternate }
.firefly { fill: #FFE08A; animation: rr-float 7s ease-in-out infinite alternate, rr-glim 4s ease-in-out infinite }
.flame { fill: ${BRAND.orange}; transform-box: fill-box; transform-origin: 50% 100%; animation: rr-flame 1.8s ease-in-out infinite }
.flame-core { fill: #FFD27A }
.log { stroke: var(--figure); stroke-width: 3; stroke-linecap: round }
.smoke { fill: #C9CFDA; opacity: 0; transform-box: fill-box; transform-origin: center; animation: rr-smoke 8s linear infinite }
.vg-ground { fill: var(--near) }
.vg-pines { fill: var(--far); opacity: 0.7 }
.vg-stone { fill: var(--road) } .vg-grass { fill: none; stroke: var(--road); stroke-width: 1.6; stroke-linecap: round }
.post rect, .post path { fill: var(--road) }
.vg-path { fill: none; stroke: var(--trail); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 10 14; opacity: 0.8 }
.vg-shadow { fill: #0A1B35 }
.vg-far { animation: rr-scroll 40s linear infinite }
.vg-near { animation: rr-scroll 10s linear infinite }
.vignette.explora .vg-path { animation: rr-trail 0.6s linear infinite }
.vignette.espera .vg-scroll { animation-play-state: paused }
.badge-box { fill: ${BRAND.navy}; opacity: 0.82 }
.ring-track { fill: none; stroke: ${BRAND.cream}; stroke-opacity: 0.22; stroke-width: 5 }
.ring { fill: none; stroke: ${BRAND.orange}; stroke-width: 5; stroke-linecap: round }
.badge-title { fill: ${BRAND.cream}; font: 600 18px Outfit, ui-sans-serif, system-ui, sans-serif }
.badge-detail { fill: ${BRAND.cream}; fill-opacity: 0.82; font: 400 13px Outfit, ui-sans-serif, system-ui, sans-serif }
.badge .bubble, .badge .dust, .badge .lamp-glow { display: none }
.mark-pole { stroke: var(--figure); stroke-width: 2; stroke-linecap: round } .mark-foot { fill: var(--figure) }
.companion { --figure: var(--mate); opacity: 0.9 }
.companion .bubble, .companion .lamp-glow { display: none }
.companion.c0 .pose-walk * { animation-delay: -0.27s } .companion.c1 .pose-walk * { animation-delay: -0.53s } .companion.c2 .pose-walk * { animation-delay: -0.4s }
.mate-more { fill: var(--figure); font: 600 22px Outfit, ui-sans-serif, system-ui, sans-serif }
.gloom { fill: #2E3A57 }
.storm-cloud { fill: #5E6A80; opacity: 0.62 }
.storm { animation: rr-drift 120s linear infinite alternate }
.rain { animation: rr-rain 1.4s linear infinite } .rain-drop { stroke: #C9D6E8; stroke-width: 1.4; stroke-linecap: round; opacity: 0.55 }
.flash { fill: #FCF3E1; opacity: 0; animation: rr-flash 11s linear infinite }
.bolt { fill: none; stroke: #FCF3E1; stroke-width: 3; stroke-linejoin: round; opacity: 0; animation: rr-flash-bolt 11s linear infinite }
@keyframes rr-rain { to { transform: translateY(80px) } }
@keyframes rr-flash { 0%, 93.5%, 96%, 100% { opacity: 0 } 94% { opacity: 0.16 } }
@keyframes rr-flash-bolt { 0%, 93.5%, 96.5%, 100% { opacity: 0 } 94% { opacity: 0.9 } }
</style>
<defs>
<linearGradient id="rrSky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" class="s-top"/><stop offset="0.26" class="s-mid"/><stop offset="0.44" class="s-hor"/>
</linearGradient>
<linearGradient id="rrMist" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" class="s-ground" stop-opacity="0"/><stop offset="0.4" class="s-ground" stop-opacity="0.86"/><stop offset="1" class="s-ground" stop-opacity="1"/>
</linearGradient>
<radialGradient id="rrLight" gradientUnits="userSpaceOnUse" cx="${r1(sun.x)}" cy="${r1(Math.max(sun.y, HORIZON - 60))}" r="760">
<stop offset="0" stop-color="${sunColor}" stop-opacity="0.85"/><stop offset="0.55" stop-color="${sunColor}" stop-opacity="0.25"/><stop offset="1" stop-color="${sunColor}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="rrHaze" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" class="haze-band" stop-opacity="0"/><stop offset="0.55" class="haze-band" stop-opacity="1"/><stop offset="1" class="haze-band" stop-opacity="0"/>
</linearGradient>
<linearGradient id="rrVgFade" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FFFFFF"/><stop offset="1" stop-color="#000000"/>
</linearGradient>
<mask id="rrVgMask" maskUnits="userSpaceOnUse" x="-80" y="560" width="520" height="360"><rect x="-80" y="560" width="520" height="360" fill="url(#rrVgFade)"/></mask>
<pattern id="rrRain" width="44" height="80" patternUnits="userSpaceOnUse"><line class="rain-drop" x1="32" y1="4" x2="28" y2="20"/><line class="rain-drop" x1="12" y1="44" x2="8" y2="60"/></pattern>
<clipPath id="rrBadgeClip"><circle cx="42" cy="42" r="30"/></clipPath>
<radialGradient id="rrSun"><stop offset="0.3" class="sun-glow" stop-opacity="${glow.toFixed(2)}"/><stop offset="1" class="sun-glow" stop-opacity="0"/></radialGradient>
</defs>
<!-- cielo -->
<rect width="100%" height="100%" fill="url(#rrSky)"/>
<svg width="100%" height="64%" viewBox="0 0 ${W} 520" preserveAspectRatio="xMidYMax meet" overflow="visible">
<!-- estrellas y luna al anochecer -->
<g opacity="${stars.toFixed(2)}"${lite ? ' display="none"' : ''}>
${STARS.map(([x, y], i) => `<circle class="${i % 3 === 0 ? 'star tw' : 'star'}" cx="${x}" cy="${y}" r="${i % 4 === 0 ? 1.8 : 1.2}"${i % 3 === 0 ? ` style="animation-delay: ${i % 5}s"` : ''}/>`).join('')}
<path class="moon" d="M560 62 A34 34 0 1 0 596 110 A28 28 0 1 1 560 62 Z"/>
</g>
<!-- sol -->
<circle cx="${r1(sun.x)}" cy="${r1(sun.y)}" r="130" fill="url(#rrSun)"/>
<circle class="sun" cx="${r1(sun.x)}" cy="${r1(sun.y)}" r="40"/>
<!-- nubes -->
<g class="clouds" opacity="${(1 - stars).toFixed(2)}"${lite ? ' display="none"' : ''}>
<path class="cloud" d="M200 150 h140 a22 22 0 0 0 -30 -26 a34 34 0 0 0 -62 -8 a24 24 0 0 0 -48 34 Z"/>
<path class="cloud" d="M980 96 h180 a26 26 0 0 0 -36 -30 a40 40 0 0 0 -74 -10 a28 28 0 0 0 -70 40 Z"/>
</g>
${lite ? '' : weatherSky(weather)}
<!-- pájaros por la mañana -->
<g class="birds" opacity="${birds.toFixed(2)}"${lite || birds === 0 || weather === 'lluvia' || weather === 'tormenta' ? ' display="none"' : ''}>
<path class="bird" d="M380 200q7 -7 14 0q7 -7 14 0"/><path class="bird" d="M418 186q6 -6 12 0q6 -6 12 0" style="animation-delay: -0.4s"/><path class="bird" d="M350 214q5 -5 10 0q5 -5 10 0" style="animation-delay: -0.8s"/>
</g>
<!-- montañas -->
${lite ? '' : `<path class="far" d="${FAR_D}"/><path d="${FAR_D}" fill="url(#rrLight)" opacity="${litAlpha.toFixed(2)}"/>`}
<!-- bruma entre planos: crece con el día -->
<rect x="-1600" y="${HORIZON - 110}" width="4800" height="170" fill="url(#rrHaze)" opacity="${haze.toFixed(2)}"/>
<path class="midr" d="${MID_D}" opacity="0.9"/>
<path d="${MID_D}" fill="url(#rrLight)" opacity="${(litAlpha * 0.8).toFixed(2)}"/>
<path class="near" d="${NEAR_D}"/>
<path class="rim" d="${NEAR_RIM}" opacity="${(litAlpha * 0.8).toFixed(2)}"/>
<!-- el camino: punteado por delante, naranja lo recorrido -->
<path class="road-ahead" d="${ROAD_D}"/>
<path class="road-done" d="${ROAD_D}" pathLength="100" stroke-dasharray="${r1(f * 100)} 200"/>
${lite ? '' : milestones}
<!-- hitos reales: commits, tests, pushes y PRs -->
${lite ? '' : marksOf(marks)}
<!-- el campamento al final del camino -->
<g transform="translate(${r1(cx)} ${r1(cy)})"><path class="tent" d="M-16 0 L0 -22 L16 0 Z"/><path class="tent-door" d="M-4 0 L0 -8 L4 0 Z"/><line class="pole thin" x1="0" y1="-22" x2="0" y2="-34"/><path class="flag" d="M0 -34 L10 -31 L0 -28 Z"/></g>
<!-- la fogata del campamento al anochecer -->
<g transform="translate(${r1(cx - 34)} ${r1(cy)})" opacity="${fire.toFixed(2)}"${fire === 0 ? ' display="none"' : ''}>
<line class="log" x1="-9" y1="0" x2="9" y2="-4"/><line class="log" x1="-9" y1="-4" x2="9" y2="0"/>
<path class="flame" d="M0 -3C-7 -8 -4 -15 0 -22C4 -15 7 -8 0 -3Z"/><path class="flame-core" d="M0 -4C-3 -7 -2 -11 0 -14C2 -11 3 -7 0 -4Z"/>
<circle class="smoke" cx="0" cy="-26" r="5"/><circle class="smoke" cx="0" cy="-26" r="5" style="animation-delay: -2.7s"/><circle class="smoke" cx="0" cy="-26" r="5" style="animation-delay: -5.4s"/>
</g>
<!-- dónde va el explorador en el mapa -->
<g class="${pace}" transform="translate(${r1(rx)} ${r1(ry)})"><circle class="marker-pulse" r="12"/><circle class="marker-dot" r="6"/></g>
</svg>
<!-- bruma: el paisaje se funde con la página bajo la conversación -->
<rect y="58%" width="100%" height="42%" fill="url(#rrMist)"/>
${weatherVeil(weather)}
<!-- el explorador, en la viñeta del costado -->
${vignette(pace, shadowLen, shadowDir, weather === 'despejado' ? shadowAlpha : shadowAlpha * 0.4, lite || weather !== 'despejado' ? 0 : fireflies, companions)}
<!-- insignia: siempre a la vista en la esquina -->
${badge(p, pace, label)}
</svg>`
}
