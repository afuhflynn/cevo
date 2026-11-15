import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { JetBrains_Mono, Roboto, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const fontSans = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

function siteBase(): string {
  const raw =
    process.env["NEXT_PUBLIC_APP_URL"] ??
    process.env["SITE_URL"] ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export const metadata: Metadata = {
  metadataBase: new URL(siteBase()),
  title: {
    default: "Cevo — Academic Project Development Workspace",
    template: "%s | Cevo",
  },
  description:
    "Plan, research, develop, and present your academic project in one workspace. Verified research, institutional formatting, and intelligent guidance.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} font-sans antialiased min-h-full flex flex-col bg-background text-foreground`}
      >
        <Providers>
          <SpeedInsights />
          {children}
        </Providers>
      </body>
    </html>
  );
}
