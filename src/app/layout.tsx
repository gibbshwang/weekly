import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '생활 법률 안내',
  description: '상황에 맞는 법률 정보를 정리해 드립니다.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css" />
      </head>
      <body style={{ fontFamily: 'Pretendard, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
