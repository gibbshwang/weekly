/**
 * Central configuration constants for K-FGI calculations.
 *
 * All "magic numbers" extracted here so they can be tuned
 * without hunting through business logic.
 */

// ── Score similarity & case matching ──

/** Points above/below current score to consider "similar" */
export const SCORE_SIMILARITY_RANGE = 10;

/** Number of representative cases to display in StoryCards */
export const SIMILAR_CASES_DISPLAY_COUNT = 3;

// ── Signal thresholds ──

/** K-FGI score at or below which a day qualifies as a buy signal */
export const BUY_THRESHOLD = 40;

/** K-FGI score at or above which a day qualifies as a sell signal */
export const SELL_THRESHOLD = 60;

// ── History ──

/** Number of recent trading days shown in the 30-day sparkline */
export const HISTORY_LOOKBACK_DAYS = 30;

// ── Time range to trading days mapping ──

export const RANGE_TRADING_DAYS = {
  '1M': 21,
  '3M': 63,
  '6M': 126,
  '1Y': 250,
} as const;

// ── Yahoo Finance data ranges per signal ──

export const SIGNAL_DATA_RANGES: Record<string, string> = {
  momentum: '1y',
  safeHaven: '3mo',
  volatility: '3mo',
  strength: '1y',
  breadth: '3mo',
  putCall: '3mo',
  credit: '6mo',
};

// ── Calculation parameters ──

/** Trading days per year (for annualizing volatility etc.) */
export const TRADING_DAYS_PER_YEAR = 252;

/** Days in the momentum simple moving average */
export const MOMENTUM_SMA_DAYS = 125;

/** Days for volatility and breadth/safeHaven return windows */
export const VOLATILITY_WINDOW_DAYS = 20;

/** Days for credit spread return calculation */
export const CREDIT_RETURN_DAYS = 60;

/** Max calendar days to search forward for a trading-day price */
export const FORWARD_PRICE_SEARCH_DAYS = 5;

/** Minimum days between threshold events to avoid clustering */
export const EVENT_COOLDOWN_DAYS = 5;

/** Minimum days between similar case selections */
export const MIN_DAYS_BETWEEN_CASES = 30;

// ── Yahoo Finance symbols ──

export const YAHOO_SYMBOLS = {
  KOSPI: '^KS11',
  KOSDAQ: '^KQ11',
  BTC: 'BTC-USD',
  Gold: 'GC=F',
  KODEX200: '069500.KS',
  KODEXInverse: '114800.KS',
  GovtBond: '148070.KS',
  CorpBond: '411060.KS',
} as const;
