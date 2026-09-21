import type { Metadata } from 'next';
import Link from 'next/link';
import { Send, CheckCircle2, ArrowRight, ShieldCheck, HeartHandshake, MessageCircle, Sparkles } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Cara Kerja NIVA — Panduan Lengkap Social Matching Mahasiswa',
  description: 'Pelajari bagaimana NIVA bekerja untuk mahasiswa di Semarang: dari verifikasi kartu mahasiswa, melengkapi profil, menemukan koneksi timbal balik, hingga sesi mengobrol aman.',
  alternates: {
    canonical: '/how-it-works',
  },
};

export default function HowItWorksPage() {
  const steps = [
    {
      step: '01',
      title: 'Akses Bot Telegram Resmi NIVA',
      desc: 'Buka bot Telegram NIVA dan tekan tombol Start. Pastikan Anda telah berusia 18 tahun ke atas dan menyetujui pedoman komunitas serta ketentuan privasi kami.',
    },
    {
      step: '02',
      title: 'Pilih Kampus & Unggah Foto KTM',
      desc: 'Pilih almamater Anda di Semarang dari daftar institusi terdaftar. Kirimkan foto Kartu Tanda Mahasiswa (KTM) yang jelas. AI Vision memeriksa keabsahan kartu secara otomatis.',
    },
    {
      step: '03',
      title: 'Lengkapi Kartu Profil Mahasiswa',
      desc: 'Isi nama panggilan, program studi, area tempat tinggal Anda di Semarang, tujuan berkenalan, dan pilih minimal 3 topik minat yang mencerminkan kepribadian Anda.',
    },
    {
      step: '04',
      title: 'Eksplorasi Profil Mahasiswa Terverifikasi',
      desc: 'Telusuri profil mahasiswa sebaya dari berbagai kampus di Semarang. Setiap profil menampilkan status verifikasi resmi dan kesamaan minat yang Anda miliki.',
    },
    {
      step: '05',
      title: 'Kirimkan Like (Mutual Matching)',
      desc: 'Jika Anda menemukan profil yang menarik, kirimkan like. Percakapan hanya akan terbuka jika profil tersebut juga menyukai Anda kembali (timbal balik).',
    },
    {
      step: '06',
      title: 'Mulai Percakapan Melalui Chat Aman',
      desc: 'Setelah match, buka ruang obrolan terenkripsi yang difasilitasi oleh bot NIVA. Anda dapat saling menyapa, bertukar pandangan, dan memutuskan kapan waktu yang tepat untuk berteman lebih dekat.',
    },
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Panduan Penggunaan NIVA</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#17151A] tracking-tight">
          Cara Kerja NIVA
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] max-w-2xl mx-auto">
          Membangun relasi pertemanan dan menemukan seseorang yang sefrekuensi di lingkungan kampus Semarang kini lebih mudah, transparan, dan aman.
        </p>
      </div>

      {/* Step by step cards */}
      <div className="space-y-6">
        {steps.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row gap-6 p-8 bg-white rounded-2xl border border-[#5B3A6D]/10 shadow-soft hover:shadow-card transition-all"
          >
            <div className="flex-shrink-0">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#5B3A6D] to-[#8A5A9A] text-white font-display font-bold text-xl shadow-md">
                {item.step}
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#17151A]">{item.title}</h2>
              <p className="text-sm text-[#68626D] leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mutual Match Philosophy */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#FAF8F6] border border-[#5B3A6D]/15 space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Mengapa Menggunakan Model Ketertarikan Bersama (Mutual Interest)?
        </h2>
        <p className="text-sm text-[#68626D] leading-relaxed">
          Pada aplikasi chatting konvensional, siapa pun bisa mengirim pesan tanpa izin, yang sering kali menimbulkan spam dan rasa tidak nyaman. NIVA menerapkan model <strong>Double Opt-In</strong>: percakapan hanya terbuka jika kedua belah pihak secara sadar telah menyetujui untuk saling berkenalan. Hal ini menjamin bahwa setiap percakapan dimulai dari rasa ketertarikan yang setara.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#17151A]">
            <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" /> Tanpa Pesan Spam
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#17151A]">
            <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" /> Privasi Kontak Asli Terjaga
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#17151A]">
            <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" /> Kendali Pemblokiran Instan
          </div>
        </div>
      </div>

      {/* CTA Box */}
      <div className="text-center pt-8">
        <a
          href={SITE_CONFIG.telegramBotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] shadow-md hover:shadow-hover transition-all"
        >
          <Send className="w-5 h-5" />
          <span>Mulai di Telegram Sekarang</span>
        </a>
      </div>
    </div>
  );
}
