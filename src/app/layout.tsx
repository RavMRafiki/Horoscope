import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-cinzel",
});

const cinzelDeco = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel-deco",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Dzisiaj | Energia podróży",
  description: "Rozrywkowy ranking energii środków transportu.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="pl"
      className={`${cinzel.variable} ${cinzelDeco.variable} ${jakarta.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
