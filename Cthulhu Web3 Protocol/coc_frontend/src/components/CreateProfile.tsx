import { useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { ShieldAlert } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';
import { COC_PACKAGE_ID, COC_PROFILE_TREASURY_ID } from '../contracts/protocol';

export function CreateProfile({ onProfileCreated }: { onProfileCreated: () => void }) {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateProfile = async () => {
    if (!account) return;
    setLoading(true);
    setError("");

    try {
      const tx = new Transaction();
      // Split 1 SUI from gas（鏈上合約要求 1_000_000_000 MIST）
      const [fee] = tx.splitCoins(tx.gas, [1_000_000_000]);
      
      tx.moveCall({
        target: `${COC_PACKAGE_ID}::profile::create_profile`,
        arguments: [tx.object(COC_PROFILE_TREASURY_ID), fee],
      });

      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      
      onProfileCreated();
    } catch (e: unknown) {
      console.error('CreateProfile error:', e);
      // 顯示真實錯誤，不做 mock success（避免使用者在真實環境中繞過 Profile 建立）
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Rejected by user') || msg.includes('User rejected')) {
        setError('Transaction cancelled.');
      } else {
        setError(`Transaction failed: ${msg.slice(0, 120)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center mt-20 animate-in fade-in duration-1000 max-w-xl mx-auto">
      <ShieldAlert className="w-24 h-24 mx-auto text-purple-600/50 mb-6 animate-pulse" />
      <h2 className="text-5xl cthulhu-text text-slate-300 mb-6 drop-shadow-lg">Embrace the Madness</h2>
      <p className="text-lg text-slate-400 mb-6 leading-relaxed">
        You stand before the grand decentralized lobby. To interact with the elder entities, you must forge your CoreProfile.
      </p>
      <div className="bg-black/40 border border-green-500/20 p-6 rounded-lg mb-8">
        <h3 className="text-green-400 font-bold mb-2">Anti-Sybil Ward</h3>
        <p className="text-sm text-slate-400 mb-4">A lifetime offering of 1 SUI is required.</p>
        <button 
          onClick={handleCreateProfile}
          disabled={loading || !account}
          className="w-full py-4 bg-gradient-to-r from-green-900 to-green-700 hover:from-green-800 hover:to-green-600 rounded-lg font-bold text-lg tracking-wide uppercase shadow-[0_0_15px_rgba(46,204,113,0.3)] transition-all disabled:opacity-50 cursor-pointer text-white"
        >
          {loading ? 'Communing...' : 'Offer 1 SUI & Create Profile'}
        </button>
        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      </div>
    </div>
  );
}
