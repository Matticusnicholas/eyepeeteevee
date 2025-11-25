import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EyePeeTeevee - Free IPTV Player",
  description: "Free IPTV player with Xtream Codes and M3U support. Watch live TV, movies, and series. Multi-screen layouts, EPG guide, and recording features.",
  keywords: ["IPTV", "streaming", "live TV", "Xtream Codes", "M3U", "EPG", "free"],
  authors: [{ name: "EyePeeTeevee" }],
  openGraph: {
    title: "EyePeeTeevee - Free IPTV Player",
    description: "Free IPTV player with Xtream Codes and M3U support",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EyePeeTeevee - Free IPTV Player",
    description: "Free IPTV player with Xtream Codes and M3U support",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e40af",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}
