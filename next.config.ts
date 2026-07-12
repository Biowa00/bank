import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permet l'upload de la pièce d'identité (jusqu'à 5 Mo) via Server Action.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
