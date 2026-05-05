"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, TrendingUp, CircleDollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function AdminDemoMode() {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
      {/* Fund Reward Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            {t("admin.fundPool")}
          </CardTitle>
          <CardDescription>{t("admin.fundPoolDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("stats.rewardBalance")}:</span>
              <span className="font-medium">500 OC</span>
            </div>
          </div>
          <Input placeholder={t("admin.amount")} disabled />
          <Button className="w-full" disabled>{t("admin.fundAction")}</Button>
        </CardContent>
      </Card>

      {/* Update Price Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("admin.updatePrice")}
          </CardTitle>
          <CardDescription>{t("admin.updatePriceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("stats.currentPrice")}:</span>
              <span className="font-medium">$2.5000 USD</span>
            </div>
          </div>
          <Input placeholder={t("admin.newPrice")} disabled />
          <Button className="w-full" disabled>{t("admin.updateAction")}</Button>
        </CardContent>
      </Card>

      {/* Mint OC Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5" />
            {t("admin.mintOC")}
          </CardTitle>
          <CardDescription>{t("admin.mintOCDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-yellow-500">{t("admin.limitWarning")}</span>
          </div>
          <Input placeholder={t("admin.recipient")} disabled />
          <Input placeholder={t("admin.amount")} disabled />
          <Button className="w-full" disabled>{t("admin.mintAction")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
