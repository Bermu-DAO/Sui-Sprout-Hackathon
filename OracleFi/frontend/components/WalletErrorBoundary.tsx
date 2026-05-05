'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WalletErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // 不進入錯誤 UI，直接繼續正常渲染
    return { hasError: false };
  }

  componentDidCatch(error: Error) {
    // 只攔截 Slush 插件的 sseError，其他錯誤正常拋出
    const isWalletExtensionError =
      error.message?.includes('sseError') ||
      error.message?.includes('func') ||
      error.stack?.includes('chrome-extension');

    if (!isWalletExtensionError) {
      throw error; // 不是插件錯誤，讓它正常崩潰
    }

    console.warn('[Wallet] Extension compatibility warning:', error.message)
  }

  render() {
    return this.props.children;
  }
}