/** @type {import('next').NextConfig} */

// Гра повністю клієнтська й не вантажить жодних зовнішніх ресурсів,
// тому всі джерела обмежені до 'self'. 'unsafe-inline' для script/style
// необхідний: Next інжектить інлайн-скрипти гідратації, а UI побудований
// на інлайн-стилях React (nonce вимагав би middleware і зламав статику).
const isDev = process.env.NODE_ENV !== "production";

// У dev-режимі Next Fast Refresh (HMR) використовує eval, тож без 'unsafe-eval'
// клієнтський бандл падає й сторінка не гідратується. У продакшні eval не
// потрібен — там директива лишається суворою.
const scriptSrc = "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : "");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
