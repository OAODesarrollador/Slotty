import type { Metadata } from "next";
import { Inter, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Barberia Nueva",
  description: "Sistema SaaS multi-tenant para reservas de barberias",
  icons: {
    icon: [
      { url: "/LogoNegroDibok.svg", type: "image/svg+xml" }
    ],
    shortcut: "/LogoNegroDibok.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
