import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, MapPin, PhoneCall, AlertTriangle, ArrowRight, CheckCircle2, UserCheck, HeartHandshake } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Panduan Keselamatan Bertemu Tatap Muka (Safe Meetup Guide) — NIVA Semarang',
  description: 'Checklist keselamatan lengkap saat memutuskan bertemu teman baru di dunia nyata: pemilihan tempat publik di Semarang, transportasi mandiri, hak menolak, dan batas platform.',
  alternates: {
    canonical: '/guides/safe-meetup',
  },
};

export default function SafeMeetupGuidePage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-14">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <HeartHandshake className="w-4 h-4" />
          <span>Panduan Komunitas Mahasiswa</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight">
          Panduan Bertemu Tatap Muka yang Aman di Semarang
        </h1>
        <p className="text-base sm:text-lg text-[#68626D] leading-relaxed">
          NIVA memfasilitasi interaksi daring yang terarah. Namun, jika Anda dan teman obrolan memutuskan untuk berjumpa langsung di dunia nyata, keselamatan fisik dan kenyamanan Anda adalah tanggung jawab pribadi yang harus dipersiapkan dengan cermat.
        </p>
      </div>

      {/* Critical Core Principle */}
      <div className="p-6 sm:p-8 rounded-3xl bg-amber-500/10 border border-amber-500/25 space-y-3">
        <div className="flex items-center gap-2 text-amber-950 font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0" />
          <span>Prinsip Utama: Anda Tidak Pernah Wajib Bertemu</span>
        </div>
        <p className="text-xs sm:text-sm text-[#4A4235] leading-relaxed">
          Tidak ada kewajiban untuk bertemu seseorang hanya karena Anda telah berbincang atau bertukar pesan. Jika Anda merasa ragu, canggung, atau tidak nyaman, <strong>Anda memiliki hak mutlak untuk membatalkan rencana pertemuan kapan saja</strong> tanpa rasa bersalah.
        </p>
      </div>

      {/* 5-Step Safe Meetup Checklist */}
      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-[#17151A]">
          Checklist Keselamatan Pertemuan Pertama
        </h2>

        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2D8C6A] shrink-0" />
              <span>1. Selalu Pilih Tempat Publik yang Ramai di Siang/Sore Hari</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#68626D] leading-relaxed pl-7">
              Jangan pernah setuju bertemu di tempat sepi, kos pribadi, kamar hotel, atau kendaraan tertutup. Pilihlah kafe produktif yang ramai di kawasan Simpang Lima, mall di Jl. Pemuda/Gajahmada, kafe terbuka di Pleburan, atau pujasera kampus di siang atau sore hari.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2D8C6A] shrink-0" />
              <span>2. Beri Tahu Sahabat atau Teman Sekos</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#68626D] leading-relaxed pl-7">
              Beri tahu teman terpercaya mengenai: nama orang yang Anda temui, nomor kontaknya, nama kafe/lokasi spesifik, dan jam berapa Anda berencana kembali ke kos. Anda juga dapat mengaktifkan fitur berbagi lokasi sementara (*live location*) dengan sahabat Anda.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2D8C6A] shrink-0" />
              <span>3. Gunakan Transportasi Mandiri yang Anda Kendalikan</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#68626D] leading-relaxed pl-7">
              Pada pertemuan pertama, hindari dijemput atau diantar pulang oleh orang yang baru dikenal. Datanglah dengan kendaraan sendiri atau transportasi umum/online agar Anda memiliki kendali penuh untuk pulang sewaktu-waktu.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2D8C6A] shrink-0" />
              <span>4. Jangan Terlibat Transaksi Finansial</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#68626D] leading-relaxed pl-7">
              Setiap pihak bertanggung jawab atas pesanan makanan atau minumannya masing-masing. Jangan pernah meminjamkan uang, kartu pembayaran, atau mentransfer saldo e-wallet kepada orang yang baru Anda kenal.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2D8C6A] shrink-0" />
              <span>5. Jaga Minuman dan Barang Bawaan Pribadi</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#68626D] leading-relaxed pl-7">
              Jangan tinggalkan cangkir minuman, ponsel, atau tas tanpa pengawasan saat pergi ke toilet. Jika Anda meninggalkan meja untuk waktu lama, pesanlah minuman baru demi keamanan.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Contacts Box */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-4">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-[#8A5A9A]" />
          <span>Kontak Layanan Darurat Kota Semarang</span>
        </h3>
        <p className="text-xs text-gray-300 leading-relaxed">
          Jika dalam situasi pertemuan langsung terjadi ancaman fisik, pemerasan, atau keadaan darurat, prioritaskan keselamatan diri dan segera hubungi:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            <div className="text-base font-bold text-emerald-400">110</div>
            <span>Polrestabes Semarang (Kepolisian)</span>
          </div>
          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            <div className="text-base font-bold text-emerald-400">112</div>
            <span>Panggilan Darurat Bebas Pulsa Pemkot</span>
          </div>
          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            <div className="text-base font-bold text-emerald-400">129</div>
            <span>Layanan Perlindungan Perempuan & Anak (SAPA)</span>
          </div>
        </div>
      </div>

      {/* Internal Nav */}
      <div className="flex items-center justify-between pt-6 border-t border-[#5B3A6D]/15 text-xs text-[#5B3A6D]">
        <Link href="/safety" className="hover:underline flex items-center gap-1 font-semibold">
          ← Kembali ke Pusat Keamanan NIVA
        </Link>
        <Link href="/blog" className="hover:underline flex items-center gap-1 font-semibold">
          Baca Artikel Panduan Sosial Lainnya →
        </Link>
      </div>
    </div>
  );
}
