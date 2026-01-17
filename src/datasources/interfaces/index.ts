import type { Trade } from '../../domain/trade.js';

export interface IDataSource {
  getUserFills(user: string, startTime?: number, endTime?: number): Promise<Trade[]>;
  getUserFunding(user: string, startTime: number, endTime?: number): Promise<any[]>;
  getUserLedgerUpdates(user: string, startTime: number, endTime?: number): Promise<any[]>;
}
