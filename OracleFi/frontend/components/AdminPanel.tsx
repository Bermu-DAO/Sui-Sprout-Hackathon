"use client";

import { FundRewardForm } from './FundRewardForm';
import { UpdatePriceForm } from './UpdatePriceForm';
import { MintOCForm } from './MintOCForm';

interface AdminPanelProps {
  poolAdminCapId: string | null;
  oracleAdminCapId: string | null;
}

export function AdminPanel({ poolAdminCapId, oracleAdminCapId }: AdminPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {poolAdminCapId && <FundRewardForm adminCapId={poolAdminCapId} />}
      {oracleAdminCapId && <UpdatePriceForm adminCapId={oracleAdminCapId} />}
      {poolAdminCapId && <MintOCForm adminCapId={poolAdminCapId} />}
    </div>
  );
}
