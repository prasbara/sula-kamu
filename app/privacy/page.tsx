import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, ShieldCheck, Trash2, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi & Perlindungan Data — NIVA Semarang',
  description: 'Kebijakan privasi resmi NIVA: perlindungan data mahasiswa, kebijakan retensi foto KTM 72 jam, enkripsi, dan hak penghapusan akun mandiri.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-display font-bold text-[#17151A] tracking-tight">
          Kebijakan Privasi & Ketentuan Layanan
        </h1>
        <p className="text-sm text-[#68626D]">
          Terakhir diperbarui: September 2026 • Berlaku untuk seluruh pengguna platform NIVA
        </p>
      </div>

      <div className="prose prose-purple max-w-none text-sm text-[#68626D] space-y-8 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">1. Pendahuluan & Prinsip Privasi</h2>
          <p>
            NIVA (selanjutnya disebut &ldquo;Platform&rdquo;, &ldquo;Kami&rdquo;) adalah platform independen sosial dan matchmaking mahasiswa yang beroperasi di wilayah Semarang. Kami berkomitmen menjunjung tinggi hak privasi Anda sesuai dengan Undang-Undang Perlindungan Data Pribadi (UU PDP) Republik Indonesia.
          </p>
          <p>
            Prinsip utama kami adalah <em>Privacy-by-Design</em>: kami hanya mengumpulkan data yang benar-benar esensial untuk memverifikasi keaktifan status mahasiswa dan memfasilitasi interaksi sosial yang aman.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">2. Data yang Kami Kumpulkan</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Data Akun Telegram:</strong> Telegram User ID dan username publik (hanya untuk keperluan routing sesi bot; tidak ditampilkan secara terbuka kepada pengguna lain).</li>
            <li><strong>Data Profil Sukarela:</strong> Nama panggilan, rentang usia (18+), program studi/jurusan, area tempat tinggal di Semarang, bio singkat, dan minat sosial.</li>
            <li><strong>Data Verifikasi:</strong> Nama perguruan tinggi dan foto Kartu Tanda Mahasiswa (KTM).</li>
            <li><strong>Log Keamanan:</strong> Hash kriptografis kartu (SHA-256) untuk mencegah pendaftaran akun ganda.</li>
          </ul>
        </section>

        <section id="retention" className="space-y-3 p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/15">
          <h2 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2D8C6A]" />
            <span>3. Kebijakan Retensi & Pemusnahan Foto KTM</span>
          </h2>
          <p>
            Foto Kartu Tanda Mahasiswa yang Anda kirimkan diproses untuk validasi status mahasiswa oleh sistem AI dan/atau tim verifikator manusia.
          </p>
          <p>
            <strong>Masa Retensi Maksimal 72 Jam:</strong> File gambar fisik KTM Anda akan dimusnahkan secara otomatis maksimal 72 jam setelah peninjauan selesai. NIVA hanya menyimpan hash satu arah (one-way hash) yang tidak dapat dibalik untuk memastikan satu kartu fisik tidak digunakan berulang kali oleh pihak lain.
          </p>
        </section>

        <section id="deletion" className="space-y-3 p-6 rounded-2xl bg-white border border-[#5B3A6D]/15 shadow-soft">
          <h2 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-[#C94B5B]" />
            <span>4. Hak Penghapusan Akun & Data (Right to be Forgotten)</span>
          </h2>
          <p>
            Anda memiliki hak mutlak untuk menghapus akun dan seluruh jejak data Anda dari platform NIVA kapan saja:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Buka bot Telegram NIVA di perangkat Anda.</li>
            <li>Akses menu utama dan ketik perintah <code>/delete_account</code> atau hubungi verifikator kami.</li>
            <li>Setelah konfirmasi, profil Anda, seluruh riwayat like, riwayat match, dan data sesi akan dihapus secara permanen dari basis data aktif.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">5. Pernyataan Non-Afiliasi</h2>
          <p>
            NIVA tidak berafiliasi secara institusional, disponsori, atau berstatus sebagai perwakilan resmi dari universitas, institut, atau politeknik mana pun di Semarang. Penyebutan nama almamater murni berfungsi sebagai pengenal lingkungan belajar bagi mahasiswa.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">6. Hubungi Petugas Privasi Kami</h2>
          <p>
            Jika Anda memiliki pertanyaan mengenai kebijakan privasi, permohonan data, atau pelaporan insiden, silakan hubungi tim kami melalui email resmi atau formulir di halaman Tentang Kami.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-[#5B3A6D]/10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5B3A6D] hover:text-[#8A5A9A]"
        >
          <span>Kembali ke Beranda NIVA</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
