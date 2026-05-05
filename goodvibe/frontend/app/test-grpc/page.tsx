'use client';

import { useEffect, useState } from 'react';

export default function TestGrpcPage() {
  const [status, setStatus] = useState<string>('Testing...');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testGrpcConnection();
  }, []);

  async function testGrpcConnection() {
    try {
      const res = await fetch('/api/test-grpc');
      const data = await res.json();
      setStatus(data.status);
      setResults(data.results || []);
      if (!res.ok) setError(data.error || res.statusText);
    } catch (err: any) {
      setError(err.message);
      setStatus('Error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Surflux gRPC 連線測試</h1>
        
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">狀態:</span>
            <span className={`text-lg ${
              status === 'Connected' ? 'text-green-600' :
              status === 'Error' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">錯誤</h3>
            <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg shadow ${
                result.status === 'success' ? 'bg-green-50 border border-green-200' :
                result.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                result.status === 'error' ? 'bg-red-50 border border-red-200' :
                'bg-blue-50 border border-blue-200'
              }`}
            >
              <h3 className={`font-bold mb-2 ${
                result.status === 'success' ? 'text-green-800' :
                result.status === 'warning' ? 'text-yellow-800' :
                result.status === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {result.title}
              </h3>
              <p className={`text-sm ${
                result.status === 'success' ? 'text-green-700' :
                result.status === 'warning' ? 'text-yellow-700' :
                result.status === 'error' ? 'text-red-700' :
                'text-blue-700'
              }`}>
                {result.content}
              </p>
              {result.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                    詳細資訊
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                    {result.details}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-white rounded-lg shadow">
          <h3 className="font-bold mb-2">環境變數（僅伺服器端）</h3>
          <p className="text-sm text-gray-600 mb-2">
            gRPC API Key 僅在伺服器使用，請在 Vercel / .env 設定 <code className="bg-gray-100 px-1">SUI_GRPC_ENDPOINT</code> 與 <code className="bg-gray-100 px-1">SUI_GRPC_TOKEN</code>，切勿使用 NEXT_PUBLIC_ 前綴以免暴露給瀏覽器。
          </p>
          <p className="text-xs text-amber-700">
            此頁測試結果由 <code>/api/test-grpc</code> 在伺服器執行，瀏覽器不會取得 API Key。
          </p>
        </div>
      </div>
    </div>
  );
}
