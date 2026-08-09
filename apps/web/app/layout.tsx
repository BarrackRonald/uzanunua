import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UzaNunua",
  description: "Sell and buy — Kenya's AI-native commerce platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
