/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@cloudflare/d1-better-sqlite3']
  },
  // Optimize for Vercel Hobby tier
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  // Function timeout optimization for Vercel Hobby (60s max)
  serverRuntimeConfig: {
    maxDuration: 60
  },
  // Environment variables that are safe to expose to the client
  publicRuntimeConfig: {
    // Add any public env vars here if needed
  }
};

export default nextConfig; 