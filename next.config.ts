import "dotenv/config";
import type { NextConfig } from "next";

// Silence baseline-browser-mapping stale data warnings during build.
process.env.BROWSERSLIST_IGNORE_OLD_DATA ??= "1";
process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA ??= "1";

const nextConfig: NextConfig = {
  // Explicitly configure Turbopack to silence Next.js 16 warning about having a webpack config
  // without a turbopack config. We don't need any special Turbopack options right now.
  turbopack: {},
  env: {
    BROWSERSLIST_IGNORE_OLD_DATA: "1",
    BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: "1",
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent AWS Amplify from trying to build node-canvas
      config.resolve.alias["canvas"] = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    qualities: [100, 75],
  },

  // 👇 Fix for COOP/COEP blocking Google OAuth popup
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
