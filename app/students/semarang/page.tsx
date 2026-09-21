import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, MapPin, Send, ShieldCheck, ArrowRight } from 'lucide-react';
import { SITE_CONFIG, SEMARANG_INSTITUTIONS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Komunitas Mahasiswa Semarang — Ekosistem Pendidikan Tinggi & NIVA',
  description: 'Informasi ekosistem pendidikan tinggi di Semarang: panduan pertemanan mahasiswa lintas kampus (UNDIP, UNNES, UDINUS, UNISSULA, SCU, POLINES, dan lainnya) melalui NIVA.',
  alternates: {
    canonical: '/students/semarang',
  },
};

export default function SemarangStudentsPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <GraduationCap className="w-4 h-4" />
          <span>Komunitas Akademik Kota Semarang</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#17151A] tracking-tight">
          Ekosistem Mahasiswa Semarang
        </h1>
        <p className="text-base sm:text-lg text-[#68626D]">
          NIVA dirancang untuk menghubungkan mahasiswa di seluruh spektrum perguruan tinggi negeri, swasta, dan kedinasan di Kota Atlas.
        </p>
      </div>

      {/* Narrative Section */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#5B3A6D]/10 shadow-soft space-y-4 text-sm text-[#68626D] leading-relaxed">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Semarang sebagai Kota Pelajar yang Dinamis
        </h2>
        <p>
          Dengan lebih dari 30 perguruan tinggi yang tersebar dari perbukitan Tembalang dan Gunungpati, kawasan pesisir Semarang Utara, hingga pusat kota Pleburan dan Simpang Lima, Semarang memiliki populasi mahasiswa yang sangat beragam. Mahasiswa membawa latar belakang budaya dari berbagai penjuru Indonesia, menciptakan mozaik sosial yang kaya akan gagasan dan kreativitas.
        </p>
        <p>
          NIVA hadir sebagai jembatan yang meruntuhkan sekat geografis antarkampus, memungkinkan Anda berkenalan dengan mahasiswa dari berbagai disiplin ilmu: kedokteran, teknik, hukum, seni visual, ekonomi, hingga kelautan.
        </p>
      </div>

      {/* Institutions Directory */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-[#17151A]">
              Institusi Pendidikan Tinggi di Semarang
            </h2>
            <p className="text-xs sm:text-sm text-[#68626D]">
              Referensi kampus yang didukung dalam sistem verifikasi kartu mahasiswa NIVA:
            </p>
          </div>
          <span className="text-xs text-[#5B3A6D] font-semibold bg-[#5B3A6D]/10 px-3 py-1.5 rounded-full w-fit">
            {SEMARANG_INSTITUTIONS.length} Perguruan Tinggi
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SEMARANG_INSTITUTIONS.map((inst, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-[#5B3A6D]/10 hover:border-[#5B3A6D]/30 shadow-soft transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base text-[#17151A]">
                  {inst.shortName}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF8F6] text-[#68626D] border">
                  {inst.type}
                </span>
              </div>
              <p className="text-xs text-[#68626D] line-clamp-1 font-medium">
                {inst.fullName}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-[#68626D] pt-1">
                <MapPin className="w-3.5 h-3.5 text-[#8A5A9A]" />
                <span>{inst.area}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer Box */}
      <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/15 text-xs text-[#68626D] leading-relaxed">
        <p className="font-bold text-[#17151A] mb-1">Catatan Kepatuhan Etika & Hukum:</p>
        <p>
          Daftar nama perguruan tinggi di atas ditampilkan murni sebagai referensi almamater mahasiswa di Kota Semarang. NIVA adalah layanan independen dan sama sekali tidak terafiliasi secara resmi, tidak didukung, tidak disponsori, dan tidak dioperasikan oleh perguruan tinggi mana pun di atas.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center pt-4">
        <a
          href={SITE_CONFIG.telegramBotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] shadow-card hover:shadow-hover transition-all"
        >
          <Send className="w-5 h-5" />
          <span>Bergabung dengan Komunitas Semarang di Telegram</span>
        </a>
      </div>
    </div>
  );
}
