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
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: '40%',
            right: -80,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(180,60,220,0.07) 0%, transparent 65%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {children}
      </body>
    </html>
  );
}
