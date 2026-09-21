'use client';

import { useEffect } from 'react';
import { Send, ShieldCheck, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export default function JoinPage() {
  useEffect(() => {
    // Automatic redirect to Telegram bot
    const timer = setTimeout(() => {
      window.location.href = SITE_CONFIG.telegramBotUrl;
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center p-8 sm:p-10 bg-white rounded-3xl border border-[#5B3A6D]/15 shadow-card space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5B3A6D] to-[#8A5A9A] text-white flex items-center justify-center mx-auto shadow-md">
          <Send className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-[#17151A]">
            Membuka NIVA di Telegram...
          </h1>
          <p className="text-xs sm:text-sm text-[#68626D]">
            Anda sedang diarahkan secara otomatis ke bot resmi NIVA di aplikasi Telegram.
          </p>
        </div>

        <div className="pt-2">
          <a
            href={SITE_CONFIG.telegramBotUrl}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] shadow-md hover:opacity-95"
          >
            <span>Buka Manual di Telegram</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="pt-4 border-t text-[11px] text-[#68626D] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#2D8C6A]" />
          <span>Verifikasi KTM • 18+ Khusus Mahasiswa Semarang</span>
        </div>
      </div>
    </div>
  );
}
