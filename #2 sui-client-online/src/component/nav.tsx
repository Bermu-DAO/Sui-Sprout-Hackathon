"use client";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";

interface NavProps {
  movefn: () => void;
  walletfn: () => void;
  txbfn: () => void;
}

export default function Nav({ movefn, walletfn, txbfn }: NavProps) {
  return (
    <nav className="flex items-center justify-between p-4 bg-gray-800/70 text-xl text-white font-bold">
      <p>Sui CLI <span className="inline bg-gradient-to-br from-indigo-200 to-blue-600 text-transparent bg-clip-text">ONLINE</span></p>
      <p className="cursor-default hover:text-slate-400 transition-colors" onClick={movefn}>Move Function Call</p>
      <p className="cursor-default hover:text-slate-400 transition-colors" onClick={walletfn}>Wallet View</p>
      <p className="cursor-default hover:text-slate-400 transition-colors" onClick={txbfn}>Simple Transaction (WIP)</p>
      <ConnectButton />
    </nav>
  );
}
