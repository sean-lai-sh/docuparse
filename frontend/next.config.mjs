/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set the custom app directory
  experimental: {
    appDir: './src/app',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;