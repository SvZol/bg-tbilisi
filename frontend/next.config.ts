import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",  // нужно для Docker — создаёт минимальный server.js
};

export default nextConfig;
