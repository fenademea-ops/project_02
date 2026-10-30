/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */

  // Allow HMR (hot reload) from network IP so the app works identically
  // on both http://localhost:3000 and http://192.168.1.6:3000
  allowedDevOrigins: ['192.168.1.6', '192.168.1.*', '*.local'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
