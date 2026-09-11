import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ConditionalNavbar, ErrorBoundary } from '@/components';
import { ProtectedRouteGate } from '@/components/ProtectedRouteGate';
import { ThemeProvider } from '@/components/ThemeProvider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'FXGuard - Smart FX Optimization',
  description: 'Global invoicing and smart FX optimization platform',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.className} ${spaceGrotesk.variable}`}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <ThemeProvider>
            <ErrorBoundary>
              <ConditionalNavbar />
              <main className="app-main">
                <ProtectedRouteGate>{children}</ProtectedRouteGate>
              </main>
            </ErrorBoundary>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
