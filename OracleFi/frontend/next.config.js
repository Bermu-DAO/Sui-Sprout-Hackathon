/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // ← 關掉 build 時的 ESLint
  },
  typescript: {
    ignoreBuildErrors: false,  // TypeScript 錯誤還是要檢查
  },
};

module.exports = nextConfig;
