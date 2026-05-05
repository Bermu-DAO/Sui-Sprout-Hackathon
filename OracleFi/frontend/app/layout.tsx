import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { WalletConnect } from "@/components/WalletConnect";
import { LanguageToggle } from "@/components/LanguageToggle";
import { FaucetButton } from "@/components/FaucetButton";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OracleFi - Sui Staking Pool",
  description: "Next Generation Yield with Oracle Integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background antialiased flex flex-col`}>
        <Providers>
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg bg-primary flex flex-shrink-0 items-center justify-center">
                  <span className="text-primary-foreground font-bold text-base sm:text-lg">O</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">OracleFi</h1>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <FaucetButton />
                <LanguageToggle />
                <WalletConnect />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t py-6 text-center text-sm text-muted-foreground mt-auto">
            <p>Built by Joe Chou &copy; {new Date().getFullYear()}</p>
          </footer>
          
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
