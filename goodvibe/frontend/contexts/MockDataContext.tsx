'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Vault } from '@/types/vault';

interface MockAllocation {
  projectId: string;
  percentage: number;
}

interface MockDataContextType {
  // Vault 狀態
  hasMockVault: boolean;
  mockVault: Vault | null;
  createMockVault: (address: string) => void;
  
  // Donation 配置
  globalDonationPercentage: number;
  setGlobalDonationPercentage: (percentage: number) => void;
  
  // Project 分配
  allocations: MockAllocation[];
  addAllocation: (projectId: string, initialPercentage?: number) => void;
  updateAllocation: (projectId: string, percentage: number) => void;
  removeAllocation: (projectId: string) => void;
  hasAllocation: (projectId: string) => boolean;
  
  // 保存狀態
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  saveConfiguration: () => Promise<void>;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export const MockDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Vault 狀態
  const [hasMockVault, setHasMockVault] = useState(false);
  const [mockVault, setMockVault] = useState<Vault | null>(null);
  
  // Donation 配置
  const [globalDonationPercentage, setGlobalDonationPercentage] = useState(50);
  
  // Project 分配
  const [allocations, setAllocations] = useState<MockAllocation[]>([]);
  
  // 保存狀態
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 創建 Mock Vault
  const createMockVault = (address: string) => {
    const newVault: Vault = {
      id: 'mock-vault-' + Date.now(),
      owner: address,
      balance: BigInt(10000_000_000), // $10,000 USDC
      name: 'My Vault',
      donations: {}
    };
    setMockVault(newVault);
    setHasMockVault(true);
  };

  // 添加項目分配
  const addAllocation = (projectId: string, initialPercentage: number = 25) => {
    // 檢查是否已存在
    if (allocations.find(a => a.projectId === projectId)) {
      return;
    }
    
    setAllocations([...allocations, { projectId, percentage: initialPercentage }]);
    setHasUnsavedChanges(true);
  };

  // 更新項目分配
  const updateAllocation = (projectId: string, percentage: number) => {
    setAllocations(allocations.map(a => 
      a.projectId === projectId ? { ...a, percentage } : a
    ));
    setHasUnsavedChanges(true);
  };

  // 移除項目分配
  const removeAllocation = (projectId: string) => {
    setAllocations(allocations.filter(a => a.projectId !== projectId));
    setHasUnsavedChanges(true);
  };

  // 檢查項目是否已分配
  const hasAllocation = (projectId: string) => {
    return allocations.some(a => a.projectId === projectId);
  };

  // 保存配置（模擬上鏈）
  const saveConfiguration = async () => {
    // Mock 延遲（調快為 200ms，讓 loading 狀態更自然）
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 實際應該調用合約
    // await contract.updateDonationConfig(mockVault.id, globalDonationPercentage, allocations);
    
    setHasUnsavedChanges(false);
  };

  const value: MockDataContextType = {
    hasMockVault,
    mockVault,
    createMockVault,
    globalDonationPercentage,
    setGlobalDonationPercentage,
    allocations,
    addAllocation,
    updateAllocation,
    removeAllocation,
    hasAllocation,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    saveConfiguration,
  };

  return (
    <MockDataContext.Provider value={value}>
      {children}
    </MockDataContext.Provider>
  );
};

// Hook to use mock data
export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (context === undefined) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
};
