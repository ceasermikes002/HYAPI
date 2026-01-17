import { PnlService } from './pnlService.js';
import type { LeaderboardEntry, LeaderboardFilter } from '../domain/leaderboard.js';

export class LeaderboardService {
  private users: string[] = [
      '0x53c907b8849b3c4c7c8c454e4c4c954e4c4c954e', 
  ];

  constructor(private pnlService: PnlService) {}

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

            let metricValue = 0;
            switch (filter.metric) {
                case 'pnl': metricValue = pnl.realizedPnl; break;
                case 'returnPct': metricValue = pnl.returnPct; break;
                case 'volume': 
                    metricValue = 0; 
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
