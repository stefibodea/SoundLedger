import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from 'next/font/google'
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "SoundLedger — Platformă Management Case de Discuri",
  description: "Gestionează artiștii, catalogul muzical, contractele și veniturile casei tale de discuri cu insights AI.",
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" style={{ colorScheme: 'dark' }} className={plusJakartaSans.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Blob top-right — magenta/violet */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: -100,
            right: -80,
            width: 560,
            height: 560,
            background: 'radial-gradient(circle, rgba(200, 60, 240, 0.18) 0%, rgba(150, 40, 190, 0.08) 45%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {/* Blob bottom-left — albastru/cyan */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            bottom: -80,
            left: -60,
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.13) 0%, rgba(30, 120, 200, 0.06) 45%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {children}
      </body>
    </html>
  );
}
