import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import WalletConnect from "./WalletConnect";
import ParkingSpaceList from "./ParkingSpaceList";
import MySpaces from "./MySpaces";
import MintSpaceForm from "./MintSpaceForm";
import SecondaryMarketplace from "./SecondaryMarketplace";
import "./ParkingApp.css";

export default function ParkingApp() {
  const currentAccount = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<"browse" | "market" | "myspaces" | "mint">("market");

  if (!currentAccount) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-brand">
            <img src="/logo.png" alt="ParkFi Logo" className="header-logo" />
            <span className="subtitle">停車格資產化平台 · Powered by Sui</span>
          </div>
        </header>
        <div className="connect-screen">
          <div className="connect-card">
            <img src="/logo.png" alt="ParkFi Logo" className="logo" />
            <h2>歡迎使用 ParkFi</h2>
            <p>連接您的 Sui 錢包，開始投資停車格資產並獲取被動收益</p>
            <WalletConnect />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <img src="/logo.png" alt="ParkFi Logo" className="header-logo" />
          <span className="subtitle">停車格資產化平台 · Powered by Sui</span>
        </div>
        <WalletConnect />
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-button ${activeTab === "market" ? "active" : ""}`}
          onClick={() => setActiveTab("market")}
        >
          二級市場
        </button>
        <button
          className={`tab-button ${activeTab === "browse" ? "active" : ""}`}
          onClick={() => setActiveTab("browse")}
        >
          所有停車格
        </button>
        <button
          className={`tab-button ${activeTab === "myspaces" ? "active" : ""}`}
          onClick={() => setActiveTab("myspaces")}
        >
          我的停車格
        </button>
        <button
          className={`tab-button ${activeTab === "mint" ? "active" : ""}`}
          onClick={() => setActiveTab("mint")}
        >
          鑄造停車格
        </button>
      </nav>

      <main className="app-main">
        {activeTab === "browse" && <ParkingSpaceList setActiveTab={setActiveTab} />}
        {activeTab === "market" && <SecondaryMarketplace setActiveTab={setActiveTab} />}
        {activeTab === "myspaces" && <MySpaces setActiveTab={setActiveTab} />}
        {activeTab === "mint" && <MintSpaceForm setActiveTab={setActiveTab} />}
      </main>
    </div>
  );
}
