"use client";
import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import type { SuiClientTypes } from "@mysten/sui/client";
import { useState } from "react";

// Add custom CSS animations
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
  
  @keyframes slideDown {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  .animate-slide-down {
    animation: slideDown 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animationStyles;
  document.head.appendChild(style);
}

type OwnedObject = SuiClientTypes.Object<{ json: true }>;

const extractFields = (json: OwnedObject["json"]) => {
  if (!json || typeof json !== "object") {
    return null;
  }

  if ("fields" in json && json.fields && typeof json.fields === "object") {
    return json.fields as Record<string, unknown>;
  }

  return json;
};

// Component to display object fields in a collapsible format
function ObjectFieldsDisplay({ fields }: { fields: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!fields || typeof fields !== 'object') {
    return <span className="text-gray-400">No fields</span>;
  }

  const fieldEntries = Object.entries(fields);

  const copyToClipboard = async (text: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 300);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-blue-500 hover:text-blue-700 text-sm flex items-center transition-colors duration-200"
      >
        <span className={`mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
          ▶
        </span>
        {fieldEntries.length} fields
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
          {fieldEntries.map(([key, value]) => {
            const valueStr = typeof value === 'object' && value !== null ? 
              JSON.stringify(value) : 
              String(value);
            
            return (
              <div key={key} className="text-xs group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-2">
                    <span className="font-medium text-gray-700">{key}:</span>{' '}
                    <span 
                      className={`cursor-pointer break-all transition-colors duration-300 ${
                        copiedField === key ? 'text-green-400' : 'text-gray-600'
                      }`}
                      onClick={() => copyToClipboard(valueStr, key)}
                      title="Click to copy"
                    >
                      {valueStr}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Component to display a single object in grid format
function ObjectCard({ objectData }: { objectData: OwnedObject }) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const data = objectData;

  const copyToClipboard = async (text: string, itemType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemType);
      setTimeout(() => setCopiedItem(null), 300);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const CopyableText = ({ text, itemType, className = "" }: {
    text: string;
    itemType: string;
    className?: string;
  }) => {
    return (
      <span 
        className={`cursor-pointer break-all transition-colors duration-300 ${
          copiedItem === itemType ? 'text-green-400' : 'text-gray-600'
        } ${className}`}
        onClick={() => copyToClipboard(text, itemType)}
        title="Click to copy"
      >
        {text}
      </span>
    );
  };
  
  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 ease-in-out">
      <div className="grid grid-cols-3 gap-4">
        {/* Object ID Column */}
        <div className="animate-fade-in">
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Object</h4>
          <div className="space-y-1 text-xs">
            <div>
                    <span className="font-medium">ID:</span>{' '}
                    <CopyableText text={data.objectId} itemType="objectId" />
            </div>
            <div>
                    <span className="font-medium">Version:</span>{' '}
                    <CopyableText text={data.version} itemType="version" />
            </div>
            <div>
                    <span className="font-medium">Digest:</span>{' '}
                    <CopyableText text={data.digest} itemType="digest" />
            </div>
          </div>
        </div>

        {/* Type Column */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Type</h4>
          <div className="text-xs break-all">
            <CopyableText text={data.type} itemType="type" />
          </div>
        </div>

        {/* Fields Column */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Fields</h4>
          <ObjectFieldsDisplay fields={extractFields(data.json)} />
        </div>
      </div>
    </div>
  );
}

export default function WalletDashboard() {
  const [inputAccount, setInputAccount] = useState("");
  const [currentSearch, setCurrentSearch] = useState(""); // 搜尋當前帳號物件
  const [inputSearch, setInputSearch] = useState("");   // 搜尋輸入帳號物件
  const [queryCurrentAccount, setQueryCurrentAccount] = useState(false);
  const [queryInputAccount, setQueryInputAccount] = useState(false);
  const [currentAccountAllObjects, setCurrentAccountAllObjects] = useState<OwnedObject[]>([]);
  const [inputAccountAllObjects, setInputAccountAllObjects] = useState<OwnedObject[]>([]);
  const [loadingCurrentComplete, setLoadingCurrentComplete] = useState(false);
  const [loadingInputComplete, setLoadingInputComplete] = useState(false);
  const [currentAccountFinished, setCurrentAccountFinished] = useState(false);
  const [inputAccountFinished, setInputAccountFinished] = useState(false);

  const currentAccount = useCurrentAccount();
  const currentClient = useCurrentClient();

  const handleQueryCurrentAccount = async () => {
    if (!currentAccount?.address || !currentClient) {
      return;
    }

    setQueryCurrentAccount(true);
    setCurrentAccountAllObjects([]);
    setLoadingCurrentComplete(true);
    setCurrentAccountFinished(false);

    let cursor: string | null = null;
    try {
      do {
        const page = await currentClient.core.listOwnedObjects({
          owner: currentAccount.address,
          cursor,
          limit: 50,
          include: { json: true },
        });
        setCurrentAccountAllObjects((prev) => [...prev, ...page.objects]);
        cursor = page.cursor;
        if (!page.hasNextPage) {
          break;
        }
      } while (cursor);

      setCurrentAccountFinished(true);
    } catch (error) {
      console.error("Failed to fetch current account objects", error);
    } finally {
      setLoadingCurrentComplete(false);
    }
  };

  const handleQueryInputAccount = async () => {
    if (!inputAccount.trim() || !currentClient) {
      return;
    }

    const owner = inputAccount.trim();
    setQueryInputAccount(true);
    setInputAccountAllObjects([]);
    setLoadingInputComplete(true);
    setInputAccountFinished(false);

    let cursor: string | null = null;
    try {
      do {
        const page = await currentClient.core.listOwnedObjects({
          owner,
          cursor,
          limit: 50,
          include: { json: true },
        });
        setInputAccountAllObjects((prev) => [...prev, ...page.objects]);
        cursor = page.cursor;
        if (!page.hasNextPage) {
          break;
        }
      } while (cursor);

      setInputAccountFinished(true);
    } catch (error) {
      console.error("Failed to fetch input account objects", error);
    } finally {
      setLoadingInputComplete(false);
    }
  };

  const filteredCurrentObjects = currentAccountAllObjects.filter(obj => 
    obj.objectId.toLowerCase().includes(currentSearch.toLowerCase()) || 
    obj.type.toLowerCase().includes(currentSearch.toLowerCase())
  );

  const filteredInputObjects = inputAccountAllObjects.filter(obj => 
    obj.objectId.toLowerCase().includes(inputSearch.toLowerCase()) || 
    obj.type.toLowerCase().includes(inputSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-5">
      {/* Current Account Card */}
      <div className="border border-gray-200 rounded-lg p-5 my-4 bg-white shadow-sm">
        <h3 className="mt-0 mb-4 text-lg font-semibold">Current Account Query</h3>
        <p className="mb-4 text-gray-500">
          Connected Account: {currentAccount?.address || "Not connected"}
        </p>
        <div className="flex">
          <button 
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 border-none rounded cursor-pointer mr-2 disabled:cursor-not-allowed"
            onClick={handleQueryCurrentAccount}
            disabled={!currentAccount?.address}
          >
            Query Current Account
          </button>
          <input 
            type="search" 
            placeholder="Search by ID or Type..." 
            className="p-2 border border-gray-300 rounded flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={currentSearch}
            onChange={(e) => setCurrentSearch(e.target.value)}
          />
        </div>
        {queryCurrentAccount && (
          <div className="mt-4">
            {loadingCurrentComplete ? (
              <div className="text-blue-500 animate-fade-in">
                <h4 className="text-base font-medium mb-2">Fetching all objects...</h4>
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <p className="text-sm">Currently loaded: {currentAccountAllObjects.length} objects</p>
                </div>
              </div>
            ) : currentAccountFinished ? (
              <div className="animate-fade-in">
                <h4 className="text-base font-medium mb-4">
                  Showing {filteredCurrentObjects.length} of {currentAccountAllObjects.length} objects:
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto p-2">
                  {filteredCurrentObjects.length > 0 ? (
                    filteredCurrentObjects.map((obj, index) => (
                      <div 
                        key={`${obj.objectId}-${index}`}
                        className="animate-slide-down "
                        style={{ animationDelay: `${index * 20}ms` }}
                      >
                        <ObjectCard objectData={obj} />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No matching objects found.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Input Account Card */}
      <div className="border border-gray-200 rounded-lg p-5 my-4 bg-white shadow-sm">
        <h3 className="mt-0 mb-4 text-lg font-semibold">Query Another Account</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Enter account address (0x...)"
            value={inputAccount}
            onChange={(e) => setInputAccount(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 flex-grow min-w-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 border-none rounded cursor-pointer disabled:cursor-not-allowed"
            onClick={handleQueryInputAccount}
            disabled={!inputAccount.trim()}
          >
            Query Account
          </button>
        </div>
        
        <div className="mb-4">
          <input 
            type="search" 
            placeholder="Filter results by ID or Type..." 
            className="p-2 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={inputSearch}
            onChange={(e) => setInputSearch(e.target.value)}
          />
        </div>

        {queryInputAccount && inputAccount && (
          <div className="mt-4">
            {loadingInputComplete ? (
              <div className="text-blue-500 animate-fade-in">
                <h4 className="text-base font-medium mb-2">Fetching all objects for: {inputAccount}</h4>
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <p className="text-sm">Currently loaded: {inputAccountAllObjects.length} objects</p>
                </div>
              </div>
            ) : inputAccountFinished ? (
              <div className="animate-fade-in">
                <h4 className="text-base font-medium mb-4">
                  Showing {filteredInputObjects.length} of {inputAccountAllObjects.length} objects for address:
                </h4>
                <p className="text-xs text-gray-500 mb-4 break-all">{inputAccount}</p>
                <div className="space-y-3 max-h-96 overflow-y-auto p-2">
                  {filteredInputObjects.length > 0 ? (
                    filteredInputObjects.map((obj, index) => (
                      <div 
                        key={`${obj.objectId}-${index}`}
                        className="animate-slide-down "
                        style={{ animationDelay: `${index * 20}ms` }}
                      >
                        <ObjectCard objectData={obj} />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No matching objects found in this account.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}