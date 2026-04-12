import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: '생활 법률 안내',
  description: '상황에 맞는 법률 정보를 정리해 드립니다.',
  robots: { index: false, follow: false },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <AuthProvider>
      <main className="min-h-screen bg-warm-gray font-[Pretendard]">
        {children}
      </main>
    </AuthProvider>
  );
}
