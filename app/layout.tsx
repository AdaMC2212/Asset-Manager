import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "AssetManager",
  description: "Personal Investment & Asset Portfolio Tracker",
  icons: {
    icon: "https://cdn-icons-png.flaticon.com/512/3309/3309991.png",
    shortcut: "https://cdn-icons-png.flaticon.com/512/3309/3309991.png",
    apple: "https://cdn-icons-png.flaticon.com/512/3309/3309991.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AssetMgr",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} font-body`}>
        {children}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function() {},
                    function() {}
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
