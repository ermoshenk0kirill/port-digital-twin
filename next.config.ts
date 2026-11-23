import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Добавляем эту строку, чтобы Next.js знал корень проекта
  outputFileTracingRoot: process.cwd(), 

  webpack: (config) => {
    // Добавляем поддержку Leaflet
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      leaflet: 'leaflet',
    };

    return config;
  },
};

export default nextConfig;