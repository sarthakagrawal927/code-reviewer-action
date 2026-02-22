import type { Metadata } from 'next';
import { IBM_Plex_Mono, Sora } from 'next/font/google';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-sora'
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono'
});

export const metadata: Metadata = {
  title: 'Code Reviewer Dashboard',
  description: 'Enterprise control plane for GitHub review automation.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
