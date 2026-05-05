import { useAllParkingSpaces } from "../hooks/useParking";
import { ParkingSpace } from "../types/parking";
import ParkingSpaceCard from "./ParkingSpaceCard";
import "./ParkingSpaceList.css";

interface ParkingSpaceListProps {
  setActiveTab: (tab: "browse" | "market" | "myspaces" | "mint") => void;
}

export default function ParkingSpaceList({ setActiveTab }: ParkingSpaceListProps) {
  const { data: spaces, isLoading, error } = useAllParkingSpaces();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>載入停車格資料中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>載入失敗: {error instanceof Error ? error.message : "未知錯誤"}</p>
      </div>
    );
  }

  if (!spaces || spaces.length === 0) {
    return (
      <div className="empty-container">
        <h3>目前沒有可用的停車格</h3>
        <p>請確認合約已部署並且已經鑄造停車格 NFT</p>
        <div className="hint-box">
          <h4>開發提示</h4>
          <ol>
            <li>部署合約到 Sui 測試網</li>
            <li>更新 <code>constants/ids.ts</code> 中的 PACKAGE_ID 和 LOT_ID</li>
            <li>使用合約的 <code>mint_space</code> 函數鑄造停車格</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="parking-space-list">
      <div className="list-header">
        <h2>所有停車格</h2>
        <span className="count-badge">{spaces.length} 個車位</span>
      </div>
      <div className="space-grid">
        {spaces.map((space: ParkingSpace) => (
          <ParkingSpaceCard key={space.id} space={space} setActiveTab={setActiveTab} />
        ))}
      </div>
    </div>
  );
}
