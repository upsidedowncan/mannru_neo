import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['cyrillic', 'latin'], variable: '--font-sans' });

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'MANNRU - SYS.AUTH',
  description: 'Secure terminal access.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ru" className={`${manrope.variable}`}>
      <body className="bg-black text-mnr-text antialiased font-sans" suppressHydrationWarning>
        <div className="flex min-h-[100dvh] w-full max-w-[480px] md:max-w-none md:w-full flex-col overflow-x-hidden bg-mnr-bg md:border-none border-l border-r border-mnr-border relative">
          {children}
        </div>
      </body>
    </html>
  );
}
