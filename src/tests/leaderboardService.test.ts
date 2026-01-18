import { LeaderboardService } from '../services/leaderboardService.js';
import { PnlService } from '../services/pnlService.js';
import type { IDataSource } from '../datasources/interfaces/index.js';
import type { Trade } from '../domain/trade.js';

class MockDataSource implements IDataSource {
  constructor(
    private trades: Trade[],
    private funding: any[] = [],
    private ledger: any[] = []
  ) {}

  async getUserFills(user: string, startTime?: number, endTime?: number): Promise<Trade[]> {
    return this.trades.filter(
      t =>
        (!startTime || t.timeMs >= startTime) &&
        (!endTime || t.timeMs <= endTime)
    );
  }

  async getUserFunding(user: string, startTime: number, endTime?: number): Promise<any[]> {
    return this.funding;
  }

  async getUserLedgerUpdates(user: string, startTime: number, endTime?: number): Promise<any[]> {
    return this.ledger;
  }
}

describe('LeaderboardService with builder-only taint handling', () => {
  it('excludes users with tainted lifecycles when builderOnly is true', async () => {
    process.env.TARGET_BUILDER = '0xBuilder';

    const trades: Trade[] = [
      {
        timeMs: 1000,
        coin: 'BTC-PERP',
        side: 'B',
        px: 50000,
        sz: 1,
        fee: 0,
        closedPnl: 0,
        hash: '1',
        builder: '0xBuilder'
      },
      {
        timeMs: 2000,
        coin: 'BTC-PERP',
        side: 'A',
        px: 51000,
        sz: 1,
        fee: 0,
        closedPnl: 1000,
        hash: '2',
        builder: '0xOther'
      }
    ];

    const pnlService = new PnlService(new MockDataSource(trades));
    const leaderboard = new LeaderboardService(pnlService);

    const entries = await leaderboard.getLeaderboard({
      metric: 'pnl',
      builderOnly: true
    });

    expect(entries.length).toBe(0);
  });
});
