import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, ArrowRight, Send } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Tanya Jawab (FAQ) — NIVA Semarang',
  description: 'Pertanyaan yang sering diajukan mengenai NIVA: cara verifikasi KTM, pendaftaran bot Telegram, privasi mahasiswa, dan aturan matchmaking di Semarang.',
  alternates: {
    canonical: '/faq',
  },
};

export default function FaqPage() {
  const allFaqs = [
    {
      q: 'Apa itu NIVA?',
      a: 'NIVA adalah platform sosial dan matchmaking independen berbasis mahasiswa, yang dirancang khusus untuk memfasilitasi perkenalan sehat dan bermakna di antara mahasiswa perguruan tinggi di wilayah Semarang.',
    },
    {
      q: 'Apakah NIVA resmi bekerjasama dengan universitas di Semarang?',
      a: 'Tidak. NIVA adalah layanan independen dan bukan milik atau perwakilan resmi kampus mana pun. Kami menyebutkan nama-nama perguruan tinggi di Semarang hanya sebagai referensi almamater mahasiswa.',
    },
    {
      q: 'Mengapa NIVA mewajibkan verifikasi KTM?',
      a: 'Verifikasi Kartu Tanda Mahasiswa bertujuan mengurangi akun palsu, akun komersial, bot promosi, dan pihak-pihak di luar komunitas mahasiswa. Hal ini menciptakan rasa saling percaya yang lebih tinggi di antara pengguna.',
    },
    {
      q: 'Bagaimana jika saya belum memiliki KTM fisik (mahasiswa baru)?',
      a: 'Anda dapat mengunggah tangkapan layar kartu mahasiswa digital resmi dari portal akademik universitas Anda (SIAKAD) yang memuat nama jelas, nomor mahasiswa, dan nama institusi Anda.',
    },
    {
      q: 'Apakah teman saya di kampus lain (misalnya UNDIP dengan UNNES atau UNISSULA) bisa saling bertemu?',
      a: 'Ya, tentu saja! Salah satu misi utama NIVA adalah membantu Anda memperluas jaringan pertemanan di luar lingkungan kampus sendiri di seluruh Semarang.',
    },
    {
      q: 'Apakah ada biaya berlangganan?',
      a: 'Tidak ada biaya. Fitur verifikasi, pencarian profil, dan sesi chat di NIVA dapat dinikmati secara gratis dengan alokasi like harian yang wajar bagi setiap mahasiswa terverifikasi.',
    },
    {
      q: 'Apakah orang lain bisa melihat nomor HP atau username Telegram asli saya?',
      a: 'Tidak. Obrolan awal dilakukan melalui perantara bot NIVA yang terlindungi. Data kontak pribadi Anda tidak akan pernah dibagikan tanpa persetujuan eksplisit dari Anda sendiri.',
    },
    {
      q: 'Apa yang harus saya lakukan jika menemukan pengguna yang melanggar aturan?',
      a: 'Gunakan tombol "Lapor" atau "Blokir" yang tersedia di panel chat. Laporan Anda akan segera ditinjau oleh tim moderasi kami.',
    },
    {
      q: 'Bagaimana cara menghapus akun dan riwayat saya?',
      a: 'Anda dapat mengirimkan perintah /delete_account pada bot Telegram NIVA. Seluruh profil, foto, dan preferensi Anda akan dihapus secara permanen dari server kami.',
    },
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <HelpCircle className="w-4 h-4" />
          <span>Pusat Informasi</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-[#17151A] tracking-tight">
          Pertanyaan yang Sering Diajukan (FAQ)
        </h1>
        <p className="text-base text-[#68626D] max-w-2xl mx-auto">
          Temukan jawaban atas berbagai pertanyaan seputar pendaftaran, privasi, dan cara penggunaan NIVA di Semarang.
        </p>
      </div>

      <div className="space-y-6">
        {allFaqs.map((faq, idx) => (
          <div
            key={idx}
            className="p-6 sm:p-8 bg-white rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-2.5"
          >
            <h2 className="text-lg font-bold text-[#17151A]">{faq.q}</h2>
            <p className="text-sm text-[#68626D] leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="text-center pt-8 space-y-4">
        <p className="text-sm text-[#68626D]">Masih punya pertanyaan lain yang belum terjawab?</p>
        <a
          href={SITE_CONFIG.telegramBotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] shadow-md"
        >
          <Send className="w-4 h-4" />
          <span>Tanyakan Langsung di Bot NIVA</span>
        </a>
      </div>
    </div>
  );
}
