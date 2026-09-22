import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Flag, 
  UserX, 
  AlertCircle, 
  ArrowRight, 
  Video, 
  MessageSquare, 
  GraduationCap, 
  FileCheck2, 
  PhoneCall 
} from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Pusat Keamanan & Perlindungan Pengguna — NIVA Semarang',
  description: 'Prinsip keamanan NIVA: batasan 18+, anti-scam server-side, zero recording WebRTC, Three-Strike system, mekanisme Report & Block, dan panduan keselamatan.',
  alternates: {
    canonical: '/safety',
  },
};

export default function SafetyPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <ShieldAlert className="w-4 h-4" />
          <span>Safety Center & User Protection</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#17151A] tracking-tight">
          Pusat Keamanan NIVA
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] max-w-2xl mx-auto leading-relaxed">
          Designed with privacy and safety controls. Kami membangun infrastruktur server-side untuk meminimalkan risiko pelecehan, penipuan, dan pelanggaran privasi di Kota Semarang.
        </p>
      </div>

      {/* Official Disclaimer & Emergency Hotlines (Section 10) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-amber-500/10 border border-amber-500/25 space-y-4">
        <div className="flex items-center gap-2 font-bold text-amber-950 text-base">
          <AlertCircle className="w-5 h-5 text-amber-800 shrink-0" />
          <span>Pernyataan Penting Mengenai Keselamatan & Layanan Darurat</span>
        </div>
        <p className="text-xs sm:text-sm text-[#4A4235] leading-relaxed">
          NIVA menyediakan mekanisme report, block, dan bantuan admin untuk penyalahgunaan di platform. Jika Anda mengalami kekerasan verbal, ancaman, pelecehan seksual, pemerasan, atau bentuk kekerasan lainnya, simpan bukti yang tersedia dan hubungi admin melalui kanal resmi NIVA.
        </p>
        <p className="text-xs sm:text-sm text-[#4A4235] leading-relaxed font-semibold">
          NIVA tidak menjamin keselamatan absolut atau menyelesaikan seluruh kasus secara hukum. Jika terdapat keadaan darurat atau ancaman langsung terhadap keselamatan fisik, segera hubungi kontak otoritas terkait:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 bg-white/80 rounded-xl border border-amber-500/20 font-medium text-[#17151A]">
            <div className="font-bold text-sm text-[#5B3A6D]">110</div>
            <span>Kepolisian RI (Polrestabes Semarang)</span>
          </div>
          <div className="p-3 bg-white/80 rounded-xl border border-amber-500/20 font-medium text-[#17151A]">
            <div className="font-bold text-sm text-[#5B3A6D]">112</div>
            <span>Panggilan Darurat Terpadu Semarang</span>
          </div>
          <div className="p-3 bg-white/80 rounded-xl border border-amber-500/20 font-medium text-[#17151A]">
            <div className="font-bold text-sm text-[#5B3A6D]">129</div>
            <span>Layanan Sahabat Perempuan & Anak (SAPA)</span>
          </div>
        </div>
      </div>

      {/* What We Collect vs What We Never Collect */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-[#17151A]">Transparansi Data & Privasi</h2>
          <p className="text-xs sm:text-sm text-[#68626D]">
            Kami hanya memproses data minimum yang diperlukan untuk menjalankan sistem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#2D8C6A]/20 shadow-soft space-y-3">
            <h3 className="text-base font-bold text-[#2D8C6A] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Data yang Kami Proses</span>
            </h3>
            <ul className="text-xs text-[#68626D] space-y-2 list-disc pl-4 leading-relaxed">
              <li>Status konfirmasi usia 18+ dan kelayakan area Semarang (tanpa menyimpan koordinat GPS mentah).</li>
              <li>Status sesi percakapan aktif (terhubung / skip / berakhir).</li>
              <li>Cuplikan bukti terpotong (&lt;75 karakter) hanya saat pelanggaran terdeteksi atau dilaporkan secara eksplisit.</li>
              <li>Hash kartu mahasiswa satu arah untuk verifikasi identitas di ekosistem Telegram / Dating.</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#C94B5B]/20 shadow-soft space-y-3">
            <h3 className="text-base font-bold text-[#C94B5B] flex items-center gap-2">
              <Lock className="w-5 h-5" />
              <span>Yang TIDAK Pernah Kami Kumpulkan</span>
            </h3>
            <ul className="text-xs text-[#68626D] space-y-2 list-disc pl-4 leading-relaxed">
              <li>Perekaman panggilan video WebRTC (Zero Recording Guaranteed).</li>
              <li>Penyimpanan percakapan obrolan stranger di database (Ephemeral Transport).</li>
              <li>Koordinat GPS presisi pengguna (latitude/longitude mentah tidak dikirim ke partner).</li>
              <li>Akses pembacaan percakapan stranger bebas oleh tim administrator.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Safety Controls Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#17151A]">Anti-Scam Server-Side</h3>
          <p className="text-xs text-[#68626D] leading-relaxed">
            Penyaringan otomatis format nomor HP Indonesia (+62/08), tautan eksternal phishing, dan kata kunci penipuan finansial untuk mencegah tindak kejahatan di luar platform.
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#C94B5B]/10 text-[#C94B5B] flex items-center justify-center">
            <Flag className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#17151A]">Report & Block Seketika</h3>
          <p className="text-xs text-[#68626D] leading-relaxed">
            Tombol Report dan Block langsung mengakhiri sesi dan mencegah pasangan tersebut dipertemukan kembali selamanya oleh sistem matchmaking.
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#17151A]">Three-Strike Enforcement</h3>
          <p className="text-xs text-[#68626D] leading-relaxed">
            Sistem sanksi bertingkat dari peringatan di chat (Strike 1), cooldown 15 menit (Strike 2), hingga pemblokiran akun permanen (Strike 3).
          </p>
        </div>
      </div>

      {/* Verification Pipeline Architecture (AI + Human Review) */}
      <div className="p-8 rounded-3xl bg-white border border-[#5B3A6D]/15 shadow-soft space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2D8C6A]/10 text-[#2D8C6A] text-xs font-bold">
            <GraduationCap className="w-4 h-4" />
            <span>Ekosistem Terdaftar & Dating Apps</span>
          </div>
          <h2 className="text-2xl font-bold text-[#17151A]">Alur Verifikasi KTM (AI + Manual Review)</h2>
          <p className="text-xs text-[#68626D]">
            Khusus untuk layanan yang memerlukan identitas terverifikasi (NIVA Telegram & Dating Apps):
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-[#68626D]">
          <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-1.5">
            <span className="font-bold text-[#5B3A6D] text-sm">1. Submit KTM</span>
            <p>Pengguna mengunggah foto kartu mahasiswa di bot resmi.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-1.5">
            <span className="font-bold text-[#5B3A6D] text-sm">2. AI Vision</span>
            <p>Validasi otomatis integritas dokumen dan kesesuaian almamater.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-1.5">
            <span className="font-bold text-[#5B3A6D] text-sm">3. Manual Review</span>
            <p>Pemeriksaan manual verifikator jika AI menandai ambiguitas dokumen.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-1.5">
            <span className="font-bold text-[#2D8C6A] text-sm">4. Data Purged</span>
            <p>File fisik foto KTM dihapus permanen maksimal 72 jam.</p>
          </div>
        </div>
      </div>

      {/* Meetup Safety Tips */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#FAF8F6] border border-[#5B3A6D]/15 space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Panduan Bertemu Langsung (Meetup) yang Aman di Semarang
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-[#68626D]">
          <div className="space-y-1.5">
            <h3 className="font-bold text-[#17151A] text-xs sm:text-sm">1. Pilih Lokasi Publik yang Ramai</h3>
            <p className="text-xs leading-relaxed">
              Pilih tempat umum seperti kafe produktif di area Tembalang, Pleburan, Simpang Lima, atau mall besar di Semarang. Jangan pernah setuju bertemu di tempat sepi pada pertemuan pertama.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-[#17151A] text-xs sm:text-sm">2. Beritahu Teman atau Sahabat Anda</h3>
            <p className="text-xs leading-relaxed">
              Kabari teman satu kos atau keluarga mengenai lokasi dan dengan siapa Anda bertemu. Aktifkan fitur live location jika diperlukan.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-[#17151A] text-xs sm:text-sm">3. Gunakan Transportasi Mandiri</h3>
            <p className="text-xs leading-relaxed">
              Datang dan pulanglah secara mandiri menggunakan kendaraan sendiri atau transportasi umum/online untuk kontrol penuh atas mobilitas Anda.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-[#17151A] text-xs sm:text-sm">4. Jaga Keamanan Finansial</h3>
            <p className="text-xs leading-relaxed">
              Jangan pernah meminjamkan uang, melakukan transfer daring, atau membantu transaksi keuangan apa pun kepada seseorang yang baru Anda kenal di internet.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-[#5B3A6D]/10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5B3A6D] hover:text-[#8A5A9A]"
        >
          <span>Kembali ke Beranda NIVA</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="flex gap-4 text-xs text-[#8A5A9A]">
          <Link href="/terms" className="hover:underline">Syarat & Ketentuan</Link>
          <Link href="/privacy" className="hover:underline">Kebijakan Privasi</Link>
          <Link href="/community-guidelines" className="hover:underline">Pedoman Komunitas</Link>
        </div>
      </div>
    </div>
  );
}
