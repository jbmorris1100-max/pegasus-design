/** @type {import('next').NextConfig} */

// In Docker Compose the backend service is "backend:8000".
// For local dev outside Docker, use BACKEND_URL=http://localhost:8000.
const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  transpilePackages: ["lucide-react", "recharts"],
  async rewrites() {
    // Only add proxy rewrites when NEXT_PUBLIC_API_URL is relative (/api/v1).
    // When it's an absolute URL (production), the frontend calls the backend directly.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    if (apiUrl.startsWith("http")) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/ws",
        destination: `${backendUrl}/ws`,
      },
    ];
  },
};

module.exports = nextConfig;
