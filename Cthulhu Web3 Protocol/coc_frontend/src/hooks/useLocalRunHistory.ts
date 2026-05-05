import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';

export interface RunRecord {
  scenarioTitle: string;
  investigatorName: string;
  endingType: string;
  statusSnapshot: string;
  timestamp: string;
}

export function useLocalRunHistory() {
  const account = useCurrentAccount();
  
  const [records, setRecords] = useState<RunRecord[]>(() => {
    if (!account?.address) return [];
    try {
      const key = `sui-cthulhu-run-history-${account.address}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!account?.address) {
      setRecords([]);
      return;
    }
    const key = `sui-cthulhu-run-history-${account.address}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setRecords(JSON.parse(stored));
      else setRecords([]);
    } catch {
      setRecords([]);
    }
  }, [account?.address]);

  const addRunRecord = (record: Omit<RunRecord, 'timestamp'>) => {
    if (!account?.address) return;
    const key = `sui-cthulhu-run-history-${account.address}`;
    
    let prev: RunRecord[] = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) prev = JSON.parse(stored);
    } catch {
      /* empty */
    }

    const newRecord: RunRecord = {
      ...record,
      timestamp: new Date().toISOString()
    };
    
    const updated = [newRecord, ...prev];
    try {
      localStorage.setItem(key, JSON.stringify(updated));
      setRecords(updated);
    } catch (e) {
      console.error('Failed to save run history', e);
    }
  };

  return { records, addRunRecord };
}
