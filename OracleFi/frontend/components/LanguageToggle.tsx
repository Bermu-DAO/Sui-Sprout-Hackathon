"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleLanguage}
      className="gap-1 sm:gap-2 mx-0 sm:mx-2 px-2 sm:px-3 font-medium"
      suppressHydrationWarning
    >
      <Globe className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="hidden sm:inline-flex items-center gap-1">
        <span className={language === 'en' ? 'font-bold text-primary' : 'text-muted-foreground'}>EN</span>
        <span className="text-muted-foreground">|</span>
        <span className={language === 'zh' ? 'font-bold text-primary' : 'text-muted-foreground'}>中文</span>
      </div>
      <span className="inline sm:hidden font-bold text-primary text-xs uppercase">
        {language}
      </span>
    </Button>
  );
}
