import Link from 'next/link';
import { 
  MessageSquare, 
  Sparkles, 
  Ticket, 
  ShieldAlert, 
  Clock, 
  Search, 
  ArrowRight, 
  HelpCircle,
  Lock,
  PhoneCall
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SupportLookupForm from '@/components/SupportLookupForm';

export const metadata = {
  title: 'Pusat Bantuan & Tiket Resmi | NIVA Semarang',
  description: 'Pusat bantuan resmi NIVA untuk mahasiswa dan pengguna di Semarang. Dapatkan jawaban cepat melalui AI Assistant atau buat tiket bantuan resmi kepada tim admin.',
};

export default function SupportCenterPage() {
  return (
    <div className="min-h-screen bg-[#0F0D13] text-[#F3EDF7] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/30 border border-[#5B3A6D]/60 text-xs font-semibold text-[#E8B4C8]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unified Support & Safety Helpdesk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Pusat Bantuan NIVA
          </h1>
          <p className="text-sm text-[#C8BED4] leading-relaxed">
            Ada pertanyaan, kendala teknis, laporan keamanan, kebutuhan verifikasi, atau permohonan kemitraan?
            Gunakan jalur resmi bantuan NIVA di bawah ini.
          </p>
        </div>

        {/* Two Main Support Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Tanya AI NIVA */}
          <div className="bg-gradient-to-b from-[#1C1726] to-[#14111C] border border-[#2B2438] rounded-3xl p-8 flex flex-col justify-between space-y-6 hover:border-[#8A5A9A]/60 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5B3A6D] to-[#8A5A9A] flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Tanya AI NIVA
              </h2>
              <p className="text-xs text-[#C8BED4] leading-relaxed">
                Dapatkan panduan instan 24/7 seputar penggunaan Stranger Chat, Stranger Cam, persyaratan lokasi Semarang, pedoman keamanan, dan hak privasi UU PDP.
              </p>
              <ul className="text-xs text-[#9D93A8] space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Respons cepat dan otomatis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Panduan anti-scam & etika berteman
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Otomatis eskalasi ke tiket jika butuh admin
                </li>
              </ul>
            </div>

            <Link
              href="/ai-support"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg"
            >
              <span>Mulai Percakapan dengan AI</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Buat Ticket Resmi */}
          <div className="bg-gradient-to-b from-[#1C1726] to-[#14111C] border border-[#2B2438] rounded-3xl p-8 flex flex-col justify-between space-y-6 hover:border-[#8A5A9A]/60 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Ticket className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Buat Tiket Bantuan Resmi
              </h2>
              <p className="text-xs text-[#C8BED4] leading-relaxed">
                Hubungi tim staf dan moderator NIVA secara resmi. Cocok untuk masalah akun, laporan pelecehan/scam, kendala pembayaran, verifikasi manual, atau kemitraan.
              </p>
              <ul className="text-xs text-[#9D93A8] space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Penanganan manusia (Admin NIVA)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Antrean berurutan FIFO yang transparan
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Ruang obrolan aman terlindungi token
                </li>
              </ul>
            </div>

            <Link
              href="/support/new"
              className="w-full py-3.5 px-6 rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-lg"
            >
              <span>Buat Tiket Baru Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Existing Ticket Tracker Form */}
        <div className="bg-[#171420] border border-[#2B2438] rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-300">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Sudah Memiliki Tiket? Buka Ruang Obrolan Tiket Anda
              </h3>
              <p className="text-xs text-[#9D93A8]">
                Masukkan ID Tiket (contoh: NIVA-123456) dan Token Akses yang Anda peroleh saat membuat tiket.
              </p>
            </div>
          </div>

          <SupportLookupForm />
        </div>

        {/* Operating Hours & Realistic Availability Disclaimer */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Clock className="w-4 h-4" />
            <span>Ketersediaan Tim & Waktu Respons</span>
          </div>
          <p className="text-xs text-[#C8BED4] leading-relaxed">
            Tim NIVA menangani tiket bantuan berdasarkan antrean kedatangan (FIFO) dan prioritas keamanan. Kami tidak menjanjikan layanan 24/7 tanpa henti. Jika tiket Anda belum langsung mendapat balasan, pesan Anda tetap tersimpan dengan aman di database dan akan diproses saat staf admin aktif.
          </p>
        </div>

        {/* Emergency Situations Alert */}
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
            <ShieldAlert className="w-4 h-4" />
            <span>Kondisi Darurat di Dunia Nyata</span>
          </div>
          <p className="text-xs text-[#E8B4C8] leading-relaxed">
            Jika Anda mengalami ancaman kekerasan fisik, pemerasan langsung, atau situasi darurat yang membahayakan keselamatan jiwa di dunia nyata, prioritaskan keselamatan pribadi Anda dan segera hubungi pihak kepolisian di <strong>110</strong> atau layanan ambulans darurat di <strong>119</strong>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
