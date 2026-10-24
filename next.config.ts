import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

/**
 * Mocks when USE_MOCKS=true, or automatically per service when its keys are missing.
 * Only these booleans reach the browser; the keys themselves never do.
 */
const forceMocks = process.env.USE_MOCKS === "true";

const mockAi = forceMocks || (process.env.USE_MOCKS !== "false" && !process.env.GEMINI_API_KEY);
const mockEmail = forceMocks || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM;

/** This PC's LAN addresses, so a phone/iPad on the same Wi-Fi can use the dev server (npm run dev:phone). */
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
  reactStrictMode: true,
  devIndicators: false,
  turbopack: { root: __dirname },
  env: {
    NEXT_PUBLIC_USE_MOCKS: String(mockAi),
    NEXT_PUBLIC_MOCK_EMAIL: String(mockEmail),
  },
};

export default nextConfig;
