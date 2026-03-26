// ── Signal keys ──

export type SignalKey =
  | 'momentum'
  | 'strength'
  | 'breadth'
  | 'putCall'
  | 'safeHaven'
  | 'volatility'
  | 'credit';

// ── Regime ──

export type RegimeType =
  | 'extreme_fear'
  | 'fear'
  | 'neutral'
  | 'greed'
  | 'extreme_greed';

// ── Single signal reading ──

export interface SignalReading {
  key: SignalKey;
  label: string;
  labelEn: string;
  rawValue: number | null;
  normalizedScore: number; // 0-100, NaN if rawValue null
  direction: RegimeType | null; // regime of this individual signal
  note: string; // human-readable Korean summary
}

// ── Daily snapshot ──

export interface DailyIndexSnapshot {
  date: string; // ISO YYYY-MM-DD
  score: number; // composite 0-100
  regime: RegimeType;
  change: number; // delta from previous day
  vkospiRaw: number | null;
  signals: SignalReading[];
}

// ── Lightweight history point ──

export interface HistoryPoint {
  date: string;
  score: number;
  regime: RegimeType;
}

// ── Forward return metric ──

export interface ForwardReturnMetric {
  avg: number;
  median: number;
  winRate: number;
}

// ── Timing analysis ──

export interface TimingAsset {
  name: string;
  horizon7d: ForwardReturnMetric;
  horizon30d: ForwardReturnMetric;
  horizon90d: ForwardReturnMetric;
  horizon180d: ForwardReturnMetric;
}

export interface TimingAnalysis {
  threshold: number;
  caseCount: number;
  assets: TimingAsset[];
}

// ── Heatmap ──

export interface HeatmapData {
  assets: string[];
  horizons: string[];
  data: Record<string, Record<string, ForwardReturnMetric>>;
}

// ── Historical events ──

export interface HistoricalEvent {
  date: string;
  label?: string;
  score: number;
  regime?: RegimeType;
  forwardReturn30d?: number;
  note: string;
}

export interface HistoricalContext {
  percentile: number;
  similarEvents: HistoricalEvent[];
}
