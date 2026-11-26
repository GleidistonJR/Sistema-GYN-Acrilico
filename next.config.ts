import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.GYN_STANDALONE === '1' ? { output: 'standalone' } : {}),
  outputFileTracingIncludes: {
    '/api/orcamentos/pdf': ['./public/logo-gyn-acrilico.png'],
  },
};

export default nextConfig;
