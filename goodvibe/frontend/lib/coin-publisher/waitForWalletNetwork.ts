export type WalletNetworkKit = {
  stores: { $currentNetwork: { get: () => string } };
};

export async function waitForWalletNetwork(
  kit: WalletNetworkKit,
  network: "mainnet" | "testnet",
  timeoutMs = 5000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (kit.stores.$currentNetwork.get() === network) return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return kit.stores.$currentNetwork.get() === network;
}
