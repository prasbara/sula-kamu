import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, HeartHandshake, Lock, ArrowUpRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-[#17151A] text-white pt-16 pb-12 border-t border-[#5B3A6D]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
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
              <span className="font-display font-bold text-2xl tracking-tight text-white">NIVA</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed font-normal">
              {SITE_CONFIG.descriptor}.
              <br />
              <span className="italic text-[#E8B4C8]">“{SITE_CONFIG.tagline}”</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ShieldCheck className="w-4 h-4 text-[#2D8C6A]" />
              <span>18+ Khusus Mahasiswa Semarang</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Platform & Panduan
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  Cara Kerja NIVA
                </Link>
              </li>
              <li>
                <Link href="/student-verification" className="hover:text-white transition-colors">
                  Sistem Verifikasi KTM
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
                  Blog & Tips Mahasiswa
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety & Compliance */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Keamanan & Legalitas
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/safety" className="hover:text-white transition-colors">
                  Pusat Keamanan Akun
                </Link>
              </li>
              <li>
                <Link href="/community-guidelines" className="hover:text-white transition-colors">
                  Pedoman Komunitas
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link href="/privacy#retention" className="hover:text-white transition-colors">
                  Penghapusan Data & KTM
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Tentang NIVA
                </Link>
              </li>
            </ul>
          </div>

          {/* Bot & Support */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Mulai Terhubung
            </h3>
            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              Bergabunglah dengan ribuan mahasiswa terverifikasi di Semarang melalui bot resmi Telegram NIVA.
            </p>
            <a
              href={SITE_CONFIG.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] transition-colors border border-white/10"
            >
              <span>Buka di Telegram</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="mt-8 pt-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 leading-relaxed">
            <p className="font-semibold text-white mb-1">Pernyataan Status Independen (Disclaimer):</p>
            <p>
              {SITE_CONFIG.independentNotice} Seluruh nama universitas, politeknik, dan institut di wilayah Semarang yang disebutkan semata-mata digunakan sebagai referensi almamater mahasiswa dan tidak mengindikasikan adanya kemitraan resmi, kepemilikan, dukungan, atau sponsor oleh pihak perguruan tinggi bersangkutan.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
            <p>© {new Date().getFullYear()} NIVA. Seluruh hak cipta dilindungi.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-gray-200">
                Privasi
              </Link>
              <Link href="/community-guidelines" className="hover:text-gray-200">
                Aturan Etika
              </Link>
              <Link href="/about" className="hover:text-gray-200">
                Kontak Reviewer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
