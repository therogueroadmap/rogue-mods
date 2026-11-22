export type Trail = {
  /** Fase del día, 0 a 5: Alba, Mañana, Mediodía, Tarde, Atardecer, Anochecer. */
  phase: number
  /** Porcentaje de la ventana de contexto usado; null antes de la primera respuesta. */
  percent: number | null
}

/** Qué hace el explorador: camina mientras Claude trabaja y espera cuando Claude necesita a la persona. */
export type Pace = 'explora' | 'espera'

/** Una fila del desglose de /context: categoría, tokens, color del tema y tipo. */
export type LedgerRow = { name: string; tokens: number; color: string; kind: 'used' | 'free' | 'buffer' | 'deferred' }

/** Lo que la banda muestra además del camino: el desglose del contexto, los límites de uso y el costo. */
export type Ledger = {
  /** Tokens usados y ventana, como la línea de estado (`tokens` / `window`). */
  tokens: number | null
  window: number
  /** Filas del desglose; vacío si no se pudo calcular. */
  rows: LedgerRow[]
  /** La ventana contra la que mide el desglose (puede ser menor que `window`). */
  max: number
  /** Tokens a los que corre la autocompactación; null si está apagada. */
  threshold: number | null
  model: string | null
  /** Ventanas de límite de uso (`five_hour`, `seven_day`, …) con su % y reinicio. */
  limits: { kind: string; percentUsed: number; resetsAt: string | null }[]
  /** Costo estimado en dólares; null donde no hay registro. */
  usd: number | null
}

/** Un hito real del viaje: un commit, tests que pasan, un push o un PR. */
export type MarkKind = 'commit' | 'tests' | 'pr' | 'push'

/** El clima sigue al trabajo: fallos seguidos lo nublan, un límite de uso alto trae tormenta. */
export type Weather = 'despejado' | 'nublado' | 'lluvia' | 'tormenta'

/** Un subagente que acompaña al explorador mientras trabaja. */
export type Companion = { id: string; type: string }

/** Qué cuenta una línea de la bitácora. */
export type EntryKind = MarkKind | 'fase' | 'amanecer' | 'clima' | 'compañero' | 'acampada'

/** Una línea de la bitácora: cuándo, en qué punto del camino y qué pasó. */
export type Entry = { at: number; percent: number; kind: EntryKind; label: string }

declare module 'claude-code' {
  interface PluginState {
    'rogue-road': {
      trail: Trail
      pace: Pace
      isBandHidden: boolean
      isCampPending: boolean
      ledger: Ledger | null
      isDetailed: boolean
      journal: Entry[]
      weather: Weather
      recent: boolean[]
      companions: Companion[]
      isSoundOn: boolean
    }
  }
}
