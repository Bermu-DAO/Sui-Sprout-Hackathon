import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CohortVault",
  description: "A controlled AI workspace for research collaboration with signed receipt v1 records and TEE-ready boundaries."
};

export default function RootLayout(props: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
