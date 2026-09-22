import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare, ShieldCheck, Lock, Sparkles, MapPin, AlertTriangle, ArrowRight, EyeOff } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';
import JsonLd from '@/components/JsonLd';
import StrangerChatApp from '@/components/StrangerChatApp';

export const metadata: Metadata = {
  title: 'NIVA Stranger Chat — Obrolan Teks Acak Anonim 1-on-1 Semarang',
  description: 'NIVA Stranger Chat: Obrolan teks acak 1-on-1 yang aman, terenkripsi, dan anonim untuk mahasiswa serta komunitas di Kota Semarang. Dilengkapi sistem anti-scam dan perlindungan privasi nomor HP otomatis.',
  keywords: [
    'NIVA Stranger Chat',
    'stranger chat Semarang',
    'chat acak anonim Semarang',
    'random text chat mahasiswa Semarang',
    'anonymous chat Semarang',
    'cari teman ngobrol Semarang',
    'safe stranger chat',
    'anti scam chat',
  ],
  alternates: {
    canonical: '/stranger-chat',
  },
  openGraph: {
    title: 'NIVA Stranger Chat — Anonymous 1-on-1 Text Chat Semarang',
    description: 'Ngobrol santai tanpa perlu akun, tanpa nomor HP, dan 100% anonim di wilayah Semarang.',
    url: `${SITE_CONFIG.url}/stranger-chat`,
    siteName: 'NIVA',
    type: 'website',
  },
};

export default function StrangerChatPage() {
  const faqs = [
    {
      q: 'Apa perbedaan NIVA Stranger Chat dengan Stranger Cam?',
      a: 'Stranger Chat adalah percakapan teks murni 1-on-1 tanpa video atau audio, ideal bagi Anda yang ingin berkenalan secara santai dan anonim tanpa perlu mengaktifkan kamera.',
    },
    {
      q: 'Bagaimana privasi saya dilindungi di NIVA Stranger Chat?',
      a: 'Stranger Chat dirancang dengan prinsip Data Minimization. Partner tidak dapat melihat nomor telepon, email, akun Telegram, atau GPS Anda. Pesan chat hanya bersifat sementara dan tidak disimpan secara permanen di server.',
    },
    {
      q: 'Mengapa saya tidak bisa mengirimkan nomor WhatsApp atau kontak media sosial?',
      a: 'Untuk melindungi pengguna dari penipuan, pemerasan, dan kejahatan siber di luar platform, sistem keamanan NIVA secara otomatis mendeteksi dan menyensor pertukaran nomor telepon, tautan eksternal, dan kontak luar.',
    },
    {
      q: 'Apa itu Three-Strike System di NIVA?',
      a: 'Setiap pelanggaran aturan komunitas (seperti pengiriman link penipuan, spam, atau nomor kontak) akan dicatat sebagai strike di server: Strike 1 berupa peringatan, Strike 2 berupa pembatasan sementara 15 menit, dan Strike 3 berakibat pemblokiran akun permanen.',
    },
  ];

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Beranda NIVA',
        item: SITE_CONFIG.url,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Stranger Chat',
        item: `${SITE_CONFIG.url}/stranger-chat`,
      },
    ],
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
      <JsonLd data={jsonLdFaq} />
      <JsonLd data={jsonLdBreadcrumb} />

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B3A6D]/10 text-[#8A5A9A] text-xs font-semibold">
          <MessageSquare className="w-4 h-4" />
          <span>Live Production • Komunitas Semarang (18+)</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight">
          NIVA Stranger Chat
        </h1>
        <p className="text-lg sm:text-xl font-medium text-[#5B3A6D]">
          Obrolan Teks Acak 1-on-1 Anonim & Terlindungi
        </p>
        <p className="text-sm sm:text-base text-[#68626D] max-w-2xl mx-auto leading-relaxed">
          Temui teman baru di Semarang secara acak langsung dari browser. Tanpa registrasi akun, tanpa ekspos nomor telepon, dilengkapi moderasi anti-scam mutakhir server-side.
        </p>
      </div>

      {/* Main Interactive Chat App */}
      <div>
        <StrangerChatApp />
      </div>

      {/* Safety & Anti-Scam Architecture Highlights */}
      <div className="space-y-8 pt-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-[#17151A]">Standar Keamanan NIVA Stranger Chat</h2>
          <p className="text-xs sm:text-sm text-[#68626D]">
            Prioritas utama kami adalah keselamatan pengguna, privasi mutlak, dan pencegahan penipuan online.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-[#5B3A6D]/10 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#17151A] text-base">Server-Side Multi-Stage Pipeline</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Setiap pesan diperiksa melalui normalisasi Unicode NFKC, pembersihan homoglyph, serta deteksi pola obfuscation (S1OT G4C0R, spasi antar angka) sebelum diteruskan ke partner.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#5B3A6D]/10 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#8A5A9A] flex items-center justify-center">
              <EyeOff className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#17151A] text-base">Perlindungan Kontak & Privasi</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Pencegahan otomatis pertukaran nomor WhatsApp, format nomor HP Indonesia (+62/08), email, dan akun media sosial untuk mencegah tindak penipuan di luar platform.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#5B3A6D]/10 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#17151A] text-base">Three-Strike System Nyata</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Pelanggaran berulang otomatis mengeskalasi sanksi dari peringatan, cooldown 15 menit, hingga pemblokiran akun total. Pelanggaran berat langsung ditindak seketika.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6 pt-4 border-t border-[#5B3A6D]/10">
        <h2 className="text-2xl font-bold text-[#17151A] text-center">Pertanyaan yang Sering Diajukan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-[#5B3A6D]/10 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-[#17151A]">{faq.q}</h3>
              <p className="text-xs text-[#68626D] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
