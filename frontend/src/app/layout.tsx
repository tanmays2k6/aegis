import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AEGIS — Authenticated Evidence & Government Investigation System',
  description:
    'Secure digital document and investigation management platform for law-enforcement agencies, forensic departments, and authorized auditors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased text-gov-dark bg-gov-surface`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
