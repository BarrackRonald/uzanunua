/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Product imagery is served from S3-compatible object storage (see
  // docs/architecture/02-technical-architecture.md, F.5). Domains are
  // widened as real seller-content buckets/CDN hostnames are provisioned
  // per environment in later phases.
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
