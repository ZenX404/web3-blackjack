import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { mainnet, sepolia, avalancheFuji } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

// 这个代码是用来配置wagmi的
export function getConfig() {
  return createConfig({
    chains: [mainnet, sepolia, avalancheFuji], // 这里可以配置前端的连接钱包页面显示多少个网络
    connectors: [
      injected(),
      coinbaseWallet(),
      walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [avalancheFuji.id]: http(), // 这里可以配置前端连接的网络
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
