/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep Prisma's engine out of the server bundle (loaded at runtime instead).
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
