import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { SITE_CONFIG } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: 'NIVA — Stranger Chat & Stranger Cam Semarang | Random 1-on-1',
    template: '%s | NIVA Semarang',
  },
  description: 'NIVA adalah platform Stranger Chat dan Stranger Cam 1-on-1 untuk komunitas Semarang. 18+, privacy-first, moderated, tanpa registrasi untuk fitur stranger.',
  keywords: [
    // Primary SEO Intent
    'stranger chat Semarang',
    'stranger chat Indonesia',
    'stranger cam Semarang',
    'random chat Semarang',
    'video chat Semarang',
    'anonymous chat Semarang',
    'chat stranger Semarang',
    // Secondary Intent
    'random video chat',
    '1 on 1 video chat',
    'stranger chat online',
    'anonymous video chat',
    'safe stranger chat',
    'Semarang community chat',
    'NIVA Stranger Cam',
    'NIVA Stranger Chat',
    'komunitas Semarang',
  ],
  authors: [{ name: 'NIVA Platform Team' }],
  creator: 'NIVA Platform',
  publisher: 'NIVA Platform',
  verification: {
    google: 'googled7bfe530ff714952',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: SITE_CONFIG.url,
    siteName: 'NIVA',
    title: 'NIVA — Stranger Chat & Stranger Cam Semarang | Random 1-on-1',
    description: 'NIVA adalah platform Stranger Chat dan Stranger Cam 1-on-1 untuk komunitas Semarang. 18+, privacy-first, moderated, tanpa registrasi untuk fitur stranger.',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'NIVA — Stranger Chat & Stranger Cam Semarang',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIVA — Stranger Chat & Stranger Cam Semarang | Random 1-on-1',
    description: 'NIVA adalah platform Stranger Chat dan Stranger Cam 1-on-1 untuk komunitas Semarang. 18+, privacy-first, moderated, tanpa registrasi untuk fitur stranger.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLdOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NIVA',
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/icon.png`,
    description: SITE_CONFIG.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Semarang',
      addressRegion: 'Jawa Tengah',
      addressCountry: 'ID',
    },
  };

  const jsonLdWebSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NIVA — Stranger Chat & Stranger Cam Semarang',
    url: SITE_CONFIG.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_CONFIG.url}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const jsonLdApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'NIVA',
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'All',
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    areaServed: {
      '@type': 'City',
      name: 'Semarang',
      addressRegion: 'Jawa Tengah',
      addressCountry: 'ID',
    },
  };

  return (
    <html lang="id" className={`${inter.variable} ${outfit.variable} scroll-smooth`}>
      <head>
        <JsonLd data={jsonLdOrg} />
        <JsonLd data={jsonLdWebSite} />
        <JsonLd data={jsonLdApp} />
      </head>
      <body className="min-h-screen flex flex-col bg-[#FAF8F6] text-[#17151A]">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
