import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Mail, HeartHandshake, Compass, ArrowRight, Ticket } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Tentang NIVA — Misi & Nilai Platform Mahasiswa Semarang',
  description: 'Mengenal visi NIVA: inisiatif independen yang membantu mahasiswa Semarang menemukan koneksi bermakna dalam lingkungan yang aman, terverifikasi, dan bebas penipuan.',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-16">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Misi & Filosofi Kami</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#17151A] tracking-tight">
          Tentang NIVA
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] max-w-2xl mx-auto">
          Membangun ruang sosial mahasiswa yang lebih sehat, bermakna, dan bertanggung jawab.
        </p>
      </div>

      <div className="space-y-8 text-sm text-[#68626D] leading-relaxed">
        <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-4">
          <h2 className="text-2xl font-display font-bold text-[#17151A]">
            Mengapa NIVA Hadir?
          </h2>
          <p>
            Masa perkuliahan adalah salah satu periode paling formatif dalam kehidupan seseorang. Di kota pendidikan seperti Semarang—tempat puluhan ribu mahasiswa dari berbagai penjuru nusantara berkumpul—banyak anak muda menghadapi kesulitan dalam memperluas lingkaran sosial mereka di luar kelas atau jurusan.
          </p>
          <p>
            Di sisi lain, aplikasi kencan umum saat ini sering kali terasa melelahkan: dipenuhi akun palsu, bot promosi, serta interaksi yang kurang menghargai privasi dan norma pertemanan yang sehat.
          </p>
          <p>
            NIVA hadir sebagai jawaban: sebuah platform independen yang mengutamakan <strong>sinyal keaktifan mahasiswa</strong>, <strong>kesamaan minat</strong>, dan <strong>perlindungan privasi terdepan</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-2">
            <h3 className="font-bold text-[#17151A] text-base flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#5B3A6D]" /> Visi Kami
            </h3>
            <p className="text-xs sm:text-sm">
              Menjadi wadah interaksi sosial paling tepercaya bagi generasi mahasiswa di Semarang, membantu setiap orang menemukan teman belajar, sahabat hobi, maupun pasangan hidup yang tepat.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-2">
            <h3 className="font-bold text-[#17151A] text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2D8C6A]" /> Nilai Utama
            </h3>
            <p className="text-xs sm:text-sm">
              Kejujuran identitas, penghargaan terhadap batasan privasi, ketiadaan konten eksplisit/vulgar, serta kebebasan dari manipulasi algoritma komersial.
            </p>
          </div>
        </div>

        {/* Independent statement */}
        <div className="p-6 rounded-2xl bg-white border border-[#5B3A6D]/15 space-y-3">
          <h3 className="font-bold text-[#17151A] text-base">Status Hukum & Non-Afiliasi</h3>
          <p className="text-xs text-[#68626D] leading-relaxed">
            NIVA didirikan sebagai proyek teknologi komunitas independen. NIVA bukan merupakan bagian resmi dari institusi perguruan tinggi negeri maupun swasta di Semarang. Kami beroperasi secara mandiri demi menjaga netralitas dan keterbukaan layanan bagi mahasiswa dari seluruh kampus.
          </p>
        </div>

        {/* Contact section */}
        <div id="contact" className="p-8 rounded-2xl bg-gradient-to-br from-[#5B3A6D]/10 to-[#8A5A9A]/10 border border-[#5B3A6D]/20 space-y-4">
          <h3 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#5B3A6D]" /> Pusat Bantuan NIVA
          </h3>
          <p className="text-xs sm:text-sm text-[#68626D] leading-relaxed">
            Ada pertanyaan, laporan keamanan, masalah akun, kebutuhan verifikasi manual, atau ingin bekerja sama dengan NIVA? <strong>Buat Tiket Bantuan melalui NIVA.</strong>
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/support"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white font-bold text-xs hover:opacity-95 transition-all shadow-md"
            >
              <span>Buka Pusat Bantuan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/ai-support"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#2B2438]/20 text-[#17151A] font-bold text-xs hover:bg-slate-50 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5B3A6D]" />
              <span>Tanya AI NIVA</span>
            </Link>
          </div>
          <p className="text-[11px] text-[#8C8494] pt-1">
            Tim NIVA mungkin tidak selalu tersedia 24/7. Jika pesan belum langsung mendapat respons, tiket Anda tetap tersimpan dan dapat ditindaklanjuti oleh staf admin ketika tersedia.
          </p>
        </div>
      </div>
    </div>
  );
}
