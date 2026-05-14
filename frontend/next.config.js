/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["lucide-react", "recharts"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*',
      },
      {
        source: '/ws',
        destination: 'http://backend:8000/ws',
      },
    ];
  },
};

module.exports = nextConfig;
