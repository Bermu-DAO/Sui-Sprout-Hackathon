import { useAvailableForPurchase } from "../hooks/useParking";
import { ParkingSpace } from "../types/parking";
import ParkingSpaceCard from "./ParkingSpaceCard";
import "./SecondaryMarketplace.css";

interface SecondaryMarketplaceProps {
  setActiveTab: (tab: "browse" | "market" | "myspaces" | "mint") => void;
}

export default function SecondaryMarketplace({ setActiveTab }: SecondaryMarketplaceProps) {
  const { data: spaces, isLoading, error, refetch } = useAvailableForPurchase();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>載入二級市場...</p>
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

  // 過濾掉用戶自己的停車格
  // const otherSpaces = spaces?.filter(space => !isOwner(space.owner));

  if (!spaces || spaces.length === 0) {
    return (
      <div className="empty-container">
        <h3>目前二級市場上沒有可購買的停車格</h3>
        <p>請稍後再來查看，或等待其他用戶上架他們的停車格。</p>
      </div>
    );
  }

  return (
    <div className="secondary-marketplace">
      <div className="marketplace-header">
        <h2>二級市場</h2>
        <span className="count-badge">{spaces.length} 個待售車位</span>
      </div>
      <p className="marketplace-description">
        在這裡，您可以向其他用戶購買他們上架出售的停車格 NFT。
      </p>
      <div className="space-grid">
        {spaces.map((space: ParkingSpace) => (
          <ParkingSpaceCard
            key={space.id}
            space={space}
            onPurchaseSuccess={refetch}
            setActiveTab={setActiveTab}
          />
        ))}
      </div>
    </div>
  );
}
