export type Chakra = {
  /** Etapa 0 a 4: Rasenshuriken, inestable, Ōdama, Rasengan, incompleto. */
  stage: number
  /** Porcentaje de la ventana de contexto usado; null antes de la primera respuesta. */
  percent: number | null
}

declare module 'claude-code' {
  interface PluginState {
    rasenshuriken: { chakra: Chakra; isBandHidden: boolean }
  }
}
