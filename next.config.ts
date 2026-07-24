import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/gh/SmolDapp/tokenAssets@main/tokens/1/**",
      },
    ],
  },
};

export default nextConfig;
