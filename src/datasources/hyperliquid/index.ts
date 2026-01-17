import { Hyperliquid } from 'hyperliquid';
import type { IDataSource } from '../interfaces/index.js';
import type { Trade } from '../../domain/trade.js';

export class HyperliquidDataSource implements IDataSource {
  private sdk: Hyperliquid;

  constructor() {
    this.sdk = new Hyperliquid({ enableWs: false, testnet: false });
  }

  async getUserFills(user: string, startTime?: number, endTime?: number): Promise<Trade[]> {
    try {
      let fills: any[] = [];
      const api = (this.sdk.info as any).generalAPI;
      
      if (startTime) {
         fills = await api.getUserFillsByTime(user, startTime, endTime || Date.now());
      } else {
         fills = await api.getUserFills(user);
      }
      return fills.map((fill: any) => this.mapFillToTrade(fill));
    } catch (error) {
      console.error('Error fetching user fills:', error);
      throw error;
    }
  }

  async getUserFunding(user: string, startTime: number, endTime?: number): Promise<any[]> {
     try {
         return await this.sdk.info.perpetuals.getUserFunding(user, startTime, endTime || Date.now());
     } catch (error) {
         console.error('Error fetching funding:', error);
         return [];
     }
  }

  async getUserLedgerUpdates(user: string, startTime: number, endTime?: number): Promise<any[]> {
      try {
          return await this.sdk.info.perpetuals.getUserNonFundingLedgerUpdates(user, startTime, endTime || Date.now());
      } catch (error) {
          console.error('Error fetching ledger updates:', error);
          return [];
      }
  }

  private mapFillToTrade(fill: any): Trade {
    return {
      timeMs: fill.time,
      coin: fill.coin,
      side: fill.side, 
      px: parseFloat(fill.px),
      sz: parseFloat(fill.sz),
      fee: parseFloat(fill.fee),
      closedPnl: parseFloat(fill.closedPnl),
      builder: fill.builder, 
      hash: fill.hash,
      oid: fill.oid,
      tid: fill.tid
    };
  }
}
