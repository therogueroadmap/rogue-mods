// El sonido del camino: un ambiente suave por fase del día, que el clima
// cambia, y señales breves que la app de escritorio toca por su cuenta. Son
// números, no grabaciones: la app sintetiza cada capa. Suena solo cuando la
// persona activa el parlante de la barra de título, y el mod lo habilita o
// deshabilita con /sound o el botón de la banda.

import type { ThemeSound } from 'claude-code'

import type { Weather } from './scene'

type Layers = NonNullable<ThemeSound['ambience']>['layers']
type Layer = Layers[number]

// ─── Capas del ambiente ──────────────────────────────────────────────

/** Pájaros: notas agudas y breves que caen al azar. */
const birds = (rate: number, gain: number): Layer => ({
  wave: 'sine',
  notes: ['E6', 'G6', 'A6', 'B6', 'D7'],
  scatter: rate,
  glide: 3,
  attack: 0.01,
  release: 0.14,
  gain,
  pan: 0.35,
})

/** Viento: ruido rosa filtrado que respira despacio. */
const wind = (gain: number, from = 500, to = 1100): Layer => ({
  wave: 'pink',
  drone: true,
  gain,
  filter: { type: 'lowpass', hz: from, to },
})

/** Brisa grave de la tarde. */
const breeze = (gain: number): Layer => ({ wave: 'brown', drone: true, gain, filter: { type: 'lowpass', hz: 300, to: 600 } })

/** Grillos: un trino agudo con trémolo rápido. */
const crickets = (rate: number, gain: number): Layer => ({
  wave: 'sine',
  notes: [4200, 4500],
  scatter: rate,
  attack: 0.01,
  release: 0.3,
  tremolo: { hz: 26, depth: 0.9 },
  gain,
  pan: -0.4,
})

/** La fogata del campamento: chasquidos de leña. */
const fire = (gain: number): Layer => ({ wave: 'crackle', drone: true, gain, filter: { type: 'lowpass', hz: 2600 } })

/** Lluvia: un siseo continuo y gotas sueltas. */
const rain = (gain: number): Layer => ({ wave: 'pink', drone: true, gain, filter: { type: 'highpass', hz: 1200 } })
const drops = (rate: number, gain: number): Layer => ({ wave: 'crackle', scatter: rate, attack: 0.002, release: 0.06, gain })

/** Truenos lejanos: ruido grave que crece y se apaga, de vez en cuando. */
const thunder: Layer = { wave: 'brown', scatter: 0.04, attack: 0.4, release: 3.5, gain: 0.5, filter: { type: 'lowpass', hz: 160 } }

/**
 * El ambiente de cada fase, de Alba a Anochecer: el viento de base y lo que
 * vive en cada hora. Sin acordes sostenidos, que cansan a la larga. La app
 * nunca sube el volumen de una capa, así que van audibles pero por debajo de
 * la mitad.
 */
const PHASE_LAYERS: Layer[][] = [
  [wind(0.2), birds(0.7, 0.32)],
  [wind(0.22), birds(0.5, 0.3)],
  [wind(0.3, 700, 1400), birds(0.25, 0.24)],
  [wind(0.26), breeze(0.22)],
  [wind(0.22, 400, 800), crickets(1.2, 0.2)],
  [wind(0.18, 300, 700), fire(0.34), crickets(1.4, 0.18)],
]

const isBird = (layer: Layer): boolean => 'notes' in layer && layer.notes[0] === 'E6'

// ─── Señales ─────────────────────────────────────────────────────────

const CUES: NonNullable<ThemeSound['cues']> = {
  // Envías: un paso firme sobre el camino.
  send: { layers: [{ wave: 'bell', notes: ['G5'], release: 0.5, gain: 0.4 }] },
  // Una herramienta: un roce breve, casi nada.
  tool: { layers: [{ wave: 'sine', notes: ['C6'], attack: 0.005, release: 0.08, gain: 0.14 }] },
  // Claude termina: tres notas que suben.
  done: { layers: [{ wave: 'bell', notes: ['E5', 'G5', 'C6'], step: 0.12, release: 0.7, gain: 0.45 }], reverb: 0.25 },
  // Te necesita: dos notas que preguntan.
  ask: { layers: [{ wave: 'triangle', notes: ['A5', 'E5'], step: 0.16, release: 0.35, gain: 0.4 }] },
  // Algo falló: dos notas que bajan, suaves.
  error: { layers: [{ wave: 'triangle', notes: ['D4', 'A3'], step: 0.14, release: 0.4, gain: 0.38 }] },
  // Acampar: el amanecer en cuatro notas.
  compact: { layers: [{ wave: 'bell', notes: ['C5', 'G5', 'C6', 'E6'], step: 0.16, release: 0.9, gain: 0.45 }], reverb: 0.3 },
  // Un clic en el paisaje: una nota de la escala, más aguda hacia la derecha.
  click: { layers: [{ wave: 'bell', notes: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'], release: 0.6, gain: 0.35 }] },
}

/** El sonido de una fase con su clima: hasta 8 capas de ambiente y las señales. */
export const soundOf = (phase: number, weather: Weather): ThemeSound => {
  const base = PHASE_LAYERS[Math.max(0, Math.min(PHASE_LAYERS.length - 1, phase))] ?? []
  const isWet = weather === 'lluvia' || weather === 'tormenta'
  const layers: Layer[] = [
    ...base.filter(layer => !(isWet && isBird(layer))),
    ...(weather === 'nublado' ? [wind(0.22, 300, 700)] : []),
    ...(isWet ? [rain(weather === 'tormenta' ? 0.32 : 0.26), drops(weather === 'tormenta' ? 5 : 3, 0.2)] : []),
    ...(weather === 'tormenta' ? [thunder] : []),
  ].slice(0, 8)

  return { ambience: { layers, reverb: 0.2 }, cues: CUES }
}
