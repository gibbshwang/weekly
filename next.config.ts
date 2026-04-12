import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Route Handlers에서 runtime 선언:
  // - 'nodejs': Claude streaming + Firebase Admin + fast-xml-parser (Node.js API 필요)
  // - 'edge': 정적 페이지 (기본값, 선언 불필요)
};

export default nextConfig;
