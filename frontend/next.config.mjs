/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

// In production, 'unsafe-eval' is strictly eliminated.
// 'unsafe-inline' is retained for Next.js App Router static hydration scripts and Tailwind styles.
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

const connectSrc = isProd
  ? "connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL || "")
  : "connect-src 'self' http://localhost:4000 ws://localhost:3000 http://127.0.0.1:4000";

const cspHeader = `
  default-src 'self';
  ${scriptSrc};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${connectSrc};
`.replace(/\s{2,}/g, " ").trim();

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
