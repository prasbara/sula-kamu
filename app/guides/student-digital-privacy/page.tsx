import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, ShieldCheck, FileCheck, ArrowRight, EyeOff, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Panduan Privasi Digital Mahasiswa & UU PDP — NIVA Semarang',
  description: 'Panduan perlindungan data pribadi untuk mahasiswa di era UU No. 27 Tahun 2022 (UU PDP): hak pemilik data, prinsip minimisasi, dan perlindungan jejak digital.',
  alternates: {
    canonical: '/guides/student-digital-privacy',
  },
};

export default function StudentDigitalPrivacyGuidePage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-14">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <Lock className="w-4 h-4" />
          <span>Literasi Privasi & Regulasi Digital</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight">
          Panduan Privasi Digital Mahasiswa di Era UU PDP
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] leading-relaxed">
          Memahami hak-hak Anda atas data pribadi sesuai UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP) dan bagaimana melindungi privasi saat berinteraksi di ruang online.
        </p>
      </div>

      <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-4 text-xs sm:text-sm text-[#68626D] leading-relaxed">
        <h2 className="text-xl font-bold text-[#17151A]">
          Hak-Hak Pokok Anda sebagai Subjek Data Pribadi
        </h2>
        <p>
          Berdasarkan UU PDP di Indonesia, setiap individu memiliki kendali hukum atas data pribadinya, termasuk:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Hak atas Kejelasan Pemrosesan:</strong> Mengetahui untuk apa data dikumpulkan dan disimpan.</li>
          <li><strong>Hak Akses dan Pembaruan:</strong> Meminta konfirmasi atau perbaikan data yang keliru.</li>
          <li><strong>Hak Penghentian dan Penghapusan (*Right to Erasure*):</strong> Meminta data pribadi dihapus jika tujuan pengumpulannya telah selesai atau Anda mencabut persetujuan.</li>
          <li><strong>Hak Keberatan:</strong> Menolak pemrosesan otomatis yang berdampak signifikan pada diri Anda.</li>
        </ul>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Prinsip Privasi yang Diterapkan di NIVA
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-[#68626D]">
          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-[#5B3A6D]">
              <EyeOff className="w-4 h-4" />
              <span>Minimisasi Data (Data Minimization)</span>
            </div>
            <p>
              Stranger Chat dan Stranger Cam dapat digunakan tanpa mendaftar akun. Kami tidak mengumpulkan nama KTP, email, nomor HP, atau password untuk sesi asing.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-[#2D8C6A]">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero Server Video Recording</span>
            </div>
            <p>
              Panggilan video WebRTC beroperasi secara peer-to-peer antar peramban. Server NIVA tidak memiliki sistem perekaman aliran video atau audio pengguna.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-[#8A5A9A]">
              <Lock className="w-4 h-4" />
              <span>Perlindungan Koordinat GPS</span>
            </div>
            <p>
              Izin lokasi hanya digunakan untuk validasi wilayah Kota & Kabupaten Semarang. Koordinat presisi tidak pernah disimpan permanen atau ditampilkan kepada partner bicara.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-[#E8B4C8]">
              <Database className="w-4 h-4" />
              <span>Retensi Terbatas & Penghapusan</span>
            </div>
            <p>
              Pesan obrolan teks bersifat *ephemeral* dan terhapus seketika setelah sesi berakhir. Pengguna Telegram dapat menjalankan perintah <code>/delete_account</code> kapan saja.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#5B3A6D]/5 border border-[#5B3A6D]/15 flex items-center justify-between">
        <span className="text-xs text-[#68626D]">Ingin membaca kebijakan perlindungan data lengkap?</span>
        <Link
          href="/privacy"
          className="text-xs font-bold text-[#5B3A6D] hover:underline flex items-center gap-1"
        >
          <span>Kebijakan Privasi & Retensi Data NIVA</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
