"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function AdminLinkButton() {
  const { t } = useLanguage();
  
  return (
    <div className="flex justify-end mb-4">
      <Link href="/admin">
        <Button variant="neon" className="gap-2 shadow-primary/20 shadow-lg">
          <ShieldAlert className="w-5 h-5" />
          {t("nav.adminDashboard")}
        </Button>
      </Link>
    </div>
  );
}
