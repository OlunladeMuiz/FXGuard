import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ConditionalNavbar, ErrorBoundary } from '@/components';
import { ProtectedRouteGate } from '@/components/ProtectedRouteGate';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FXGuard - Smart FX Optimization',
  description: 'Global invoicing and smart FX optimization platform',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={plusJakarta.className}>
        <ErrorBoundary>
          <ConditionalNavbar />
          <main className="app-main">
            <ProtectedRouteGate>{children}</ProtectedRouteGate>
          </main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
