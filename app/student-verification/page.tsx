import type { Metadata } from 'next';
import Link from 'next/link';
import { UserCheck, ShieldCheck, Lock, Eye, AlertTriangle, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Sistem Verifikasi Mahasiswa — NIVA Semarang',
  description: 'Penjelasan transparan tentang alur verifikasi kartu tanda mahasiswa (KTM) di NIVA: AI Vision, OCR, privasi data, dan komitmen anti-catfishing.',
  alternates: {
    canonical: '/student-verification',
  },
};

export default function StudentVerificationPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2D8C6A]/10 text-[#2D8C6A] text-xs font-semibold">
          <UserCheck className="w-4 h-4" />
          <span>Keaslian & Integritas Mahasiswa</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#17151A] tracking-tight">
          Sistem Verifikasi Mahasiswa NIVA
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] max-w-2xl mx-auto">
          Membangun fondasi kepercayaan yang lebih kokoh untuk pertemanan dan matchmaking kampus di Semarang.
        </p>
      </div>

      {/* Critical Honesty Alert Box */}
      <div className="p-6 sm:p-8 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm sm:text-base">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>Pernyataan Transparan Mengenai Batasan Verifikasi Kartu (KTM)</span>
        </div>
        <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
          Verifikasi kartu mahasiswa (KTM) bertujuan untuk mengonfirmasi sinyal keaktifan status mahasiswa di institusi pendidikan tinggi bersangkutan. NIVA <strong>tidak mengklaim</strong> bahwa verifikasi KTM secara mutlak membuktikan kepemilikan foto profil wajah pengguna. Oleh sebab itu, NIVA menerapkan kontrol keamanan ganda, moderasi foto, serta mekanisme blokir dan pelaporan secara terpisah demi memastikan komunitas tetap aman.
        </p>
      </div>

      {/* Verification Pipeline */}
      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Bagaimana Proses Verifikasi Berjalan?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#17151A]">1. Analisa AI Vision & OCR</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Saat foto KTM diunggah, model AI Vision menganalisa susunan kartu, mencocokkan nama almamater dan nama pemilik akun, serta mendeteksi tanda manipulasi digital seperti watermark contoh atau editan Photoshop.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#17151A]">2. Anti-Akun Ganda (Deduplikasi)</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Sistem menghitung *cryptographic card hash* untuk memastikan satu kartu fisik hanya dapat diverifikasi ke satu akun Telegram. Ini mencegah pembuatan akun kloning atau pemakaian kartu orang lain berulang kali.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#17151A]">3. Review Verifikator Manusia</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Jika kartu buram, pencahayaan minim, atau terpotong, kartu dialihkan ke antrean tim reviewer manual untuk ditinjau secara teliti sebelum status verifikasi diberikan.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Guarantee */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#FAF8F6] border border-[#5B3A6D]/15 space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Jaminan Perlindungan Data Pribadi (Privacy-First)
        </h2>
        <div className="space-y-4 text-sm text-[#68626D] leading-relaxed">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#2D8C6A] flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-[#17151A]">NIM Tidak Pernah Dipublikasikan:</strong> Nomor Induk Mahasiswa Anda hanya digunakan sebagai sinyal validitas dan tidak pernah dimunculkan pada kartu profil atau ruang obrolan.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#2D8C6A] flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-[#17151A]">Batas Retensi Gambar (Auto-Purge):</strong> Gambar KTM yang memerlukan peninjauan disimpan sementara dalam penyimpanan terenkripsi dan dihapus secara otomatis maksimal 72 jam setelah verifikasi selesai.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#2D8C6A] flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-[#17151A]">Tanpa Penjualan Data:</strong> Data Anda tidak akan pernah dijual, disewakan, atau dimonetisasi kepada pihak ketiga komersial mana pun.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5B3A6D] hover:text-[#8A5A9A]"
        >
          <span>Kembali ke Panduan Cara Kerja</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
