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
    default: 'NIVA — Student Social & Matchmaking Platform in Semarang',
    template: '%s | NIVA Semarang',
  },
  description: SITE_CONFIG.description,
  keywords: [
    'dating app Semarang',
    'dating app mahasiswa Semarang',
    'aplikasi dating mahasiswa',
    'aplikasi cari teman Semarang',
    'aplikasi cari pasangan mahasiswa',
    'student social platform Semarang',
    'matchmaking mahasiswa Semarang',
    'aplikasi pertemanan mahasiswa',
    'mahasiswa Semarang',
    'komunitas mahasiswa Semarang',
  ],
  authors: [{ name: 'NIVA Platform Team' }],
  creator: 'NIVA Platform',
  publisher: 'NIVA Platform',
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
    title: 'NIVA — Student Social & Matchmaking Platform in Semarang',
    description: SITE_CONFIG.description,
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'NIVA — Student Social & Matchmaking Platform Semarang',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIVA — Student Social & Matchmaking Platform in Semarang',
    description: SITE_CONFIG.description,
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
    name: 'NIVA',
    url: SITE_CONFIG.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_CONFIG.url}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="id" className={`${inter.variable} ${outfit.variable} scroll-smooth`}>
      <head>
        <JsonLd data={jsonLdOrg} />
        <JsonLd data={jsonLdWebSite} />
      </head>
      <body className="min-h-screen flex flex-col bg-[#FAF8F6] text-[#17151A]">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
