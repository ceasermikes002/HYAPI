export interface Trade {
  timeMs: number;
  coin: string;
  side: 'B' | 'A'; 
  px: number;
  sz: number;
  fee: number;
  closedPnl: number;
  builder?: string | undefined;
  hash: string;
  oid?: number | undefined;
  tid?: number | undefined;
}

export interface TradeFilter {
  user: string;
  coin?: string | undefined;
  fromMs?: number | undefined;
  toMs?: number | undefined;
  builderOnly?: boolean | undefined;
}
