import type { Metadata } from 'next';
import Link from 'next/link';
import { Camera, Sparkles, ShieldCheck, MapPin, Users, Send, ArrowRight, Lock, Eye, AlertTriangle } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';
import JsonLd from '@/components/JsonLd';
import StrangerCamComingSoon from '@/components/StrangerCamComingSoon';
import StrangerCamClientWrapper from '@/components/StrangerCamClientWrapper';

export const metadata: Metadata = {
  title: 'NIVA Stranger Cam — Random 1-on-1 Chat Mahasiswa Semarang',
  description: 'NIVA Stranger Cam: Obrolan video dan teks acak 1-on-1 untuk mahasiswa di Semarang (UNDIP, UNNES, UDINUS, UNISSULA, POLINES, dll). Temui teman baru dari kampus lain dengan aman.',
  keywords: [
    'NIVA Stranger Cam',
    'stranger chat Semarang',
    'random chat mahasiswa Semarang',
    'strangers things Semarang',
    'video call acak Semarang',
    'random 1-on-1 chat Semarang',
    'omegle mahasiswa Semarang',
    'temen kencan Semarang',
    'cari kenalan mahasiswa Semarang',
    'UNDIP random chat',
    'UNNES random chat',
    'UDINUS random chat',
  ],
  alternates: {
    canonical: '/stranger-cam',
  },
  openGraph: {
    title: 'NIVA Stranger Cam — Random 1-on-1 Chat Mahasiswa Semarang',
    description: 'Meet someone new. Start with a hello. Percakapan 1-on-1 acak khusus mahasiswa di Kota Semarang.',
    url: `${SITE_CONFIG.url}/stranger-cam`,
    siteName: 'NIVA',
    type: 'website',
  },
};

export default function StrangerCamPage() {
  const strangerFaqs = [
    {
      q: 'Apa itu NIVA Stranger Cam?',
      a: 'NIVA Stranger Cam adalah fitur obrolan acak 1-on-1 (video & teks) yang dirancang khusus untuk ekosistem mahasiswa di Semarang. Anda dapat terhubung secara instan dengan mahasiswa online lainnya dari berbagai kampus di Semarang.',
    },
    {
      q: 'Apakah saya wajib verifikasi KTM atau foto untuk menggunakan Stranger Cam?',
      a: 'Tidak. Demi mempermudah mahasiswa Semarang berkenalan santai, Stranger Cam tidak mewajibkan verifikasi KTM atau selfie formal, cukup konfirmasi usia 18+ dan konfirmasi berada di wilayah Semarang.',
    },
    {
      q: 'Bagaimana privasi dan lokasi saya dijaga?',
      a: 'NIVA menerapkan prinsip Data Minimization. Koordinat GPS presisi Anda tidak pernah disimpan secara permanen di database server. Sistem hanya memvalidasi apakah Anda berada di dalam batas wilayah Semarang.',
    },
    {
      q: 'Bagaimana NIVA mencegah penipuan dan konten asusila (nudity)?',
      a: 'Stranger Cam dilengkapi sistem moderasi otomatis multi-lapis: filter anti-scam (memblokir upaya transfer uang, nomor rekening, atau pencurian OTP), deteksi perilaku mencurigakan, serta tombol Skip, Block, dan Report seketika.',
    },
    {
      q: 'Kapan fitur NIVA Stranger Cam resmi diluncurkan?',
      a: 'Fitur ini sedang dalam tahap finalisasi keamanan. Anda dapat mendaftarkan kontak Telegram atau Email Anda di daftar tunggu (waitlist) di bawah untuk mendapatkan notifikasi peluncuran prioritas.',
    },
  ];

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: strangerFaqs.map((faq) => ({
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
        name: 'Stranger Cam',
        item: `${SITE_CONFIG.url}/stranger-cam`,
      },
    ],
  };

  const isEnabled = process.env.STRANGER_CAM_ENABLED !== 'false' && process.env.NEXT_PUBLIC_STRANGER_CAM_ENABLED !== 'false';

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
      <JsonLd data={jsonLdFaq} />
      <JsonLd data={jsonLdBreadcrumb} />

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B3A6D]/10 text-[#8A5A9A] text-xs font-semibold">
          <Camera className="w-4 h-4" />
          <span>{isEnabled ? 'Live Production • Komunitas Semarang (18+)' : 'Upcoming Feature • Komunitas Semarang'}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight">
          NIVA Stranger Cam
        </h1>
        <p className="text-lg sm:text-xl font-medium text-[#5B3A6D]">
          Meet someone new. Start with a hello.
        </p>
        <p className="text-sm sm:text-base text-[#68626D] max-w-2xl mx-auto leading-relaxed">
          Percakapan 1-on-1 acak di wilayah Semarang langsung dari browser. Terbuka untuk umum (18+) dan mahasiswa — tanpa perlu mendaftar, tanpa akun, langsung terhubung secara aman dan instan.
        </p>
      </div>

      {/* Real Application or Waitlist State */}
      {isEnabled ? (
        <div className="space-y-4">
          <StrangerCamClientWrapper />
        </div>
      ) : (
        <StrangerCamComingSoon />
      )}

      {/* Safety & Trust Pillars */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold text-[#17151A]">
            Etika, Privasi, & Standar Keamanan
          </h2>
          <p className="text-xs sm:text-sm text-[#68626D] max-w-xl mx-auto">
            NIVA dibangun dengan prinsip Safe Social Experience agar interaksi antar-pengguna di Semarang tetap sehat dan bermartabat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#5B3A6D]">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#17151A]">Terbuka untuk Umum (18+) & Mahasiswa</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Bebas digunakan oleh siapa saja di wilayah Semarang tanpa syarat harus menjadi mahasiswa atau mengunggah kartu identitas.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#17151A]">Anti-Scam & Anti-Nudity</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Filter sistem otomatis memblokir pesan penipuan uang, permintaan OTP, atau konten asusila demi kenyamanan bersama.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#17151A]">Kontrol Penuh: Skip & Block</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Jika merasa tidak nyaman, Anda dapat menekan tombol Skip seketika, melakukan blokir permanen, atau melaporkan pengguna yang melanggar norma.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-[#17151A] text-center">
          Pertanyaan Seputar Stranger Cam
        </h2>
        <div className="space-y-4">
          {strangerFaqs.map((faq, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-white border border-[#5B3A6D]/10 shadow-soft space-y-2">
              <h3 className="font-bold text-sm text-[#17151A]">{faq.q}</h3>
              <p className="text-xs text-[#68626D] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Explore Campus Ecosystem Link */}
      <div className="p-8 rounded-3xl bg-[#171420] text-white text-center space-y-4 shadow-xl">
        <h2 className="text-2xl font-display font-bold">
          Jelajahi Ekosistem Kampus Semarang
        </h2>
        <p className="text-xs sm:text-sm text-[#C8BED4] max-w-xl mx-auto leading-relaxed">
          Kenali lebih dekat 33 perguruan tinggi di Semarang dan panduan berkenalan lintas kampus yang aman.
        </p>
        <div className="pt-2">
          <Link
            href="/students/semarang"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-90 transition-all"
          >
            <span>Lihat Daftar 33 Universitas Semarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
