/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUI_NETWORK?: string
  readonly VITE_SUI_FULLNODE_URL?: string
  readonly VITE_SUI_FRAMEWORK_PACKAGE_ID?: string
  readonly VITE_SUI_RANDOM_PACKAGE_ID?: string
  readonly VITE_LOTTERY_PACKAGE_ID?: string
  readonly VITE_LOTTERY_OBJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
