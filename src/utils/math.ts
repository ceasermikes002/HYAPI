/**
 * Mathematical utility functions for financial calculations.
 * Handles floating point precision issues common in JS.
 */

const EPSILON = 1e-9;

/**
 * Checks if a number is effectively zero within epsilon.
 */
export const isZero = (val: number): boolean => {
  return Math.abs(val) < EPSILON;
};

/**
 * Calculates weighted average.
 * Useful for average entry price calculations.
 */
export const weightedAverage = (currentVal: number, currentWeight: number, newVal: number, newWeight: number): number => {
  const totalWeight = Math.abs(currentWeight) + Math.abs(newWeight);
  if (totalWeight === 0) return 0;
  return ((Math.abs(currentWeight) * currentVal) + (Math.abs(newWeight) * newVal)) / totalWeight;
};

/**
 * Safe division that returns 0 instead of Infinity/NaN if denominator is zero.
 */
export const safeDiv = (numerator: number, denominator: number): number => {
  if (isZero(denominator)) return 0;
  return numerator / denominator;
};
