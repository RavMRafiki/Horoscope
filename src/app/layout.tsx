import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dzisiaj | Pogoda z Twojej okolicy",
  description: "Dzisiejsza pogoda dla najbliższego polskiego miasta."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
