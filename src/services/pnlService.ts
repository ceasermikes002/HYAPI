import type { IDataSource } from '../datasources/interfaces/index.js';
import type { PnlMetrics, PnlFilter } from '../domain/pnl.js';
import { normalizeTimeRange } from '../utils/time.js';
import { safeDiv } from '../utils/math.js';

/**
 * Service responsible for calculating Profit and Loss (PnL) metrics.
 * 
 * ARCHITECTURAL NOTE:
 * Calculating accurate PnL in a derivative market, especially with "Builder Only" filtering,
 * presents significant challenges regarding "Effective Capital" determination.
 * 
 * The core complexity lies in normalizing Return %:
 * Return % = Realized PnL / Effective Capital
 * 
 * Ideally, Effective Capital is the time-weighted equity during the trading period.
 * However, since we are reconstructing state from public ledger data without access to 
 * internal margin engine snapshots, we must approximate.
 * 
 * APPROXIMATION STRATEGY:
 * We reconstruct the user's equity at `startTime` by replaying the entire history of:
 * 1. Deposits/Withdrawals (Ledger Updates)
 * 2. Realized PnL from Trades
 * 3. Funding Payments
 * 4. Fees
 * 
 * TRADEOFFS:
 * - Accuracy vs Latency: Replaying full history for every request is O(N) where N is total history.
 *   For high-frequency traders, this will degrade performance.
 *   Optimization (Future): Implement snapshotting or incremental aggregation in a DB.
 * - Builder Attribution: Taint analysis here is simplified. A rigorous implementation would
 *   need to track if a position was *ever* touched by a non-builder trade during its lifecycle.
 */
export class PnlService {
  constructor(private dataSource: IDataSource) {}

  /**
   * Calculates PnL metrics for a given filter.
   * 
   * @param filter - Criteria for PnL calculation
   * @returns PnlMetrics object containing realized PnL, ROI, and volume.
   */
  async getPnl(filter: PnlFilter): Promise<PnlMetrics> {
    const { user, coin, fromMs, toMs, builderOnly, maxStartCapital } = filter;
    
    const { startTime, endTime } = normalizeTimeRange(fromMs, toMs);
    
    const trades = await this.dataSource.getUserFills(user, startTime, endTime);
    
    let filteredTrades = trades;
    if (coin) filteredTrades = filteredTrades.filter(t => t.coin === coin);
    
    let isTainted = false;
    const targetBuilder = process.env.TARGET_BUILDER;

    if (builderOnly && targetBuilder) {
        const { filtered, tainted } = this.applyBuilderLifecycleFilter(filteredTrades, targetBuilder);
        filteredTrades = filtered;
        isTainted = tainted;
    }
    
    // Aggregate Metrics (O(M) where M is trades in window)
    const realizedPnl = filteredTrades.reduce((sum, t) => sum + t.closedPnl, 0);
    const feesPaid = filteredTrades.reduce((sum, t) => sum + t.fee, 0);
    const tradeCount = filteredTrades.length;
    const volume = filteredTrades.reduce((sum, t) => sum + (t.sz * t.px), 0);
    
    let effectiveCapital = 1;
    
    // EQUITY RECONSTRUCTION (The heavy lifting)
    // If a specific start time is requested, we must calculate the equity at that moment.
    if (startTime > 0) {
        try {
            // Parallel fetch of all historical components up to startTime
            // PERFORMANCE WARNING: This can be heavy for accounts with long histories.
            const [pastTrades, pastFunding, pastLedger] = await Promise.all([
                this.dataSource.getUserFills(user, 0, startTime),
                this.dataSource.getUserFunding(user, 0, startTime),
                this.dataSource.getUserLedgerUpdates(user, 0, startTime)
            ]);
            
            const pastRealizedPnl = pastTrades.reduce((sum, t) => sum + t.closedPnl, 0);
            const pastFees = pastTrades.reduce((sum, t) => sum + t.fee, 0);
            const pastFundingPnl = pastFunding.reduce((sum, f) => sum + parseFloat(f.amount || '0'), 0);
            const pastDeposits = pastLedger.reduce((sum, l) => sum + parseFloat(l.amount || '0'), 0);
            
            let equityAtFromMs = pastDeposits + pastRealizedPnl - pastFees + pastFundingPnl;
            
            // FAIR COMPETITION LOGIC
            // To normalize ROI comparisons between whales and smaller traders, we support 
            // capping the starting capital denominator.
            if (maxStartCapital !== undefined) {
                effectiveCapital = Math.min(equityAtFromMs, maxStartCapital);
            } else {
                effectiveCapital = equityAtFromMs;
            }
        } catch (e) {
            console.error("[PnlService] Error calculating historical equity. Defaulting to 1.", e);
        }
    } else {
         // If calculating all-time PnL, effective capital is ambiguous.
         // We use maxStartCapital if provided, otherwise default to 1 to avoid DivisionByZero.
         if (maxStartCapital !== undefined) effectiveCapital = maxStartCapital;
         else effectiveCapital = 1; 
    }

    // Safety: Prevent division by zero or negative capital anomalies from breaking the API
    if (effectiveCapital <= 0) effectiveCapital = 1;

    const returnPct = safeDiv(realizedPnl, effectiveCapital) * 100;

    return {
      realizedPnl,
      returnPct,
      feesPaid,
      tradeCount,
      volume,
      tainted: isTainted,
      effectiveCapital
    };
  }

  private applyBuilderLifecycleFilter(trades: any[], targetBuilder: string): { filtered: any[]; tainted: boolean } {
    if (!trades.length) {
        return { filtered: [], tainted: false };
    }

    const sorted = [...trades].sort((a, b) => a.timeMs - b.timeMs);
    const lifecycleTainted = new Map<string, Set<number>>();

    const isZero = (v: number) => Math.abs(v) < 1e-9;

    const stateMapFirst = new Map<string, { netSize: number; lifecycleId: number }>();

    for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        const coinKey = t.coin;
        let state = stateMapFirst.get(coinKey) || { netSize: 0, lifecycleId: 0 };

        if (isZero(state.netSize)) {
            state.lifecycleId += 1;
        }

        const lifecycleId = state.lifecycleId;
        const lk = `${coinKey}#${lifecycleId}`;

        if (t.builder && t.builder !== targetBuilder) {
            let set = lifecycleTainted.get(coinKey);
            if (!set) {
                set = new Set<number>();
                lifecycleTainted.set(coinKey, set);
            }
            set.add(lifecycleId);
        }

        const tradeSize = t.side === 'B' ? t.sz : -t.sz;
        state.netSize += tradeSize;
        if (isZero(state.netSize)) {
            state.netSize = 0;
        }
        stateMapFirst.set(coinKey, state);
    }

    const taintedLifecycleKeys = new Set<string>();
    for (const [coinKey, set] of lifecycleTainted.entries()) {
        for (const id of set.values()) {
            taintedLifecycleKeys.add(`${coinKey}#${id}`);
        }
    }

    const result: any[] = [];
    let tainted = false;

    const stateMapSecond = new Map<string, { netSize: number; lifecycleId: number }>();

    for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        const coinKey = t.coin;
        let state = stateMapSecond.get(coinKey) || { netSize: 0, lifecycleId: 0 };

        if (isZero(state.netSize)) {
            state.lifecycleId += 1;
        }

        const lifecycleId = state.lifecycleId;
        const lk = `${coinKey}#${lifecycleId}`;

        if (taintedLifecycleKeys.has(lk)) {
            tainted = true;
        } else if (t.builder === targetBuilder) {
            result.push(t);
        }

        const tradeSize = t.side === 'B' ? t.sz : -t.sz;
        state.netSize += tradeSize;
        if (isZero(state.netSize)) {
            state.netSize = 0;
        }
        stateMapSecond.set(coinKey, state);
    }

    return { filtered: result, tainted };
  }
}
