import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dzisiaj | Energia podróży",
  description: "Rozrywkowy ranking energii środków transportu."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
