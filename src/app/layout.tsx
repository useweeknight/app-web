/**
 * Weeknight PWA - Root Layout
 *
 * 全局布局，包含 GA、字体和基础结构
 */
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";

import "./globals.css";
import { GA_MEASUREMENT_ID } from "../lib/gtag";
import { GAListener } from "./_components/ga-listener";

export const metadata: Metadata = {
  title: {
    default: "Weeknight - Your Dinner Planning Copilot",
    template: "%s | Weeknight",
  },
  description:
    "Get personalized dinner suggestions, voice-guided cooking, and smart grocery lists. Make weeknight dinners stress-free.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Weeknight",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Weeknight",
    title: "Weeknight - Your Dinner Planning Copilot",
    description: "Make weeknight dinners stress-free with AI-powered suggestions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weeknight - Your Dinner Planning Copilot",
    description: "Make weeknight dinners stress-free with AI-powered suggestions.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0A09" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* GA 事件监听 */}
        <Suspense fallback={null}>
          <GAListener />
        </Suspense>

        {/* 页面内容 */}
        {children}

        {/* GA4 脚本 */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
