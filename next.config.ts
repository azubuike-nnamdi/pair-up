import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-right",
  },
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
}

export default nextConfig
