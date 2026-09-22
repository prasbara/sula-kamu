import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, ArrowUpRight, Mail, Send, MapPin, HeartHandshake } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-[#17151A] text-white pt-16 pb-12 border-t border-[#5B3A6D]/20 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-white/10">
          {/* Brand Info */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center">
                <Image
                  src="/logo-icon.png"
                  alt="NIVA Logo"
                  width={34}
                  height={34}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="font-display font-bold text-2xl tracking-tight text-white block">NIVA</span>
                <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Semarang, Jawa Tengah</span>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed max-w-sm">
              Platform social connection, safe matchmaking, dan Stranger Cam untuk pengguna dewasa di Semarang.
              <br />
              <span className="italic text-[#E8B4C8]">“Meet someone worth knowing.”</span>
            </p>
            <div className="space-y-1 text-gray-400 text-[11px] pt-1">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#8A5A9A]" />
                <span>Email Dukungan: team@niva.id</span>
              </div>
              <div className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-[#2D8C6A]" />
                <span>Bot Telegram Resmi: @nivasocialmakingbot</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#5B3A6D]" />
                <span>Lokasi Operasional: Semarang, Jawa Tengah, Indonesia</span>
              </div>
            </div>
          </div>

          {/* Column 1: Platform & Panduan */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Platform & Panduan
            </h3>
            <ul className="space-y-2.5 text-gray-300">
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  Cara Kerja NIVA
                </Link>
              </li>
              <li>
                <Link href="/stranger-chat" className="hover:text-white transition-colors">
                  Stranger Chat
                </Link>
              </li>
              <li>
                <Link href="/stranger-cam" className="hover:text-white transition-colors">
                  Stranger Cam
                </Link>
              </li>
              <li>
                <a href={SITE_CONFIG.telegramBotUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                  <span>NIVA Telegram</span>
                  <ArrowUpRight className="w-3 h-3 text-gray-500" />
                </a>
              </li>
              <li>
                <Link href="/student-verification" className="hover:text-white transition-colors">
                  Student Verification (KTM)
                </Link>
              </li>
              <li>
                <Link href="/students/semarang" className="hover:text-white transition-colors">
                  Ekosistem Kampus Semarang
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  Tanya Jawab (FAQ)
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog & Panduan Sosial
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Keamanan & Privasi */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Keamanan & Privasi
            </h3>
            <ul className="space-y-2.5 text-gray-300">
              <li>
                <Link href="/safety" className="hover:text-white transition-colors">
                  Pusat Keamanan
                </Link>
              </li>
              <li>
                <Link href="/community-guidelines" className="hover:text-white transition-colors">
                  Pedoman Komunitas
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Kebijakan Privasi & UU PDP
                </Link>
              </li>
              <li>
                <Link href="/privacy#retention" className="hover:text-white transition-colors">
                  Penghapusan Data & Retensi
                </Link>
              </li>
              <li>
                <Link href="/guides/safe-meetup" className="hover:text-white transition-colors text-rose-300 font-medium">
                  Meetup Safety (Tatap Muka)
                </Link>
              </li>
              <li>
                <Link href="/guides/online-scam-checklist" className="hover:text-white transition-colors">
                  Checklist Anti-Scam
                </Link>
              </li>
              <li>
                <Link href="/guides/student-digital-privacy" className="hover:text-white transition-colors">
                  Literasi Privasi Mahasiswa
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Syarat & Ketentuan Layanan
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Bisnis & Trust */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Bisnis, Trust & Kemitraan
            </h3>
            <ul className="space-y-2.5 text-gray-300">
              <li>
                <Link href="/advertise" className="hover:text-white transition-colors text-purple-300 font-semibold flex items-center gap-1">
                  <span>Beriklan di NIVA</span>
                  <span className="text-[9px] bg-purple-900/60 text-purple-200 px-1.5 py-0.2 rounded border border-purple-500/30">Ad</span>
                </Link>
              </li>
              <li>
                <Link href="/advertising-policy" className="hover:text-white transition-colors">
                  Kebijakan Iklan NIVA
                </Link>
              </li>
              <li>
                <Link href="/community-partners" className="hover:text-white transition-colors">
                  Community Partnership
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-white transition-colors">
                  Ulasan Asli Pengguna
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Tentang NIVA
                </Link>
              </li>
              <li>
                <Link href="/about#contact" className="hover:text-white transition-colors">
                  Hubungi Tim NIVA
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Independent Platform Legal Disclaimer Box */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 leading-relaxed text-[11px]">
            <p className="font-semibold text-white mb-1">Pernyataan Status Independen (Disclaimer):</p>
            <p>
              {SITE_CONFIG.independentNotice} Seluruh nama universitas, politeknik, institut, dan akademi di wilayah Kota dan Kabupaten Semarang yang disebutkan di platform ini semata-mata digunakan sebagai referensi almamater mahasiswa dan tidak mengindikasikan adanya kemitraan resmi, kepemilikan, dukungan, atau sponsor oleh pihak perguruan tinggi bersangkutan kecuali dinyatakan secara tertulis melalui perjanjian kemitraan resmi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-gray-400 gap-4 text-[11px] pt-2">
            <p>© {new Date().getFullYear()} NIVA. Seluruh hak cipta dilindungi undang-undang.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white">Privasi</Link>
              <Link href="/terms" className="hover:text-white">Syarat</Link>
              <Link href="/safety" className="hover:text-white">Keamanan</Link>
              <Link href="/about" className="hover:text-white">Tentang</Link>
              <Link href="/advertise" className="hover:text-white">Iklan</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
