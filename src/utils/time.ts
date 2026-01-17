/**
 * Time-related utility functions.
 */

/**
 * Normalizes a time window.
 * Defaults start to 0 (epoch) and end to current time if not provided.
 */
export const normalizeTimeRange = (fromMs?: number, toMs?: number): { startTime: number; endTime: number } => {
  return {
    startTime: fromMs || 0,
    endTime: toMs || Date.now()
  };
};
