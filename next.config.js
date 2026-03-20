/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve existing index.html at root, API routes handle data
  async rewrites() {
    return [
      // Serve the old SPA index.html at root (non-API routes)
    ];
  },
  // API routes are handled by pages/api/* as usual
  // The index.html in public/ will be served at /index.html
  // We need to serve it at / as well
};

module.exports = nextConfig;
