/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com', 'api.dicebear.com'],
  },
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./prisma/dev.db'],
    },
  },
};

export default nextConfig;
