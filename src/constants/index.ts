export const CACHE_KEYS = {
  PRODUCTS_LIST: 'products:list',
} as const;

export const CACHE_TTL = {
  PRODUCTS_LIST: 300, // 5 minutes in seconds (as specified in assignment)
} as const;

export const QUEUE_NAMES = {
  LOW_STOCK_ALERTS: 'low-stock-alerts',
} as const;

export const ALERT_DEDUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
