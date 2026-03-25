/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  typescript: {
    tsconfigPath: './tsconfig.json',
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
