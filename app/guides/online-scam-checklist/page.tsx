import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, CheckCircle2, AlertOctagon, ArrowRight, Lock, Eye } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Checklist Deteksi Scam & Akun Palsu — NIVA Semarang',
  description: 'Daftar periksa lengkap untuk mendeteksi penipuan online, pinjaman bodong, catfishing, dan manipulasi kontak di kalangan mahasiswa Semarang.',
  alternates: {
    canonical: '/guides/online-scam-checklist',
  },
};

export default function OnlineScamChecklistPage() {
  const scamPatterns = [
    {
      title: 'Permintaan Pinjaman Cepat / Dompet Ketinggalan',
      trigger: 'Baru kenal kurang dari 48 jam tetapi sudah meminta transfer Rp 50.000 - Rp 200.000 dengan alasan saldo habis atau darurat.',
      verdict: 'PASTI SCAM. Segera blokir dan jangan pernah transfer.',
    },
    {
      title: 'Tautan Verifikasi / Undian / Vote Kampus Eksternal',
      trigger: 'Mengirimkan link mencurigakan (bit.ly, domain aneh) dan meminta Anda login dengan akun Google atau memasukkan kode OTP.',
      verdict: 'PHISHING / PENCURIAN AKUN. Jangan klik tautan tersebut.',
    },
    {
      title: 'Foto Profil Katalog / Selebgram Luar Negeri',
      trigger: 'Foto tampak seperti foto model profesional tanpa nuansa keseharian mahasiswa Indonesia, dan menolak video call dengan alasan kamera rusak.',
      verdict: 'POTENSI CATFISHING / AKUN PALSU. Waspadalah.',
    },
    {
      title: 'Penawaran Kerja Paruh Waktu / Review Produk Cuan Instan',
      trigger: 'Mengajak bergabung ke grup Telegram tertentu untuk tugas like/subscribe YouTube berbayar dengan deposit awal.',
      verdict: 'SKEMA PENIPUAN TUGAS (TASK SCAM). Modus kejahatan siber yang marak.',
    },
    {
      title: 'Desakan Pindah ke WhatsApp Tanpa Alasan Jelas',
      trigger: 'Baru menyapa satu kalimat langsung mendesak meminta nomor WA pribadi untuk menghindari moderasi platform.',
      verdict: 'POTENSI SPAM / HARASSMENT. Tetaplah di platform yang aman.',
    },
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-14">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4" />
          <span>Panduan Anti-Penipuan Digital</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight">
          Checklist Deteksi Scam & Akun Palsu untuk Mahasiswa
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] leading-relaxed">
          Gunakan panduan periksa ini untuk mengenali pola penipuan, rekayasa sosial (*social engineering*), dan manipulasi digital saat berinteraksi di ruang online.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          5 Modus Scam Paling Umum di Kalangan Mahasiswa
        </h2>

        <div className="space-y-4">
          {scamPatterns.map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-700 font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <h3 className="font-bold text-base text-[#17151A]">{item.title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#68626D] pl-8">
                <strong>Ciri / Tanda:</strong> {item.trigger}
              </p>
              <div className="pl-8 text-xs font-bold text-rose-700">
                ➔ {item.verdict}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-[#5B3A6D]/15 shadow-soft space-y-4">
        <h3 className="font-bold text-lg text-[#17151A]">
          Bagaimana NIVA Membantu Menangkal Scam?
        </h3>
        <ul className="text-xs sm:text-sm text-[#68626D] space-y-2 list-disc pl-5 leading-relaxed">
          <li><strong>Penyensoran Nomor Kontak Otomatis:</strong> Mendeteksi pola nomor telepon (+62/08) pada chat acak untuk mencegah penipuan finansial.</li>
          <li><strong>Pembersihan Unicode Homoglyph:</strong> Mencegah teks penipuan yang disamarkan (contoh: leetspeak, simbol judi online).</li>
          <li><strong>Tombol Report & Block Instan:</strong> Menutup komunikasi dan mengalirkan laporan ke antrean admin.</li>
        </ul>
        <div className="pt-2">
          <Link
            href="/safety"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#5B3A6D] hover:underline"
          >
            <span>Pelajari Pusat Keamanan NIVA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
