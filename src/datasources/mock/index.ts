import type { IDataSource } from '../interfaces/index.js';
import type { Trade } from '../../domain/trade.js';

export class MockDataSource implements IDataSource {
  async getUserFills(user: string, startTime?: number, endTime?: number): Promise<Trade[]> {
    return [
      {
        timeMs: 1000,
        coin: 'BTC',
        side: 'B',
        px: 50000,
        sz: 1,
        fee: 5,
        closedPnl: 0,
        builder: '0xMockBuilder',
        hash: '0x1',
        oid: 1,
        tid: 1
      },
      {
        timeMs: 2000,
        coin: 'BTC',
        side: 'A', // Sell
        px: 51000,
        sz: 1,
        fee: 5,
        closedPnl: 1000,
        builder: '0xOtherBuilder',
        hash: '0x2',
        oid: 2,
        tid: 2
      }
    ];
  }

  async getUserFunding(user: string, startTime: number, endTime?: number): Promise<any[]> {
    return [];
  }

  async getUserLedgerUpdates(user: string, startTime: number, endTime?: number): Promise<any[]> {
    return [];
  }
}
