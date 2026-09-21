import Link from 'next/link';
import { Compass, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center p-8 sm:p-10 bg-white rounded-3xl border border-[#5B3A6D]/15 shadow-card space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A5A9A]">404 Not Found</span>
          <h1 className="text-2xl font-display font-bold text-[#17151A]">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-xs sm:text-sm text-[#68626D]">
            Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda NIVA</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
