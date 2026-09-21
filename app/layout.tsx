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
    default: 'NIVA — Platform Mahasiswa Semarang | Safe Matchmaking & Stranger Cam',
    template: '%s | NIVA Semarang Platform',
  },
  description: 'Platform sosial, safe matchmaking, dan random 1-on-1 stranger chat eksklusif mahasiswa di Semarang (UNDIP, UNNES, UDINUS, UNISSULA, POLINES, SCU, UIN Walisongo). 18+ aman & terverifikasi.',
  keywords: [
    // Brand & Main Focus
    'NIVA Semarang',
    'Semarang platform',
    'platform mahasiswa Semarang',
    'dating app Semarang',
    'dating app mahasiswa Semarang',
    'aplikasi dating mahasiswa Semarang',
    'aplikasi cari teman Semarang',
    'cari jodoh mahasiswa Semarang',
    'biro jodoh mahasiswa Semarang',
    'student matchmaking Semarang',
    'komunitas kampus Semarang',
    // Stranger Features
    'NIVA Stranger Cam',
    'stranger chat Semarang',
    'strangers things Semarang',
    'stranger cam mahasiswa Semarang',
    'random chat 1-on-1 Semarang',
    'random video call Semarang',
    'omegle mahasiswa Semarang',
    // University Semarang Keywords
    'UNDIP Semarang',
    'mahasiswa UNDIP Tembalang',
    'UNNES Semarang',
    'mahasiswa UNNES Sekaran Gunungpati',
    'UDINUS Semarang',
    'UNISSULA Semarang',
    'POLINES Tembalang',
    'UIN Walisongo Ngaliyan',
    'UNIKA Soegijapranata SCU BSB',
    'USM Tlogosari',
    'UNIMUS Kedungmundu',
    'UPGRIS Sidodadi',
    'Poltekkes Kemenkes Semarang',
    'pertemanan kampus Semarang',
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
    title: 'NIVA — Platform Mahasiswa Semarang | Safe Matchmaking & Stranger Cam',
    description: 'Platform sosial, safe matchmaking, dan random 1-on-1 stranger chat eksklusif mahasiswa di Semarang (UNDIP, UNNES, UDINUS, UNISSULA, POLINES, SCU, UIN Walisongo). 18+ aman & terverifikasi.',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'NIVA — Student Social & Stranger Cam Platform Semarang',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIVA — Platform Mahasiswa Semarang | Safe Matchmaking & Stranger Cam',
    description: 'Platform sosial, safe matchmaking, dan random 1-on-1 stranger chat eksklusif mahasiswa di Semarang (UNDIP, UNNES, UDINUS, UNISSULA, POLINES).',
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
    name: 'NIVA — Platform Mahasiswa Semarang',
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
    name: 'NIVA Platform',
    applicationCategory: 'SocialNetworkingApplication',
    operatingSystem: 'All',
    url: SITE_CONFIG.url,
    description: 'Platform sosial, safe matchmaking, dan stranger video chat eksklusif untuk mahasiswa perguruan tinggi di Semarang.',
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
