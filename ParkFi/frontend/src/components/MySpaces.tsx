import { useMyParkingSpaces } from "../hooks/useParking";
import { ParkingSpace } from "../types/parking";
import MySpaceCard from "./MySpaceCard";
import "./MySpaces.css";

interface Props {
  setActiveTab: (tab: "browse" | "market" | "myspaces" | "mint") => void;
}

export default function MySpaces({ setActiveTab }: Props) {
  const { mySpaces, isLoading, error, refetch } = useMyParkingSpaces();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>載入您的停車格...</p>
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

  if (!mySpaces || mySpaces.length === 0) {
    return (
      <div className="empty-container">
        <h3>您還沒有停車格資產</h3>
        <p>立即去市場上選購，開始您的被動收入！</p>
        <button className="btn-primary" onClick={() => setActiveTab("market")}>
          前往二級市場
        </button>
        <div className="benefits-box">
          <h4>擁有停車格的好處</h4>
          <ul>
            <li>🚗 當其他用戶租用時自動獲得收益分潤</li>
            <li>💰 可以自由買賣停車格 NFT 資產</li>
            <li>📈 參與停車場資產的價值增長</li>
            <li>🔐 完全擁有和控制您的資產</li>
          </ul>
        </div>
      </div>
    );
  }

  const totalValue = mySpaces.reduce((sum: number, space: ParkingSpace) => sum + (space.price > 0 ? space.price : 0), 0);
  const forSaleCount = mySpaces.filter((space: ParkingSpace) => space.price > 0).length;

  const formatSUI = (mist: number) => {
    return (mist / 1_000_000_000).toFixed(2);
  };

  return (
    <div className="my-spaces">
      <div className="my-spaces-header">
        <h2>我的停車格資產</h2>
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">持有數量</span>
            <span className="stat-value">{mySpaces.length}</span>
          </div>
          <div className="stat-card accent">
            <span className="stat-label">出售中</span>
            <span className="stat-value">{forSaleCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">標價總值</span>
            <span className="stat-value">{formatSUI(totalValue)} SUI</span>
          </div>
        </div>
      </div>

      <div className="my-spaces-grid">
        {mySpaces.map((space: ParkingSpace) => (
          <MySpaceCard key={space.id} space={space} onActionSuccess={refetch} />
        ))}
      </div>
    </div>
  );
}
