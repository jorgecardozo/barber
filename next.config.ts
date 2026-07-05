import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Avatares DiceBear (barberos/clientes) cargados con next/image.
    remotePatterns: [{ protocol: "https", hostname: "api.dicebear.com" }],
  },
};

export default nextConfig;
