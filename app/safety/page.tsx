import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, ShieldCheck, Lock, Flag, UserX, Trash2, AlertCircle, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Pusat Keamanan & Perlindungan Pengguna — NIVA Semarang',
  description: 'Prinsip keamanan NIVA: batasan 18+, verifikasi identitas mahasiswa, fitur lapor dan blokir seketika, moderasi anti-konten eksplisit, dan tips kencan sehat.',
  alternates: {
    canonical: '/safety',
  },
};

export default function SafetyPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C94B5B]/10 text-[#C94B5B] text-xs font-semibold">
          <ShieldAlert className="w-4 h-4" />
          <span>Komitmen Keselamatan Pengguna</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#17151A] tracking-tight">
          Pusat Keamanan & Privasi NIVA
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] max-w-2xl mx-auto">
          Menciptakan ruang perkenalan mahasiswa yang bermartabat, sehat, bebas pelecehan, dan melindungi privasi setiap individu.
        </p>
      </div>

      {/* Safety Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#17151A]">1. Batasan Usia Tegas: 18+ Only</h2>
          <p className="text-sm text-[#68626D] leading-relaxed">
            NIVA secara khusus ditujukan bagi mahasiswa dewasa muda (minimal 18 tahun). Siapa pun yang terbukti berusia di bawah 18 tahun akan diblokir dari sistem demi mematuhi hukum perlindungan anak dan keselamatan digital.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#C94B5B]/10 text-[#C94B5B] flex items-center justify-center">
            <Flag className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#17151A]">2. Fitur Lapor Seketika (Report)</h2>
          <p className="text-sm text-[#68626D] leading-relaxed">
            Setiap jendela chat bot dilengkapi dengan tombol <strong>Lapor Pengguna</strong>. Kategori pelanggaran meliputi spam, pelecehan kata, ajakan komersial/transaksional, atau pemalsuan identitas. Tim verifikator menindaklanjuti laporan secara berkala.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#17151A]">3. Blokir Permanen (Block)</h2>
          <p className="text-sm text-[#68626D] leading-relaxed">
            Jika Anda merasa tidak nyaman dengan seseorang, tekan tombol <strong>Blokir</strong>. Hubungan match akan diputus seketika, dan pihak yang diblokir tidak akan pernah dapat menghubungi Anda lagi di platform NIVA.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#17151A]">4. Proteksi Anti-Konten Vulgar (NSFW)</h2>
          <p className="text-sm text-[#68626D] leading-relaxed">
            Sistem moderasi gambar menyaring foto profil dengan deteksi pola warna kulit dan analisis visual untuk mencegah pengunggahan materi vulgar, pornografi, atau konten yang melanggar kesopanan publik.
          </p>
        </div>
      </div>

      {/* Offline Safety Tips for Semarang Students */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#FAF8F6] border border-[#5B3A6D]/15 space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Panduan Bertemu Langsung (Meetup) yang Aman di Semarang
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-[#68626D]">
          <div className="space-y-2">
            <h3 className="font-bold text-[#17151A]">1. Pilih Lokasi Publik yang Ramai</h3>
            <p>
              Gunakan tempat umum seperti kafe produktif di area Tembalang, Pleburan, Simpang Lima, atau mall besar di Semarang. Jangan pernah setuju bertemu di tempat sepi atau ruangan privat pada pertemuan pertama.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-[#17151A]">2. Beritahu Teman atau Sahabat Anda</h3>
            <p>
              Kabari teman satu kos atau keluarga mengenai lokasi dan dengan siapa Anda bertemu. Aktifkan fitur *live location* jika diperlukan.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-[#17151A]">3. Gunakan Transportasi Mandiri</h3>
            <p>
              Datang dan pulanglah secara mandiri menggunakan kendaraan sendiri atau transportasi umum/online. Hal ini memastikan Anda memiliki kontrol penuh atas mobilitas Anda.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-[#17151A]">4. Jaga Keamanan Finansial</h3>
            <p>
              Jangan pernah meminjamkan uang, melakukan transfer daring, atau membantu transaksi keuangan apa pun kepada seseorang yang baru Anda kenal di internet.
            </p>
          </div>
        </div>
      </div>

      {/* Data Deletion Link */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#5B3A6D]/10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-[#17151A]">Ingin Menghapus Akun dan Data Anda?</h3>
          <p className="text-xs text-[#68626D]">
            Anda berhak menghapus profil dan data verifikasi Anda secara permanen kapan pun Anda inginkan.
          </p>
        </div>
        <Link
          href="/privacy#deletion"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-[#5B3A6D] bg-[#5B3A6D]/10 hover:bg-[#5B3A6D]/20 transition-colors"
        >
          <span>Panduan Hapus Akun</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
