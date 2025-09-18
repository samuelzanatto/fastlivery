import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ToastProvider } from "@/components/providers/toast-provider";
import { PageTransitionProvider } from "@/components/providers/page-transition-provider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ZapLivery - Sistema de Delivery Inteligente",
  description: "Automatize seu delivery com IA e maximize seus resultados",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Importante para lidar com teclado virtual
  viewportFit: 'cover'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="md:scrollbar-auto scrollbar-hide">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased md:scrollbar-auto scrollbar-hide`}
      >
        <PageTransitionProvider>
          {children}
        </PageTransitionProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
