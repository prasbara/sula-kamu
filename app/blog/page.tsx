import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Calendar, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { ARTICLES } from '@/lib/articles';

export const metadata: Metadata = {
  title: 'Blog & Panduan Mahasiswa — NIVA Semarang',
  description: 'Kumpulan artikel dan panduan kehidupan kampus di Semarang: tips berkenalan, keselamatan kencan online, mendeteksi akun palsu, dan etika obrolan mahasiswa.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogIndexPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <BookOpen className="w-4 h-4" />
          <span>Ruang Edukasi & Opini Mahasiswa</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#17151A] tracking-tight">
          Blog & Panduan Sosial NIVA
        </h1>
        <p className="text-base sm:text-lg text-[#68626D]">
          Panduan praktis, riset dinamika sosial kampus, dan tips navigasi pertemanan sehat bagi mahasiswa di Semarang.
        </p>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {ARTICLES.map((article) => (
          <article
            key={article.slug}
            className="flex flex-col justify-between p-6 sm:p-8 bg-white rounded-3xl border border-[#5B3A6D]/10 shadow-soft hover:shadow-card transition-all group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#68626D]">
                <span className="px-2.5 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] font-semibold">
                  {article.category}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {article.readTime}
                </span>
              </div>

              <h2 className="text-xl font-bold text-[#17151A] group-hover:text-[#5B3A6D] transition-colors leading-snug">
                <Link href={`/blog/${article.slug}`}>
                  {article.title}
                </Link>
              </h2>

              <p className="text-sm text-[#68626D] leading-relaxed line-clamp-3">
                {article.excerpt}
              </p>
            </div>

            <div className="pt-6 border-t border-[#5B3A6D]/10 mt-6 flex items-center justify-between">
              <div className="text-xs text-[#68626D]">
                <p className="font-semibold text-[#17151A]">{article.author}</p>
                <p>{article.date}</p>
              </div>
              <Link
                href={`/blog/${article.slug}`}
                className="w-9 h-9 rounded-full bg-[#FAF8F6] text-[#5B3A6D] group-hover:bg-[#5B3A6D] group-hover:text-white flex items-center justify-center transition-colors"
                aria-label={`Baca artikel: ${article.title}`}
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
