import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Statute, Precedent, StatuteArticle } from '@/types/law';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to create a Response from XML string
function xmlResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}

beforeEach(() => {
  vi.stubEnv('KOREAN_LAW_OC_KEY', 'testkey123');
  mockFetch.mockReset();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('searchStatutes', () => {
  it('parses XML response into Statute[] with correct fields', async () => {
    const { searchStatutes } = await import('@/lib/koreanLawClient');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <LawSearch>
      <law>
        <법령명한글>민법</법령명한글>
        <법령MST>001234</법령MST>
        <법령구분명>법률</법령구분명>
        <시행일자>20240101</시행일자>
      </law>
      <law>
        <법령명한글>가사소송법</법령명한글>
        <법령MST>005678</법령MST>
        <법령구분명>법률</법령구분명>
        <시행일자>20230601</시행일자>
      </law>
    </LawSearch>`;

    mockFetch.mockResolvedValueOnce(xmlResponse(xml));

    const result = await searchStatutes('이혼');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual<Statute>({
      name: '민법',
      mst: '001234',
      category: '법률',
      effectiveDate: '20240101',
    });
    expect(result[1].name).toBe('가사소송법');
  });

  it('includes OC key and correct query params in fetch URL', async () => {
    const { searchStatutes } = await import('@/lib/koreanLawClient');

    mockFetch.mockResolvedValueOnce(xmlResponse('<LawSearch></LawSearch>'));

    await searchStatutes('이혼');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('OC=testkey123');
    expect(url).toContain('target=law');
    expect(url).toContain('type=XML');
    expect(url).toContain('query=');
  });
});

describe('searchPrecedents', () => {
  it('parses XML response into Precedent[] with HTML stripped', async () => {
    const { searchPrecedents } = await import('@/lib/koreanLawClient');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <PrecSearch>
      <prec>
        <사건번호>2023다12345</사건번호>
        <선고일자>20231215</선고일자>
        <판시사항><![CDATA[이혼 시 <br/>재산분할 기준]]></판시사항>
        <판결요지><![CDATA[<p>재산분할 비율은</p> 기여도에 따라]]></판결요지>
        <판례일련번호>99999</판례일련번호>
      </prec>
    </PrecSearch>`;

    mockFetch.mockResolvedValueOnce(xmlResponse(xml));

    const result = await searchPrecedents(['이혼', '재산분할']);

    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe('2023다12345');
    expect(result[0].date).toBe('20231215');
    expect(result[0].summary).toBe('이혼 시 재산분할 기준');
    expect(result[0].ruling).toBe('재산분할 비율은 기여도에 따라');
    expect(result[0].precSeq).toBe('99999');
  });
});

describe('getStatuteDetail', () => {
  it('parses statute articles from XML', async () => {
    const { getStatuteDetail } = await import('@/lib/koreanLawClient');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <법령>
      <조문>
        <조문번호>제834조</조문번호>
        <조문제목>이혼의 효력</조문제목>
        <조문내용><![CDATA[<p>이혼을 한 당사자 일방은</p> 다른 일방에 대하여 재산분할을 청구할 수 있다.]]></조문내용>
      </조문>
    </법령>`;

    mockFetch.mockResolvedValueOnce(xmlResponse(xml));

    const result = await getStatuteDetail('001234');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<StatuteArticle>({
      articleNumber: '제834조',
      articleTitle: '이혼의 효력',
      articleContent: '이혼을 한 당사자 일방은 다른 일방에 대하여 재산분할을 청구할 수 있다.',
    });
  });
});

describe('error handling', () => {
  it('returns empty array on fetch timeout (AbortError)', async () => {
    const { searchStatutes } = await import('@/lib/koreanLawClient');

    mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    const result = await searchStatutes('이혼');

    expect(result).toEqual([]);
  });

  it('returns empty array on HTTP 500 and logs error', async () => {
    const { searchStatutes } = await import('@/lib/koreanLawClient');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

    const result = await searchStatutes('이혼');

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns empty array and logs when OC key is missing', async () => {
    vi.stubEnv('KOREAN_LAW_OC_KEY', '');
    vi.resetModules();
    const { searchStatutes } = await import('@/lib/koreanLawClient');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await searchStatutes('이혼');

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('rate limiting', () => {
  it('delays second call to maintain 500ms gap', async () => {
    const { searchStatutes } = await import('@/lib/koreanLawClient');

    mockFetch
      .mockResolvedValueOnce(xmlResponse('<LawSearch></LawSearch>'))
      .mockResolvedValueOnce(xmlResponse('<LawSearch></LawSearch>'));

    const start = Date.now();
    await searchStatutes('민법');
    await searchStatutes('형법');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(450);
  });
});

describe('HTML stripping', () => {
  it('strips various HTML tags from text', async () => {
    const { searchPrecedents } = await import('@/lib/koreanLawClient');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <PrecSearch>
      <prec>
        <사건번호>2024다99999</사건번호>
        <선고일자>20240101</선고일자>
        <판시사항><![CDATA[<b>중요</b><br/>내용<p>여기</p>]]></판시사항>
        <판결요지><![CDATA[일반 텍스트]]></판결요지>
      </prec>
    </PrecSearch>`;

    mockFetch.mockResolvedValueOnce(xmlResponse(xml));

    const result = await searchPrecedents(['테스트']);

    expect(result[0].summary).toBe('중요 내용 여기');
    expect(result[0].ruling).toBe('일반 텍스트');
  });
});
