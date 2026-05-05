"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MoveExecutor from "@/component/moveExe";
import WalletDashboard from "@/component/walletView";

const Nav = dynamic(() => import("@/component/nav"), { ssr: false });

export default function Home() {
  const [curPg, setCurPg] = useState(0);
  
  const handleMove = () => {
    setCurPg(0);
  };
  const handleWallet = () => {
    setCurPg(1);
  };
  const handleTxb = () => {
    setCurPg(2);
  };
  return (
    <div
      className="relative w-full min-h-screen"
      style={{
        backgroundImage: "url('./suiOL.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-slate-900/30"></div>

      {/* Content */}
      <div className="relative z-10">
        <Nav movefn={handleMove} walletfn={handleWallet} txbfn={handleTxb} />
        {curPg === 0 && (
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
            <MoveExecutor />
          </div>
        )}
        {curPg === 1 && (
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
            <WalletDashboard />
          </div>
        )}
      </div>
    </div>
  );
}
