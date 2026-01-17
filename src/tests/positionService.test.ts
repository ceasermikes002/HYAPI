import { PositionService } from '../services/positionService.js';
import type { IDataSource } from '../datasources/interfaces/index.js';
import type { Trade } from '../domain/trade.js';

// Mock DataSource
class MockDataSource implements IDataSource {
  constructor(private trades: Trade[]) {}
  async getUserFills(user: string, startTime?: number, endTime?: number): Promise<Trade[]> {
    return this.trades.filter(t => 
        (!startTime || t.timeMs >= startTime) && 
        (!endTime || t.timeMs <= endTime)
    );
  }
  async getUserFunding(user: string, startTime: number, endTime?: number): Promise<any[]> { return []; }
  async getUserLedgerUpdates(user: string, startTime: number, endTime?: number): Promise<any[]> { return []; }
}

describe('PositionService', () => {
  it('should reconstruct a simple long position lifecycle', async () => {
    const trades: Trade[] = [
      {
        timeMs: 1000, coin: 'BTC-PERP', side: 'B', px: 50000, sz: 1.0, fee: 0, closedPnl: 0, hash: '1'
      },
      {
        timeMs: 2000, coin: 'BTC-PERP', side: 'A', px: 55000, sz: 1.0, fee: 0, closedPnl: 5000, hash: '2'
      }
    ];

    const service = new PositionService(new MockDataSource(trades));
    const history = await service.getPositionHistory({ user: 'test', coin: 'BTC-PERP' });

    expect(history).toHaveLength(2);
    // Entry
    expect(history[0].netSize).toBe(1.0);
    expect(history[0].avgEntryPx).toBe(50000);
    // Exit (size returns to 0)
    expect(history[1].netSize).toBe(0);
    expect(history[1].avgEntryPx).toBe(0);
  });

  it('should calculate weighted average entry price correctly', async () => {
    const trades: Trade[] = [
      {
        timeMs: 1000, coin: 'ETH-PERP', side: 'B', px: 1000, sz: 1.0, fee: 0, closedPnl: 0, hash: '1'
      },
      {
        timeMs: 2000, coin: 'ETH-PERP', side: 'B', px: 2000, sz: 1.0, fee: 0, closedPnl: 0, hash: '2'
      }
    ];

    const service = new PositionService(new MockDataSource(trades));
    const history = await service.getPositionHistory({ user: 'test', coin: 'ETH-PERP' });

    expect(history).toHaveLength(2);
    // First buy
    expect(history[0].avgEntryPx).toBe(1000);
    // Second buy: (1*1000 + 1*2000) / 2 = 1500
    expect(history[1].avgEntryPx).toBe(1500);
    expect(history[1].netSize).toBe(2.0);
  });

  it('should handle builder-only taint logic correctly', async () => {
    process.env.TARGET_BUILDER = '0xBuilder';
    const trades: Trade[] = [
      {
        timeMs: 1000, coin: 'SOL-PERP', side: 'B', px: 100, sz: 10, fee: 0, closedPnl: 0, hash: '1', builder: '0xBuilder'
      },
      {
        timeMs: 2000, coin: 'SOL-PERP', side: 'A', px: 110, sz: 5, fee: 0, closedPnl: 50, hash: '2', builder: '0xOther' 
      },
      {
        timeMs: 3000, coin: 'SOL-PERP', side: 'A', px: 120, sz: 5, fee: 0, closedPnl: 100, hash: '3', builder: '0xBuilder'
      }
    ];

    const service = new PositionService(new MockDataSource(trades));
    const history = await service.getPositionHistory({ 
        user: 'test', 
        coin: 'SOL-PERP',
        builderOnly: true 
    });

    // Lifecycle:
    // T1: Builder (Clean)
    // T2: Other (Tainted!) -> The whole lifecycle is now tainted? 
    // Wait, the logic is: "if trade.builder !== targetBuilder -> state.isTainted = true"
    // And this state persists until netSize == 0.
    
    expect(history).toHaveLength(3);
    
    // T1: 0xBuilder. Tainted: false (initially false, 0xBuilder matches)
    // Wait, logic check:
    // if (Math.abs(state.netSize) < 1e-9) state.isTainted = false;
    // if (builderOnly && targetBuilder) { if (trade.builder !== targetBuilder) state.isTainted = true; }
    
    // T1: netSize 0 -> clean. Builder matches -> clean.
    expect(history[0].tainted).toBe(false);
    
    // T2: netSize 10. Builder '0xOther' != '0xBuilder'. Tainted -> true.
    expect(history[1].tainted).toBe(true);
    
    // T3: netSize 5. Builder '0xBuilder'. Tainted state persists? Yes, state.isTainted is not reset until size=0.
    expect(history[2].tainted).toBe(true);
  });
});
