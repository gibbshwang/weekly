import 'server-only';
import { XMLParser } from 'fast-xml-parser';
import type { Statute, Precedent, StatuteArticle } from '@/types/law';

const BASE_URL = 'https://www.law.go.kr/DRF';
const RATE_LIMIT_MS = 500;
const TIMEOUT_MS = 3000;

let lastCallTime = 0;

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (name) => ['law', 'prec', '조문'].includes(name),
  cdataPropName: '__cdata',
  processEntities: true,
  parseTagValue: false,
});

function getOcKey(): string {
  return process.env.KOREAN_LAW_OC_KEY ?? '';
}

function stripHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && '__cdata' in value) {
    return stripHtml(String((value as Record<string, unknown>).__cdata));
  }
  return stripHtml(String(value));
}

async function rateLimitedFetch(url: string): Promise<string> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < RATE_LIMIT_MS && lastCallTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastCallTime = Date.now();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

export async function searchStatutes(query: string): Promise<Statute[]> {
  const ocKey = getOcKey();
  if (!ocKey) {
    console.error('[koreanLawClient] KOREAN_LAW_OC_KEY is not set');
    return [];
  }

  try {
    const url = `${BASE_URL}/lawSearch.do?OC=${encodeURIComponent(ocKey)}&target=law&type=XML&query=${encodeURIComponent(query)}`;
    const xml = await rateLimitedFetch(url);
    const parsed = parser.parse(xml);

    const laws = parsed?.LawSearch?.law;
    if (!Array.isArray(laws)) return [];

    return laws.map((law: Record<string, unknown>) => ({
      name: String(law['법령명한글'] ?? ''),
      mst: String(law['법령MST'] ?? ''),
      category: String(law['법령구분명'] ?? ''),
      effectiveDate: String(law['시행일자'] ?? ''),
    }));
  } catch (error) {
    console.error('[koreanLawClient] searchStatutes error:', error);
    return [];
  }
}

export async function searchPrecedents(keywords: string[]): Promise<Precedent[]> {
  const ocKey = getOcKey();
  if (!ocKey) {
    console.error('[koreanLawClient] KOREAN_LAW_OC_KEY is not set');
    return [];
  }

  try {
    const query = keywords.join(' ');
    const url = `${BASE_URL}/lawSearch.do?OC=${encodeURIComponent(ocKey)}&target=prec&type=XML&query=${encodeURIComponent(query)}&display=5`;
    const xml = await rateLimitedFetch(url);
    const parsed = parser.parse(xml);

    const precs = parsed?.PrecSearch?.prec;
    if (!Array.isArray(precs)) return [];

    return precs.map((prec: Record<string, unknown>) => ({
      caseNumber: String(prec['사건번호'] ?? ''),
      date: String(prec['선고일자'] ?? ''),
      summary: extractText(prec['판시사항']),
      ruling: extractText(prec['판결요지']),
      precSeq: prec['판례일련번호'] ? String(prec['판례일련번호']) : undefined,
    }));
  } catch (error) {
    console.error('[koreanLawClient] searchPrecedents error:', error);
    return [];
  }
}

export async function getStatuteDetail(mst: string): Promise<StatuteArticle[]> {
  const ocKey = getOcKey();
  if (!ocKey) {
    console.error('[koreanLawClient] KOREAN_LAW_OC_KEY is not set');
    return [];
  }

  try {
    const url = `${BASE_URL}/lawService.do?OC=${encodeURIComponent(ocKey)}&MST=${encodeURIComponent(mst)}&type=XML`;
    const xml = await rateLimitedFetch(url);
    const parsed = parser.parse(xml);

    const articles = parsed?.['법령']?.['조문'];
    if (!Array.isArray(articles)) return [];

    return articles.map((article: Record<string, unknown>) => ({
      articleNumber: String(article['조문번호'] ?? ''),
      articleTitle: String(article['조문제목'] ?? ''),
      articleContent: extractText(article['조문내용']),
    }));
  } catch (error) {
    console.error('[koreanLawClient] getStatuteDetail error:', error);
    return [];
  }
}
