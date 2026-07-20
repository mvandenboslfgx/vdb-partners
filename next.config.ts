import type { NextConfig } from "next";
import { nextSecurityHeaders } from "@/lib/security/headers";

const nextConfig: NextConfig = {
  headers: nextSecurityHeaders,
};

export default nextConfig;
