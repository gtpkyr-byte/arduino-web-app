/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable Turbopack to use stable Webpack bundler which is fully compatible with Tailwind v3
  experimental: {},
}

export default nextConfig
