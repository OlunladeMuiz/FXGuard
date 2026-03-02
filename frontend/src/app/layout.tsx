import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar/Navbar';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';

export const metadata: Metadata = {
  title: 'FXNexus - Multi-Currency Wallet Dashboard',
  description:
    'Production-grade financial dashboard for cross-border finance platform',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <main style={{ flex: 1, padding: 'var(--spacing-6)' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
