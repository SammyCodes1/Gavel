import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Every network endpoint the browser app talks to. Wallet requests go through the injected
// provider (window.ethereum), which is not a network call from this page, so it is not listed.
const RPC_ENDPOINTS = [
  "https://testnet-rpc.monad.xyz",
  "https://rpc.monad.xyz",
  "wss://testnet-rpc.monad.xyz",
  "wss://rpc.monad.xyz",
];

// Content Security Policy (audit W-02). Next.js injects inline scripts without nonces, so
// 'unsafe-inline' is needed for scripts; 'unsafe-eval' and the websocket for hot reload are dev-only.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:", // seller images must be https (enforced in the UI too)
  `connect-src 'self' ${RPC_ENDPOINTS.join(" ")}${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Send the security headers on every route.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
