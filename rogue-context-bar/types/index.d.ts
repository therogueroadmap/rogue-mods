/** One /context category as the bar draws it. */
export type BarRow = {
  name: string
  tokens: number
  /** Theme key /context draws the category in. */
  color: string
  kind: 'used' | 'free' | 'buffer'
}

/** A usage-limit window (`five_hour`, `seven_day`, ...) with its fill and reset. */
export type BarLimit = { kind: string; percentUsed: number; resetsAt: string | null }

/** The last breakdown the bar was drawn from. */
export type BarUsage = {
  rows: BarRow[]
  totalTokens: number
  maxTokens: number
  percent: number
  /**
   * The extras line: model, usage limits, auto-compaction threshold and the
   * estimated cost. Optional: a value stored by 0.1.0 has none of them.
   */
  model?: string | null
  limits?: BarLimit[]
  /** Tokens at which auto-compaction runs; null when it is off. */
  threshold?: number | null
  /** Estimated session cost in US dollars; null where none is kept. */
  usd?: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'rogue-context-bar': { usage: BarUsage | null; isHidden: boolean }
  }
}
