/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  crossOrigin: "use-credentials",
};

export default nextConfig;
