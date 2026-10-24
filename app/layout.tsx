import type { Metadata, Viewport } from "next";
import { Montserrat, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./global.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MCG Try AI",
  description: "Talk to MCG's AI and get a marketing strategy in minutes.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MCG Try AI" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#144074",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${montserrat.variable} ${plexArabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
