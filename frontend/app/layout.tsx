import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Navbar from '../components/ui/Navbar';
import PWAInstallBanner from '../components/ui/PWAInstallBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Softnix Attend',
    template: '%s · Softnix Attend'
  },
  description: 'Clock in from the office or home, track working hours and manage leave.',
  applicationName: 'Softnix Attend',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Attend',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4F46E5' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' }
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-200 antialiased overflow-x-hidden`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen safe-x">
              <Navbar />
              <main className="flex-grow w-full container mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl safe-bottom">
                {children}
              </main>
              <PWAInstallBanner />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
