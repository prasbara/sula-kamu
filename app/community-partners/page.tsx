import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, HeartHandshake, ArrowRight, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Kemitraan Komunitas & Ekosistem Kampus Semarang — NIVA',
  description: 'Program kemitraan NIVA dengan organisasi mahasiswa, komunitas kreatif, media kampus, dan ruang produktif di Kota dan Kabupaten Semarang.',
  alternates: {
    canonical: '/community-partners',
  },
};

export default function CommunityPartnersPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <HeartHandshake className="w-4 h-4" />
          <span>Kolaborasi Komunitas Mahasiswa</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight">
          Kemitraan Komunitas NIVA
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] leading-relaxed">
          Membangun ekosistem pertemanan yang sehat, aman, dan berdaya bersama organisasi kemahasiswaan, komunitas kreatif, dan ruang publik di Semarang.
        </p>
      </div>

      {/* Honest Disclaimer */}
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs sm:text-sm text-[#17151A]">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Prinsip Kejujuran Kemitraan (Anti-Fake Partnership)</span>
        </div>
        <p className="text-[#68626D] text-xs leading-relaxed">
          NIVA adalah platform independen. Kami <strong>tidak mencantumkan logo universitas, BEM, UKM, atau organisasi mana pun secara sepihak</strong> sebagai mitra kecuali telah terdapat perjanjian kerja sama resmi (MoU/MoA) yang disepakati bersama.
        </p>
      </div>

      {/* Target Community Programs */}
      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A] text-center">
          Pilar Kolaborasi Komunitas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-base text-[#17151A]">Media Partner Event Kampus</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Dukungan publikasi untuk festival seni, seminar akademik, kompetisi inovasi, dan workshop kemahasiswaan di Semarang.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-base text-[#17151A]">Kampanye Keamanan Digital</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Penyuluhan bersama tentang pencegahan penipuan online (*anti-scam*), privasi data pribadi (UU PDP), dan etika berjejaring sosial yang aman.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-bold text-base text-[#17151A]">Spot Produktif & Kafe Lokal</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Sorotan kafe produktif, perpustakaan publik, dan ruang komunal yang nyaman bagi mahasiswa untuk belajar dan berinteraksi sehat.
            </p>
          </div>
        </div>
      </div>

      {/* How to Partner */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#5B3A6D]/15 shadow-soft space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Bagaimana Cara Mengajukan Kolaborasi?
        </h2>
        <div className="space-y-4 text-xs sm:text-sm text-[#68626D] leading-relaxed">
          <p>
            Jika Anda merupakan pengurus organisasi mahasiswa, perwakilan komunitas kreatif, pengelola ruang publik, atau panitia event di Kota Semarang, silakan hubungi tim kami dengan melampirkan:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Nama organisasi / kepanitiaan dan almamater asal.</li>
            <li>Proposal kegiatan atau rincian bentuk kerja sama yang diinginkan.</li>
            <li>Kontak resmi penanggung jawab (PIC).</li>
          </ul>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/advertise"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-xs font-bold text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] transition-colors"
          >
            <span>Kirim Proposal Kemitraan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={SITE_CONFIG.telegramBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-xs font-bold text-[#17151A] bg-white border border-[#5B3A6D]/20 hover:bg-[#FAF8F6] transition-colors"
          >
            <span>Hubungi via Telegram Bot Resmi</span>
          </a>
        </div>
      </div>
    </div>
  );
}
