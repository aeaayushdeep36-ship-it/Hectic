import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const isStaticExport = process.env.CF_PAGES === "1";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://apis.google.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com",
  "font-src 'self' data: https://api.fontshare.com https://cdn.fontshare.com https://fonts.gstatic.com",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.workers.dev${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self' https://hectic-auditor-2026.firebaseapp.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? { output: "export", images: { unoptimized: true }, typescript: { ignoreBuildErrors: true } }
    : { serverExternalPackages: ["better-sqlite3"] }),
  poweredByHeader: false,
  ...(!isStaticExport
    ? {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "Content-Security-Policy", value: csp },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "no-referrer" },
                {
                  key: "Permissions-Policy",
                  value: "camera=(), microphone=(), geolocation=(), payment=()",
                },
              ],
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
