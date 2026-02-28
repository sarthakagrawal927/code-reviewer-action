import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Code Reviewer Dashboard',
  description: 'Enterprise control plane for GitHub review automation.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
