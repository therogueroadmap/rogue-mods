export type Eye = {
  /** Etapa 0 a 3: Ittomoe, Nitomoe, Santomoe, Mangekyō. */
  stage: number
  /** Porcentaje de la ventana de contexto usado; null antes de la primera respuesta. */
  percent: number | null
}

declare module 'claude-code' {
  interface PluginState {
    sharingan: { eye: Eye; isBandHidden: boolean; isKaiPending: boolean }
  }
}
