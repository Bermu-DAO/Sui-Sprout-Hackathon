import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DAppKitProvider } from '@mysten/dapp-kit-react'
import { dAppKit } from './dapp-kit'
import { I18nProvider } from './i18n/useI18n'

import { BgmProvider } from './contexts/BgmContext'

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <I18nProvider>
          <BgmProvider>
            <App />
          </BgmProvider>
        </I18nProvider>
      </DAppKitProvider>
    </QueryClientProvider>
  </React.StrictMode>
)

