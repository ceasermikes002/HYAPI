import type { IDataSource } from '../datasources/interfaces/index.js';
import type { Trade, TradeFilter } from '../domain/trade.js';
import { normalizeTimeRange } from '../utils/time.js';

export class TradeService {
  constructor(private dataSource: IDataSource) {}

  async getTrades(filter: TradeFilter): Promise<Trade[]> {
    const { user, coin, fromMs, toMs, builderOnly } = filter;
    
    const { startTime, endTime } = normalizeTimeRange(fromMs, toMs);

    let trades = await this.dataSource.getUserFills(user, startTime, endTime);

    if (coin) {
      trades = trades.filter(t => t.coin === coin);
    }

    if (builderOnly) {
        const targetBuilder = process.env.TARGET_BUILDER;
        if (targetBuilder) {
             trades = trades.filter(t => t.builder === targetBuilder);
        } else {
             trades = [];
        }
    }

    return trades.sort((a, b) => b.timeMs - a.timeMs);
  }
}
