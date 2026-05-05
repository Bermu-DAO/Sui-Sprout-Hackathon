import { ConnectButton } from "@mysten/dapp-kit";
import "./WalletConnect.css";

export default function WalletConnect() {
  return (
    <div className="wallet-connect">
      <ConnectButton />
    </div>
  );
}
