import type { Metadata } from "next";
import { ClientAppShell } from "./ClientAppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoodVibe - Fund Projects, Earn Yield",
  description: "Deposit USDC into Stable Layer, earn yield, and automatically donate to projects you support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-canvas-default text-ink-900">
        <ClientAppShell>
          {children}
        </ClientAppShell>
      </body>
    </html>
  );
}
