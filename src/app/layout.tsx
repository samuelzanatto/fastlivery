import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { SonnerToaster } from "@/components/providers/sonner-toaster";
import { PageTransitionProvider } from "@/components/providers/page-transition-provider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "FastLivery - Sistema de Delivery Inteligente",
  description: "Automatize seu delivery com IA e maximize seus resultados",
  applicationName: "FastLivery",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FastLivery",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "FastLivery",
    title: "FastLivery - Sistema de Delivery Inteligente",
    description: "Automatize seu delivery com IA e maximize seus resultados",
  },
  twitter: {
    card: "summary",
    title: "FastLivery",
    description: "Sistema de Delivery Inteligente com IA",
  },
  icons: {
    icon: "/icons/icon-32x32.png",
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1f2937",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="md:scrollbar-auto scrollbar-hide">
      <head>
        {/* Basic Meta Tags */}
        <meta name="application-name" content="FastLivery" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="mask-icon" href="/icons/favicon.svg" color="#1f2937" />
        
        {/* Service Worker Cleanup Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Cleanup old service workers from PWA removal
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                    console.log('Service Worker desregistrado:', registration.scope);
                  }
                });
              }

              // Suprimir warnings de preload de recursos não utilizados
              const originalWarn = console.warn;
              console.warn = function() {
                const message = arguments[0];
                if (typeof message === 'string' && 
                    message.includes('preloaded using link preload but not used within a few seconds')) {
                  return; // Suprimir esse warning específico
                }
                originalWarn.apply(console, arguments);
              };
            `
          }}
        />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased md:scrollbar-auto scrollbar-hide`}
      >
        <PageTransitionProvider>
          {children}
        </PageTransitionProvider>
  {/* Provider sonner para toasts */}
        <SonnerToaster />
      </body>
    </html>
  );
}
