export interface PnlMetrics {
  realizedPnl: number;
  returnPct: number;
  feesPaid: number;
  tradeCount: number;
  volume: number;
  tainted?: boolean | undefined;
  effectiveCapital?: number | undefined;
}

export interface PnlFilter {
  user: string;
  coin?: string | undefined;
  fromMs?: number | undefined;
  toMs?: number | undefined;
  builderOnly?: boolean | undefined;
  maxStartCapital?: number | undefined;
}
