import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Vercel Cron 보안: CRON_SECRET 검증
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ISR 캐시 무효화 → 다음 요청 시 페이지 재생성
    revalidatePath('/dashboard');

    return NextResponse.json({
      ok: true,
      revalidated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Revalidation failed', detail: String(error) },
      { status: 500 },
    );
  }
}
