export interface LeaderboardEntry {
  rank: number;
  user: string;
  metricValue: number;
  tradeCount: number;
  tainted: boolean;
}

export interface LeaderboardFilter {
  coin?: string | undefined;
  fromMs?: number | undefined;
  toMs?: number | undefined;
  metric: 'volume' | 'pnl' | 'returnPct';
  builderOnly?: boolean | undefined;
  maxStartCapital?: number | undefined;
  users?: string[] | undefined;
}
