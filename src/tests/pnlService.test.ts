import { PnlService } from '../services/pnlService.js';
import type { IDataSource } from '../datasources/interfaces/index.js';
import type { Trade } from '../domain/trade.js';

// Mock DataSource
class MockDataSource implements IDataSource {
  constructor(
      private trades: Trade[], 
      private funding: any[] = [], 
      private ledger: any[] = []
  ) {}
  async getUserFills(user: string, startTime?: number, endTime?: number): Promise<Trade[]> {
    return this.trades.filter(t => 
        (!startTime || t.timeMs >= startTime) && 
        (!endTime || t.timeMs <= endTime)
    );
  }
  async getUserFunding(user: string, startTime: number, endTime?: number): Promise<any[]> { return this.funding; }
  async getUserLedgerUpdates(user: string, startTime: number, endTime?: number): Promise<any[]> { return this.ledger; }
}

describe('PnlService', () => {
  it('should calculate basic PnL metrics', async () => {
    const trades: Trade[] = [
      {
        timeMs: 1000, coin: 'BTC-PERP', side: 'B', px: 50000, sz: 1.0, fee: 10, closedPnl: 0, hash: '1'
      },
      {
        timeMs: 2000, coin: 'BTC-PERP', side: 'A', px: 55000, sz: 1.0, fee: 10, closedPnl: 5000, hash: '2'
      }
    ];

    const service = new PnlService(new MockDataSource(trades));
    const metrics = await service.getPnl({ user: 'test' });

    expect(metrics.realizedPnl).toBe(5000);
    expect(metrics.feesPaid).toBe(20);
    expect(metrics.tradeCount).toBe(2);
    // Volume: 1*50000 + 1*55000 = 105000
    expect(metrics.volume).toBe(105000);
  });

  it('should filter trades by coin', async () => {
     const trades: Trade[] = [
      { timeMs: 1, coin: 'A', side: 'B', px: 1, sz: 1, fee: 0, closedPnl: 10, hash: '1' },
      { timeMs: 2, coin: 'B', side: 'B', px: 1, sz: 1, fee: 0, closedPnl: 20, hash: '2' }
    ];
    const service = new PnlService(new MockDataSource(trades));
    const metrics = await service.getPnl({ user: 'test', coin: 'A' });
    
    expect(metrics.realizedPnl).toBe(10);
    expect(metrics.tradeCount).toBe(1);
  });

  it('should approximate effective capital correctly from history', async () => {
     // Scenario: 
     // T0: Deposit 1000
     // T1: Trade PnL +100
     // T2: Start of Window
     
     const pastTrades: Trade[] = [
         { timeMs: 50, coin: 'A', side: 'A', px: 1, sz: 1, fee: 0, closedPnl: 100, hash: 'p1' }
     ];
     const ledger = [
         { time: 10, amount: '1000' } // Deposit
     ];
     
     // Window Trades (not used for equity, but for result PnL)
     const windowTrades: Trade[] = [
          { timeMs: 150, coin: 'A', side: 'A', px: 1, sz: 1, fee: 0, closedPnl: 50, hash: 'w1' }
     ];

     // We mock the datasource to return different things based on time?
     // Our MockDataSource simple filter logic handles time.
     
     const service = new PnlService(new MockDataSource([...pastTrades, ...windowTrades], [], ledger));
     
     const metrics = await service.getPnl({ 
         user: 'test', 
         fromMs: 100 
     });

     // Equity at T=100:
     // Deposits (1000) + Past Realized (100) = 1100
     expect(metrics.effectiveCapital).toBe(1100);
     
     // Result PnL (Window only): 50
     expect(metrics.realizedPnl).toBe(50);
     
     // ROI: 50 / 1100
     expect(metrics.returnPct).toBeCloseTo((50/1100)*100);
  });
});
