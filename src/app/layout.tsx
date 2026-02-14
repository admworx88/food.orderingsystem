import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Arena Blanca Resort - Restaurant',
  description: 'Arena Blanca Resort restaurant ordering and management system',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/cabinet-grotesk"
        />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/satoshi"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
