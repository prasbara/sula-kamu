'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ShieldCheck, Send, Video, MessageSquare } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F6]/95 backdrop-blur-md border-b border-[#5B3A6D]/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Brand Logo & Descriptor */}
          <Link href="/" className="flex items-center gap-2.5 lg:gap-3 group focus:outline-none focus:ring-2 focus:ring-[#5B3A6D] rounded-lg p-1 shrink-0">
            <div className="relative w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-white shadow-sm border border-[#5B3A6D]/15 flex items-center justify-center p-1 group-hover:scale-105 transition-transform overflow-hidden">
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
              <span className="font-display font-bold text-xl lg:text-2xl tracking-tight text-[#3B123F]">
                NIVA
              </span>
              <span className="text-[10px] tracking-wide text-[#68626D] font-medium hidden sm:inline-block lg:hidden xl:inline-block">
                Student Social & Matchmaking Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Main Navigation">
            <Link
              href="/how-it-works"
              prefetch={true}
              className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Cara Kerja
            </Link>
            <Link
              href="/safety"
              prefetch={true}
              className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Keamanan
            </Link>
            <Link
              href="/student-verification"
              prefetch={true}
              className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Verifikasi KTM
            </Link>
            <Link
              href="/students/semarang"
              prefetch={true}
              className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Kampus Semarang
            </Link>
            <Link
              href="/premium"
              prefetch={true}
              className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-semibold text-[#8A5A9A] hover:text-[#5B3A6D] hover:bg-[#8A5A9A]/10 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Premium</span>
              <span className="text-[9px] bg-[#E8B4C8] text-[#17151A] font-bold px-1.5 py-0.5 rounded-full">Rp5k</span>
            </Link>
            <Link
              href="/stranger-chat"
              prefetch={true}
              className="px-2.5 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-semibold text-[#8A5A9A] bg-[#8A5A9A]/8 hover:bg-[#8A5A9A]/15 border border-[#8A5A9A]/25 rounded-lg xl:rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#8A5A9A]" />
              <span>Stranger Chat</span>
            </Link>
            <Link
              href="/stranger-cam"
              prefetch={true}
              className="px-2.5 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-semibold text-[#5B3A6D] bg-[#5B3A6D]/8 hover:bg-[#5B3A6D]/15 border border-[#5B3A6D]/20 rounded-lg xl:rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Video className="w-3.5 h-3.5 text-[#5B3A6D]" />
              <span>Stranger Cam</span>
            </Link>
            <Link
              href="/blog"
              prefetch={true}
              className="px-2 xl:px-3 py-2 text-xs xl:text-sm font-medium text-[#68626D] hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Blog
            </Link>
          </nav>

          {/* Primary CTA Button */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <a
              href={SITE_CONFIG.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 xl:gap-2 px-3.5 xl:px-4 py-2 xl:py-2.5 rounded-full text-xs xl:text-sm font-semibold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-95 shadow-sm hover:shadow-md transition-all whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
              <span>Join NIVA Telegram</span>
            </a>
          </div>

          {/* Mobile & Tablet Menu Button */}
          <div className="flex lg:hidden">
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

      {/* Mobile & Tablet Menu Drawer */}
      {isOpen && (
        <div className="lg:hidden border-b border-[#5B3A6D]/10 bg-[#FAF8F6] px-4 pt-2 pb-6 space-y-2 animate-fadeIn" id="mobile-menu">
          <Link
            href="/how-it-works"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Cara Kerja
          </Link>
          <Link
            href="/safety"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Pusat Keamanan & Privasi
          </Link>
          <Link
            href="/student-verification"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Sistem Verifikasi Mahasiswa
          </Link>
          <Link
            href="/students/semarang"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Komunitas Kampus Semarang
          </Link>
          <Link
            href="/stranger-chat"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-semibold text-[#8A5A9A] bg-[#8A5A9A]/10 hover:bg-[#8A5A9A]/15 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#8A5A9A]" />
              <span>Stranger Chat</span>
            </div>
            <span className="text-[10px] bg-[#8A5A9A] text-white font-bold px-2 py-0.5 rounded-full">Anonim</span>
          </Link>
          <Link
            href="/stranger-cam"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-semibold text-[#5B3A6D] bg-[#5B3A6D]/10 hover:bg-[#5B3A6D]/15 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#5B3A6D]" />
              <span>Stranger Cam</span>
            </div>
            <span className="text-[10px] bg-[#5B3A6D] text-white font-bold px-2 py-0.5 rounded-full">Baru</span>
          </Link>
          <Link
            href="/premium"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-base font-bold text-[#5B3A6D] bg-[#5B3A6D]/10 hover:bg-[#5B3A6D]/20"
          >
            ✨ NIVA Premium (Mulai Rp5k)
          </Link>
          <Link
            href="/blog"
            prefetch={true}
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
