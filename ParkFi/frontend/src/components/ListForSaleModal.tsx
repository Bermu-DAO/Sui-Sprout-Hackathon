import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { ParkingSpace } from "../types/parking";
import { createSetPriceTx } from "../contracts/parking";
import { TransactionLink } from "./TransactionLink";
import "./ListForSaleModal.css";

interface Props {
  space: ParkingSpace;
  onClose: () => void;
  onSuccess?: () => void;
}

const MIST_PER_SUI = 1_000_000_000;

export default function ListForSaleModal({ space, onClose, onSuccess }: Props) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isListing, setIsListing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceSUI, setPriceSUI] = useState("");
  const [txDigest, setTxDigest] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const handleListForSale = async () => {
    if (!priceSUI || parseFloat(priceSUI) <= 0) {
      setError("請輸入有效的價格。");
      return;
    }

    const priceMIST = BigInt(Math.floor(parseFloat(priceSUI) * MIST_PER_SUI));

    setIsListing(true);
    setError(null);

    try {
      const tx = createSetPriceTx(space.id, priceMIST);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("上架成功:", result);
            setIsListing(false);
            setSuccess(true);
            setTxDigest(result.digest);
            if (onSuccess) {
              onSuccess();
            }
          },
          onError: (err) => {
            console.error("上架失敗:", err);
            setError(err instanceof Error ? err.message : "上架失敗，請稍後再試");
            setIsListing(false);
          },
        }
      );
    } catch (err) {
      console.error("交易建立失敗:", err);
      setError(err instanceof Error ? err.message : "交易建立失敗");
      setIsListing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={success ? onClose : undefined}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>上架出售停車格</h2>
          <button className="close-button" onClick={onClose} disabled={isListing}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {success ? (
            <div className="success-container">
              <div className="success-icon">✓</div>
              <h3>上架成功！</h3>
              <p>您的停車格已成功上架到二級市場</p>
              <div className="tx-info">
                <TransactionLink digest={txDigest} />
              </div>
              <button className="btn-primary" onClick={onClose}>
                關閉
              </button>
            </div>
          ) : (
            <>
              <div className="list-info">
                <p>您正在為停車格 <strong>{space.location}</strong> 設定售價。</p>
                <p>設定價格後，任何人都可以透過二級市場向您購買此停車格。</p>
              </div>

              <div className="price-input-section">
                <label htmlFor="price-input">設定售價 (SUI)</label>
                <div className="input-group">
                  <input
                    id="price-input"
                    type="number"
                    value={priceSUI}
                    onChange={(e) => setPriceSUI(e.target.value)}
                    placeholder="例如: 12.5"
                    min="0"
                    step="any"
                  />
                  <span>SUI</span>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  ❌ {error}
                </div>
              )}

              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={isListing}
                >
                  取消
                </button>
                <button
                  className="btn-primary"
                  onClick={handleListForSale}
                  disabled={isListing || !priceSUI}
                >
                  {isListing ? "上架中..." : "確認上架"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
