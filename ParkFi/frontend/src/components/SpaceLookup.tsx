import { useState } from "react";
import { useParkingSpace } from "../hooks/useParking";
import ParkingSpaceCard from "./ParkingSpaceCard";
import "./SpaceLookup.css";

export default function SpaceLookup() {
  const [spaceId, setSpaceId] = useState("");
  const [searchId, setSearchId] = useState("");
  const { data: space, isLoading, error } = useParkingSpace(searchId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (spaceId.trim()) {
      setSearchId(spaceId.trim());
    }
  };

  return (
    <div className="space-lookup-container">
      <div className="lookup-header">
        <h2>查詢停車格</h2>
        <p className="lookup-description">
          輸入停車格 ID 來查看詳細資訊和購買
        </p>
      </div>

      <form onSubmit={handleSearch} className="lookup-form">
        <div className="input-group">
          <input
            type="text"
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            placeholder="請輸入停車格 ID (例如: 0x...)"
            className="space-id-input"
          />
          <button type="submit" className="btn-search" disabled={!spaceId.trim()}>
            查詢
          </button>
        </div>
      </form>

      <div className="lookup-result">
        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>查詢中...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>❌ 查詢失敗</p>
            <small>{error instanceof Error ? error.message : "未知錯誤"}</small>
          </div>
        )}

        {!isLoading && !error && searchId && !space && (
          <div className="empty-state">
            <p>找不到該停車格</p>
            <small>請確認 ID 是否正確</small>
          </div>
        )}

        {space && (
          <div className="result-card">
            <ParkingSpaceCard space={space} />
          </div>
        )}

        {!searchId && (
          <div className="hint-state">
            <h3>💡 如何獲取停車格 ID？</h3>
            <ol>
              <li>營運商鑄造停車格後，會在交易記錄中看到停車格 ID</li>
              <li>在「我的停車格」標籤中可以看到您擁有的停車格 ID</li>
              <li>停車格 ID 格式為 0x 開頭的 64 個字符</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
