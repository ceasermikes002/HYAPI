import type { IDataSource } from '../datasources/interfaces/index.js';
import type { PositionState, PositionHistoryFilter } from '../domain/position.js';
import { normalizeTimeRange } from '../utils/time.js';
import { weightedAverage, isZero } from '../utils/math.js';

/**
 * Service responsible for reconstructing position state from trade history.
 * 
 * ALGORITHMIC COMPLEXITY: O(N log N) due to sorting, then O(N) linear scan.
 * 
 * CORE LOGIC:
 * Since the public API provides trade fills but not historical position snapshots,
 * we must deterministically replay the ledger to reconstruct the state at any point in time.
 * 
 * STATE MACHINE:
 * - State: { NetSize, AvgEntryPrice, TaintStatus }
 * - Transitions: Triggered by each trade fill.
 * 
 * LIFECYCLE MANAGEMENT:
 * A "Position Lifecycle" is defined from the moment NetSize becomes non-zero until it returns to zero.
 * 
 * TAINT ANALYSIS (Builder-Only Mode):
 * If a user interacts with a position via a non-target builder (e.g., standard Hyperliquid UI)
 * during a lifecycle, that entire lifecycle is marked as "tainted".
 * This ensures leaderboard integrity for builder-specific competitions.
 */
export class PositionService {
  constructor(private dataSource: IDataSource) {}

  /**
   * Reconstructs the position history for a user.
   * 
   * @param filter - Filter criteria including time range and builder targeting.
   * @returns Array of position states over time.
   */
  async getPositionHistory(filter: PositionHistoryFilter): Promise<PositionState[]> {
    const { user, coin, fromMs, toMs, builderOnly } = filter;
    
    // FETCH STRATEGY:
    // We must fetch ALL history starting from t=0 (or a known snapshot) to correctly 
    // calculate AvgEntryPrice and NetSize. Partial fetching is not sufficient 
    // because position state is path-dependent.
    // Optimization: In a production DB, we would store periodic snapshots.
    
    // Only 'toMs' matters for the fetch limit, we always start from 0 for reconstruction.
    const { endTime } = normalizeTimeRange(0, toMs);
    const allTrades = await this.dataSource.getUserFills(user, 0, endTime);
    
    let trades = allTrades;
    
    // FILTERING:
    // If analyzing a specific coin, we can safely filter early as cross-margin 
    // impacts do not affect the *size* or *entry price* of the specific position 
    // (though they affect liquidation price, which we are not calculating here).
    if (coin) {
      trades = trades.filter(t => t.coin === coin);
    }
    
    // CRITICAL: Chronological order is mandatory for state reconstruction.
    trades.sort((a, b) => a.timeMs - b.timeMs);

    const history: PositionState[] = [];
    const targetBuilder = process.env.TARGET_BUILDER;
    
    // Multi-coin state tracker
    const stateMap = new Map<string, { netSize: number, avgEntryPx: number, isTainted: boolean }>();

    for (const trade of trades) {
        let state = stateMap.get(trade.coin) || { netSize: 0, avgEntryPx: 0, isTainted: false };
        
        // LIFECYCLE START CHECK
        // If net size is effectively zero, we are starting a clean lifecycle.
        // Reset taint status.
        if (isZero(state.netSize)) {
            state.isTainted = false;
        }

        // TAINT CHECK
        // If we are in builder-only mode, check attribution.
        if (builderOnly && targetBuilder) {
             if (trade.builder !== targetBuilder) {
                 state.isTainted = true;
             }
        }
        
        const tradeSize = trade.side === 'B' ? trade.sz : -trade.sz; 
        
        // AVERAGE ENTRY PRICE LOGIC (Weighted Average)
        // Only updates when increasing the position size (opening/adding).
        // Closing/Reducing does not change the entry price of the remaining position.
        // Logic: Is the trade direction same as current position?
        const isOpening = (state.netSize >= 0 && tradeSize > 0) || (state.netSize <= 0 && tradeSize < 0);
        
        if (isOpening) {
            // Calculate new weighted average entry price
            // Current State: state.netSize @ state.avgEntryPx
            // New Trade: trade.sz @ trade.px
            state.avgEntryPx = weightedAverage(state.avgEntryPx, state.netSize, trade.px, trade.sz);
        }
        
        state.netSize += tradeSize;
        
        // Floating Point Safety
        if (isZero(state.netSize)) {
            state.netSize = 0;
            state.avgEntryPx = 0;
        }

        stateMap.set(trade.coin, state);

        // OUTPUT FILTER
        // Only emit states within the requested time window.
        if ((!fromMs || trade.timeMs >= fromMs) && (!toMs || trade.timeMs <= toMs)) {
             history.push({
                timeMs: trade.timeMs,
                coin: trade.coin,
                netSize: state.netSize,
                avgEntryPx: state.avgEntryPx,
                tainted: builderOnly ? state.isTainted : undefined
            });
        }
    }
    
    return history;
  }
}
