"use client";

import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminPanel } from "@/components/AdminPanel";
import { AdminDemoMode } from "@/components/AdminDemoMode";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AdminPage() {
  const { data: adminStatus, isLoading } = useAdminCheck();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-2">{t("admin.title")}</h1>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 relative">
      <div className="flex items-center gap-3 mb-2 pt-4">
        <Link href="/">
          <Button variant="outline" className="group mr-2 gap-2">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            {t("nav.backToStaking")}
          </Button>
        </Link>
        <h1 className="text-4xl font-bold">{t("admin.title")}</h1>
        <Shield className="h-8 w-8 text-primary" />
      </div>
      <p className="text-muted-foreground mb-6">
        {t("admin.subtitle")}
      </p>

      {/* Debug Info (開發階段顯示) */}
      {/* {process.env.NODE_ENV === 'development' && adminStatus && (
        <Alert className="mb-4 border-blue-500">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-500">Debug Info</AlertTitle>
          <AlertDescription className="text-xs font-mono">
            <div>Method: {adminStatus.method}</div>
            <div>AdminCaps: {adminStatus.adminCaps.join(', ') || 'none'}</div>
          </AlertDescription>
        </Alert>
      )}*/}

      {adminStatus?.isAdmin ? (
        <>
          <div className="mb-6 border border-green-500/50 bg-green-500/10 rounded-lg p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-left w-full justify-start items-start">
              <h3 className="font-semibold text-green-500 m-0 p-0 text-left w-full block">{t("admin.accessGranted")}</h3>
              <div className="text-sm text-green-500/90 mt-1">
                {t("admin.accessGrantedSubtitle")}
                {adminStatus.poolAdminCapId && adminStatus.oracleAdminCapId && (
                  <span className="text-xs block mt-1">
                    PoolAdminCap ✓ &nbsp; OracleAdminCap ✓
                  </span>
                )}
              </div>
            </div>
          </div>
          <AdminPanel
            poolAdminCapId={adminStatus.poolAdminCapId}
            oracleAdminCapId={adminStatus.oracleAdminCapId}
          />
        </>
      ) : (
        <>
          <div className="mb-6 border border-yellow-500/50 bg-yellow-500/10 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-left w-full justify-start flex-col items-start">
              <h3 className="font-semibold text-yellow-500 m-0 p-0 text-left w-full block">{t("admin.demoMode")}</h3>
              <div className="text-sm text-yellow-500/90 mt-1 w-full text-balance">
                {t("admin.demoModeSubtitle")}
              </div>
            </div>
          </div>
          <AdminDemoMode />
        </>
      )}
    </div>
  );
}
