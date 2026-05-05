import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { ParkingSpace } from "../types/parking";
import { createPurchaseSpaceTx } from "../contracts/parking";
import { TransactionLink } from "./TransactionLink";
import "./PurchaseModal.css";

interface Props {
  space: ParkingSpace;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PurchaseModal({ space, onClose, onSuccess }: Props) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txDigest, setTxDigest] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const formatSUI = (mist: number) => {
    return (mist / 1_000_000_000).toFixed(2);
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);
    setError(null);

    try {
      const tx = createPurchaseSpaceTx(space.id, BigInt(space.price));

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("購買成功:", result);
            setIsPurchasing(false);
            setSuccess(true);
            setTxDigest(result.digest);
          },
          onError: (err) => {
            console.error("購買失敗:", err);
            setError(err instanceof Error ? err.message : "購買失敗，請稍後再試");
            setIsPurchasing(false);
          },
        }
      );
    } catch (err) {
      console.error("交易建立失敗:", err);
      setError(err instanceof Error ? err.message : "交易建立失敗");
      setIsPurchasing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={success ? onClose : undefined}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>購買停車格</h2>
          <button className="close-button" onClick={onClose} disabled={isPurchasing}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {success ? (
            <div className="success-container">
              <div className="success-icon">✓</div>
              <h3>購買成功！</h3>
              <p>您已成功購買此停車格</p>
              <div className="tx-info">
                <TransactionLink digest={txDigest} />
              </div>
              <button className="btn-primary" onClick={() => {
                if (onSuccess) {
                  onSuccess();
                }
                onClose();
              }}>
                關閉
              </button>
            </div>
          ) : (
            <>
              <div className="purchase-info">
                <div className="info-section">
                  <h3>停車格資訊</h3>
                  <div className="info-item">
                    <span className="label">位置:</span>
                    <span className="value">{space.location}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">時租費率:</span>
                    <span className="value">{formatSUI(space.hourlyRate)} SUI/小時</span>
                  </div>
                  <div className="info-item">
                    <span className="label">當前持有者:</span>
                    <span className="value monospace">
                      {space.owner.slice(0, 8)}...{space.owner.slice(-6)}
                    </span>
                  </div>
                </div>

                <div className="price-section">
                  <h3>購買價格</h3>
                  <div className="price-display">
                    <span className="price-amount">{formatSUI(space.price)}</span>
                    <span className="price-currency">SUI</span>
                  </div>
                </div>

                <div className="warning-section">
                  <p>⚠️ 購買後您將成為此停車格的所有者，並可獲得該停車格的租金收益（20%）。</p>
                  <p>💡 營運商將收取租金的 80% 作為佣金。</p>
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
                  disabled={isPurchasing}
                >
                  取消
                </button>
                <button
                  className="btn-primary"
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? "購買中..." : `確認購買 ${formatSUI(space.price)} SUI`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
