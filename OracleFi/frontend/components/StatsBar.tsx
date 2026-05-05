"use client";

import { usePoolData } from "@/hooks/usePoolData";
import { useUserData } from "@/hooks/useUserData";
import { useOraclePrice } from "@/hooks/useOraclePrice";
import { SCALING_FACTOR } from "@/lib/constants";
import { calculateDynamicAPY, formatAPY } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Coins, Wallet, Gift, TrendingUp, DollarSign } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

// 動畫配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export function StatsBar() {
  const { data: poolData } = usePoolData();
  const { data: userData } = useUserData();
  const { data: ocPrice, isLoading: priceLoading } = useOraclePrice();
  const { t } = useLanguage();

  const currentAPY = ocPrice ? calculateDynamicAPY(ocPrice) : null;

  const totalStaked = ((poolData?.totalStaked || 0) / SCALING_FACTOR).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const rewardBalance = ((poolData?.rewardBalance || 0) / SCALING_FACTOR).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const myStaked = ((userData?.stakeAmount || 0) / SCALING_FACTOR).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const myPendingRewards = ((userData?.pendingRewards || 0) / SCALING_FACTOR).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <motion.div 
      className="mb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* highlight: Current APY */}
      <motion.div variants={cardVariants} className="mb-4">
        <Card className="card-3d border-primary/50 shadow-[0_0_30px_rgba(59,130,246,0.25)] bg-slate-900/40 backdrop-blur-md hover:border-primary/80 hover:shadow-[0_0_45px_rgba(59,130,246,0.45)] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary/80 uppercase tracking-widest">{t("stats.currentAPY")}</CardTitle>
            <TrendingUp className="h-6 w-6 text-green-400 pulse-soft" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-extrabold tabular-nums tracking-tight number-roll-in my-2">
              {priceLoading || currentAPY === null ? (
                <span className="text-muted-foreground text-3xl">Loading...</span>
              ) : (
                <span className="text-green-400">
                  {formatAPY(currentAPY)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("stats.dynamicRate")} <span className="mx-1">•</span> <span className="text-yellow-400">{t("stats.priceDriven")}</span>
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top row of 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Total Staked */}
        <motion.div variants={cardVariants}>
          <Card className="card-3d border-border/40 bg-zinc-950/50 backdrop-blur-md hover:border-border/60 transition-all duration-300 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.totalStaked")}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums tracking-tight number-roll-in">
                {totalStaked} <span className="text-muted-foreground text-sm font-normal">OC</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("stats.poolWideStaked")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reward Balance */}
        <motion.div variants={cardVariants}>
          <Card className="card-3d border-border/40 bg-zinc-950/50 backdrop-blur-md hover:border-border/60 transition-all duration-300 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.rewardBalance")}</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums tracking-tight number-roll-in">
                {rewardBalance} <span className="text-muted-foreground text-sm font-normal">OC</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("stats.totalRewardsReady")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Staked */}
        <motion.div variants={cardVariants}>
          <Card className="card-3d border-border/40 bg-zinc-950/50 backdrop-blur-md hover:border-border/60 transition-all duration-300 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.myStaked")}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums tracking-tight number-roll-in">
                {myStaked} <span className="text-muted-foreground text-sm font-normal">OC</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("stats.yourActiveStake")}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom row of 2 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Pending Rewards */}
        <motion.div variants={cardVariants}>
          <Card className="card-3d border-border/40 bg-zinc-950/50 backdrop-blur-md hover:border-border/60 transition-all duration-300 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.pendingRewards")}</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums tracking-tight number-roll-in">
                {myPendingRewards} <span className="text-muted-foreground text-sm font-normal">OC</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("stats.yourUnclaimedRewards")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current OC Price */}
        <motion.div variants={cardVariants}>
          <Card className="card-3d border-border/40 bg-zinc-950/50 backdrop-blur-md hover:border-border/60 transition-all duration-300 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.currentPrice")}</CardTitle>
              <DollarSign className="h-4 w-4 text-primary pulse-soft" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums tracking-tight number-roll-in">
                {priceLoading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : (
                  <span className="text-primary">
                    ${ocPrice?.toFixed(4) || "0.0000"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.oraclePriceFeed")} <span className="mx-1">•</span> <span className="text-green-400">{t("stats.live")}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
