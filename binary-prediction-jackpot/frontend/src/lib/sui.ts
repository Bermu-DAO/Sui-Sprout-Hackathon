import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { NETWORK } from "./constants";

// Initialize Sui Client
export const suiClient = new SuiClient({
  url: getFullnodeUrl(NETWORK as "testnet" | "mainnet" | "devnet"),
});

// Helper function to format SUI amount
export function formatSUI(amount: number | string): string {
  const value = typeof amount === "string" ? parseInt(amount) : amount;
  return (value / 1_000_000_000).toFixed(4);
}

// Helper function to parse SUI amount to MIST
export function parseToMIST(sui: number): number {
  return Math.floor(sui * 1_000_000_000);
}
