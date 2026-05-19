import type { Metadata } from "next";
import { Inter, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  metadataBase: new URL("https://dibok.app"),
  title: {
    default: "Dibok | Sistema de reservas online para barberías",
    template: "%s | Dibok"
  },
  description: "Sistema SaaS de reservas online, agenda y fila espontánea para barberías y negocios de servicios.",
  applicationName: "Dibok",
  keywords: [
    "software para barberías",
    "sistema de reservas online",
    "agenda online para barberías",
    "fila virtual para barberías",
    "turnos online"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    siteName: "Dibok",
    url: "https://dibok.app",
    title: "Dibok | Sistema de reservas online para barberías",
    description: "Sistema SaaS de reservas online, agenda y fila espontánea para barberías y negocios de servicios.",
    images: [
      {
        url: "/LogoNegroTextoDibok.svg",
        width: 1200,
        height: 630,
        alt: "Dibok"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Dibok | Sistema de reservas online para barberías",
    description: "Sistema SaaS de reservas online, agenda y fila espontánea para barberías y negocios de servicios.",
    images: ["/LogoNegroTextoDibok.svg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/LogoNegroDibok.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
