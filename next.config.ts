import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/orcamentos/pdf': ['./public/logo-gyn-acrilico.png'],
  },
};

export default nextConfig;
