/**
 * Data normalization utilities.
 */

/**
 * Normalizes a wallet address to lowercase for consistent comparison.
 */
export const normalizeAddress = (address: string): string => {
  return address.toLowerCase();
};

/**
 * Normalizes a coin symbol (e.g. ensures uppercase).
 */
export const normalizeCoin = (coin: string): string => {
  return coin.toUpperCase();
};
