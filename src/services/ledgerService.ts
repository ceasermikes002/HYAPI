import type { IDataSource } from '../datasources/interfaces/index.js';

export class LedgerService {
  constructor(private dataSource: IDataSource) {}

  async getDeposits(user: string, fromMs?: number, toMs?: number) {
      const startTime = fromMs || 0;
      const endTime = toMs || Date.now();
      
      const updates = await this.dataSource.getUserLedgerUpdates(user, startTime, endTime);
      
      const deposits = updates.filter((u: any) => {
          // Check for deposit type or positive amount
          // Ledger update typically: { time, amount, type: 'deposit' | 'withdraw' ... }
          const amt = parseFloat(u.amount);
          return amt > 0; 
      }).map((u: any) => ({
          timeMs: u.time,
          amount: parseFloat(u.amount),
          hash: u.hash
      }));

      const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
      
      return {
          totalDeposits,
          depositCount: deposits.length,
          deposits
      };
  }
}
