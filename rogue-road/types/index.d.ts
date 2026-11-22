export type Trail = {
  /** Fase del día, 0 a 5: Alba, Mañana, Mediodía, Tarde, Atardecer, Anochecer. */
  phase: number
  /** Porcentaje de la ventana de contexto usado; null antes de la primera respuesta. */
  percent: number | null
}

/** Qué hace el explorador: camina mientras Claude trabaja y espera cuando Claude necesita a la persona. */
export type Pace = 'explora' | 'espera'

declare module 'claude-code' {
  interface PluginState {
    'rogue-road': { trail: Trail; pace: Pace; isBandHidden: boolean; isCampPending: boolean }
  }
}
