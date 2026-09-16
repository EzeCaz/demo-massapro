import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['bcryptjs', 'pdfkit'],
  // Allow the z.ai preview panel host to reach the local dev server.
  // Next 16 dev mode blocks cross-origin requests from unlisted hosts.
  allowedDevOrigins: [
    'preview-chat-8a8abf03-ae09-4427-85cb-f3328de2572a.space-z.ai',
  ],
};

export default nextConfig;
