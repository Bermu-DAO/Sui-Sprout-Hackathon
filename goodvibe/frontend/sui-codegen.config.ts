import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
  output: './lib/generated',
  generateSummaries: true,
  prune: true,
  importExtension: '', // Next.js 需無副檔名才能正確解析
  packages: [
    {
      package: '@local-pkg/goodvibe',
      path: '../contract',
    },
  ],
};

export default config;
