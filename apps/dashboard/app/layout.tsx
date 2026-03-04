import type { Metadata } from 'next';
import Script from 'next/script';
import { Theme } from '@radix-ui/themes';
import { SaaSMakerFeedback } from '../components/saasmaker-feedback';
import '@radix-ui/themes/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeVetter',
  description: 'AI-powered code review dashboard.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Theme appearance="dark" accentColor="blue" grayColor="slate" radius="large" scaling="100%">
          {children}
          <SaaSMakerFeedback />
        </Theme>
        <Script
          src="https://unpkg.com/@saas-maker/analytics-sdk@0.2.0/dist/index.global.js"
          data-project={process.env.NEXT_PUBLIC_SAASMAKER_API_KEY}
          data-api="https://api.sassmaker.com"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
