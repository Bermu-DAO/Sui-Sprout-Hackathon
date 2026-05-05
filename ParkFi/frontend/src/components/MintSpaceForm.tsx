import { useState } from "react";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { createMintSpaceTx } from "../contracts/parking";
import { TransactionLink } from "./TransactionLink";
import "./MintSpaceForm.css";

interface Props {
  setActiveTab: (tab: "browse" | "market" | "myspaces" | "mint") => void;
}

export default function MintSpaceForm({ setActiveTab }: Props) {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [location, setLocation] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [txDigest, setTxDigest] = useState<string>("");

  const MIST_PER_SUI = 1_000_000_000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAccount) {
      setMessage({ type: "error", text: "請先連接錢包" });
      return;
    }

    if (!location || !hourlyRate || !price) {
      setMessage({ type: "error", text: "請填寫所有欄位" });
      return;
    }

    const hourlyRateNum = parseFloat(hourlyRate);
    const priceNum = parseFloat(price);

    if (isNaN(hourlyRateNum) || hourlyRateNum <= 0) {
      setMessage({ type: "error", text: "時租費率必須大於 0" });
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      setMessage({ type: "error", text: "售價必須大於或等於 0" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const hourlyRateMIST = BigInt(Math.floor(hourlyRateNum * MIST_PER_SUI));
      const priceMIST = BigInt(Math.floor(priceNum * MIST_PER_SUI));

      const tx = createMintSpaceTx(location, hourlyRateMIST, priceMIST);

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("鑄造成功:", result);
            setTxDigest(result.digest);
            setMessage({ type: "success", text: `停車格鑄造成功！` });
            setLocation("");
            setHourlyRate("");
            setPrice("");
          },
          onError: (error) => {
            console.error("鑄造失敗:", error);
            setMessage({
              type: "error",
              text: `鑄造失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
            });
          },
        }
      );
    } catch (error) {
      console.error("交易建立失敗:", error);
      setMessage({
        type: "error",
        text: `交易建立失敗: ${error instanceof Error ? error.message : "未知錯誤"}`
      });
    } finally {
      // Keep isSubmitting true until redirect
    }
  };

  return (
    <div className="mint-space-form-container">
      <h2>鑄造新停車格</h2>
      <p className="form-description">僅營運商可以鑄造新的停車格 NFT</p>

      <form onSubmit={handleSubmit} className="mint-form">
        <div className="form-group">
          <label htmlFor="location">停車格位置</label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例如: A1 區 101 號"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="hourlyRate">時租費率 (SUI/小時)</label>
          <input
            id="hourlyRate"
            type="number"
            step="0.0001"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="例如: 0.5"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="price">初始售價 (SUI)</label>
          <input
            id="price"
            type="number"
            step="0.0001"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="例如: 100 (設為 0 表示不出售)"
            disabled={isSubmitting}
            required
          />
          <small>設為 0 表示停車格不出售</small>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "鑄造中..." : "鑄造停車格"}
        </button>
      </form>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          {message.type === "success" && txDigest && (
            <div style={{ marginTop: "1rem" }}>
              <TransactionLink digest={txDigest} />
            </div>
          )}
          {message.type === "success" && (
            <button
              onClick={() => setActiveTab("myspaces")}
              className="btn-primary"
              style={{ marginTop: "1rem" }}
            >
              查看我的停車格
            </button>
          )}
        </div>
      )}
    </div>
  );
}
