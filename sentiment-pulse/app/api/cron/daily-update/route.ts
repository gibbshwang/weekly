import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Vercel Cron 보안: CRON_SECRET 미설정이면 fail-closed (401)
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ISR 캐시 무효화 → 다음 요청 시 페이지 재생성
    revalidatePath('/dashboard');
    revalidatePath('/history');

    return NextResponse.json({
      ok: true,
      revalidated: true,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Revalidation failed' },
      { status: 500 },
    );
  }
}
