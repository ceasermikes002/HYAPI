export interface PositionState {
  timeMs: number;
  coin: string;
  netSize: number;
  avgEntryPx: number;
  tainted?: boolean | undefined;
}

export interface PositionHistoryFilter {
  user: string;
  coin?: string | undefined;
  fromMs?: number | undefined;
  toMs?: number | undefined;
  builderOnly?: boolean | undefined;
}
