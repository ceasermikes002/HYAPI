import { PnlService } from './pnlService.js';
import type { LeaderboardEntry, LeaderboardFilter } from '../domain/leaderboard.js';

export class LeaderboardService {
  private users: string[] = [];

  constructor(private pnlService: PnlService) {
      // Load default users from environment
      if (process.env.TEST_USERS) {
          this.users = process.env.TEST_USERS.split(',').map(u => u.trim()).filter(u => u.length > 0);
      }
      
      // Add a default if empty for testing
      if (this.users.length === 0) {
          this.users.push('0x53c907b8849b3c4c7c8c454e4c4c954e4c4c954e');
      }
  }

  addUser(user: string) {
      if (!this.users.includes(user)) this.users.push(user);
  }

  async getLeaderboard(filter: LeaderboardFilter): Promise<LeaderboardEntry[]> {
    const results = await Promise.all(this.users.map(async (user) => {
        try {
            const pnl = await this.pnlService.getPnl({
                user,
                coin: filter.coin,
                fromMs: filter.fromMs,
                toMs: filter.toMs,
                builderOnly: filter.builderOnly,
                maxStartCapital: filter.maxStartCapital
            });

            if (filter.builderOnly && pnl.tainted) {
                return null;
            }

            let metricValue = 0;
            switch (filter.metric) {
                case 'pnl':
                    metricValue = pnl.realizedPnl;
                    break;
                case 'returnPct':
                    metricValue = pnl.returnPct;
                    break;
                case 'volume':
                    metricValue = pnl.volume;
                    break;
            }

            return {
                rank: 0,
                user,
                metricValue,
                tradeCount: pnl.tradeCount,
                tainted: !!pnl.tainted
            };
        } catch (e) {
            console.error(`Error processing user ${user}`, e);
            return null;
        }
    }));

    const validResults = results.filter((r): r is LeaderboardEntry => r !== null);
    
    validResults.sort((a, b) => b.metricValue - a.metricValue);
    
    validResults.forEach((r, i) => r.rank = i + 1);

    return validResults;
  }
}
