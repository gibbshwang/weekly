import type { SignalKey, RegimeType } from '../types/kfgi';

/**
 * Generate a human-readable Korean note for a signal reading.
 */
export function generateSignalNote(
  key: SignalKey,
  rawValue: number | null,
  _normalizedScore: number,
  direction: RegimeType | null,
): string {
  if (rawValue === null) return '데이터 없음';

  const isFearish = direction === 'extreme_fear' || direction === 'fear';

  switch (key) {
    case 'momentum': {
      const pct = Math.abs(rawValue).toFixed(1);
      return rawValue < 0
        ? `KOSPI가 125일 이동평균 ${pct}% 하회`
        : `KOSPI가 125일 이동평균 ${pct}% 상회`;
    }
    case 'strength': {
      const pct = Math.round(rawValue * 100);
      return isFearish
        ? `KOSPI+KOSDAQ 52주 신고가/신저가 비율 ${pct}%로 하락`
        : `KOSPI+KOSDAQ 52주 신고가/신저가 비율 ${pct}%로 양호`;
    }
    case 'breadth': {
      const pct = Math.round(rawValue * 100);
      return isFearish
        ? `상승 종목 비율 ${pct}%로 하락 종목 우위`
        : `상승 종목 비율 ${pct}%로 상승 종목 우위`;
    }
    case 'putCall': {
      const val = rawValue.toFixed(2);
      return isFearish
        ? `KOSPI200 풋/콜 비율 ${val}로 헤지 수요 증가`
        : `KOSPI200 풋/콜 비율 ${val}로 안정적`;
    }
    case 'safeHaven': {
      const pp = Math.abs(rawValue).toFixed(1);
      return rawValue < 0
        ? `KOSPI 대비 국채 ${pp}%p 상대 강세`
        : `KOSPI가 국채 대비 ${pp}%p 상대 강세`;
    }
    case 'volatility': {
      const val = rawValue.toFixed(1);
      return isFearish
        ? `VKOSPI ${val}로 높은 변동성`
        : `VKOSPI ${val}로 안정적 수준`;
    }
    case 'credit': {
      const bps = Math.round(rawValue);
      return isFearish
        ? `회사채-국고채 스프레드 ${bps}bp로 확대 중`
        : `회사채-국고채 스프레드 ${bps}bp로 안정적`;
    }
  }
}
