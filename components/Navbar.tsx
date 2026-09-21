'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ShieldCheck, Send } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F6]/90 backdrop-blur-md border-b border-[#5B3A6D]/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Descriptor */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#5B3A6D] rounded-lg p-1">
            <div className="relative w-10 h-10 rounded-xl bg-white shadow-sm border border-[#5B3A6D]/15 flex items-center justify-center p-1 group-hover:scale-105 transition-transform overflow-hidden">
              <Image
                src="/logo-icon.png"
                alt="NIVA Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-2xl tracking-tight text-[#3B123F]">
                NIVA
              </span>
              <span className="text-[10px] tracking-wide text-[#68626D] font-medium hidden sm:inline-block">
                Student Social & Matchmaking Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2" aria-label="Main Navigation">
            <Link
              href="/how-it-works"
              className="px-3 py-2 text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors"
            >
              Cara Kerja
            </Link>
            <Link
              href="/safety"
              className="px-3 py-2 text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors"
            >
              Keamanan
            </Link>
            <Link
              href="/student-verification"
              className="px-3 py-2 text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors"
            >
              Verifikasi KTM
            </Link>
            <Link
              href="/students/semarang"
              className="px-3 py-2 text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors"
            >
              Kampus Semarang
            </Link>
            <Link
              href="/premium"
              className="px-3 py-2 text-sm font-semibold text-[#8A5A9A] hover:text-[#5B3A6D] hover:bg-[#8A5A9A]/10 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Premium</span>
              <span className="text-[9px] bg-[#E8B4C8] text-[#17151A] font-bold px-1.5 py-0.2 rounded-full">Rp5k</span>
            </Link>
            <Link
              href="/stranger-cam"
              className="px-3 py-2 text-sm font-semibold text-[#8A5A9A] hover:text-[#5B3A6D] hover:bg-[#8A5A9A]/10 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Stranger Cam</span>
              <span className="text-[9px] bg-[#5B3A6D] text-white font-bold px-1.5 py-0.5 rounded-full">Soon</span>
            </Link>
            <Link
              href="/blog"
              className="px-3 py-2 text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors"
            >
              Blog
            </Link>
          </nav>

          {/* Primary CTA Button */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={SITE_CONFIG.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-95 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Send className="w-4 h-4" />
              <span>Join NIVA on Telegram</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="p-2 rounded-lg text-[#68626D] hover:text-[#17151A] hover:bg-[#5B3A6D]/5 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
              aria-label="Buka menu navigasi"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isOpen && (
        <div className="md:hidden border-b border-[#5B3A6D]/10 bg-[#FAF8F6] px-4 pt-2 pb-6 space-y-2 animate-fadeIn" id="mobile-menu">
          <Link
            href="/how-it-works"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Cara Kerja NIVA
          </Link>
          <Link
            href="/safety"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Pusat Keamanan & Privasi
          </Link>
          <Link
            href="/student-verification"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Sistem Verifikasi Mahasiswa
          </Link>
          <Link
            href="/students/semarang"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Komunitas Kampus Semarang
          </Link>
          <Link
            href="/stranger-cam"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-semibold text-[#8A5A9A] hover:bg-[#5B3A6D]/10 flex items-center justify-between"
          >
            <span>📹 Stranger Cam</span>
            <span className="text-[10px] bg-[#5B3A6D] text-white font-bold px-2 py-0.5 rounded-full">Soon</span>
          </Link>
          <Link
            href="/premium"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-bold text-[#5B3A6D] bg-[#5B3A6D]/10 hover:bg-[#5B3A6D]/20"
          >
            ✨ NIVA Premium (Mulai Rp5k)
          </Link>
          <Link
            href="/blog"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Artikel & Panduan Mahasiswa
          </Link>
          <div className="pt-4">
            <a
              href={SITE_CONFIG.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-center font-semibold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] shadow-md"
            >
              <Send className="w-5 h-5" />
              <span>Join NIVA on Telegram</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
