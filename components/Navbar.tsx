'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ShieldCheck, Send, Video, MessageSquare, Megaphone, Star, Lock, HelpCircle, Compass } from 'lucide-react';
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
                Semarang Social Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs xl:text-sm font-medium text-[#68626D]" aria-label="Main Navigation">
            <Link
              href="/"
              prefetch={true}
              className="px-2.5 py-2 hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Home
            </Link>
            <Link
              href="/how-it-works"
              prefetch={true}
              className="px-2.5 py-2 hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Fitur
            </Link>
            <Link
              href="/safety"
              prefetch={true}
              className="px-2.5 py-2 hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Keamanan
            </Link>
            <Link
              href="/privacy"
              prefetch={true}
              className="px-2.5 py-2 hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Privasi
            </Link>
            <Link
              href="/blog"
              prefetch={true}
              className="px-2.5 py-2 hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Blog
            </Link>
            <Link
              href="/reviews"
              prefetch={true}
              className="px-2.5 py-2 hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Ulasan
            </Link>
            <Link
              href="/faq"
              prefetch={true}
              className="px-2.5 py-2 hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              FAQ
            </Link>
            <Link
              href="/premium"
              prefetch={true}
              className="px-2.5 py-2 hover:text-[#5B3A6D] hover:bg-[#5B3A6D]/5 rounded-lg transition-colors whitespace-nowrap font-semibold text-[#5B3A6D]"
            >
              Premium
            </Link>
            <Link
              href="/support"
              prefetch={true}
              className="px-2.5 py-2 text-[#5B3A6D] font-bold hover:bg-[#5B3A6D]/10 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <span>Bantuan</span>
            </Link>
            <Link
              href="/advertise"
              prefetch={true}
              className="px-2.5 py-2 text-[#8A5A9A] font-semibold hover:bg-[#8A5A9A]/10 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Beriklan</span>
            </Link>
          </nav>

          {/* Quick Dual CTAs */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Link
              href="/stranger-chat"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] shadow-sm transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Stranger Chat</span>
            </Link>

            <Link
              href="/stranger-cam"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17151A] bg-white border border-[#5B3A6D]/20 hover:bg-[#FAF8F6] shadow-sm transition-all"
            >
              <Video className="w-3.5 h-3.5 text-[#5B3A6D]" />
              <span>Stranger Cam</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="p-2 rounded-lg text-[#68626D] hover:text-[#17151A] hover:bg-[#5B3A6D]/5 focus:outline-none focus:ring-2 focus:ring-[#5B3A6D]"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
              aria-label="Buka menu navigasi"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden border-b border-[#5B3A6D]/10 bg-[#FAF8F6] px-4 pt-3 pb-6 space-y-2 animate-fadeIn" id="mobile-menu">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#5B3A6D]/10">
            <Link
              href="/stranger-chat"
              prefetch={true}
              onClick={() => setIsOpen(false)}
              className="py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-[#5B3A6D] flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Stranger Chat</span>
            </Link>
            <Link
              href="/stranger-cam"
              prefetch={true}
              onClick={() => setIsOpen(false)}
              className="py-2.5 px-3 rounded-xl text-xs font-bold text-[#17151A] bg-white border border-[#5B3A6D]/20 flex items-center justify-center gap-1.5"
            >
              <Video className="w-4 h-4 text-[#5B3A6D]" />
              <span>Stranger Cam</span>
            </Link>
          </div>

          <Link
            href="/"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Home
          </Link>
          <Link
            href="/how-it-works"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Fitur (Cara Kerja)
          </Link>
          <Link
            href="/safety"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Pusat Keamanan
          </Link>
          <Link
            href="/privacy"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Kebijakan Privasi & Data
          </Link>
          <Link
            href="/blog"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Blog & Panduan Sosial
          </Link>
          <Link
            href="/reviews"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Ulasan Pengguna
          </Link>
          <Link
            href="/faq"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#17151A] hover:bg-[#5B3A6D]/10"
          >
            Tanya Jawab (FAQ)
          </Link>
          <Link
            href="/premium"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-[#5B3A6D] hover:bg-[#5B3A6D]/10"
          >
            ✨ NIVA Premium
          </Link>
          <Link
            href="/support"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-bold text-[#5B3A6D] bg-[#5B3A6D]/10"
          >
            🎫 Pusat Bantuan & Tiket
          </Link>
          <Link
            href="/advertise"
            prefetch={true}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-[#8A5A9A] bg-[#8A5A9A]/10"
          >
            📢 Beriklan di NIVA
          </Link>

          <div className="pt-2 border-t border-[#5B3A6D]/10">
            <a
              href={SITE_CONFIG.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-center text-xs font-semibold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>Buka Bot Telegram Resmi</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
