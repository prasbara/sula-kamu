import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, Calendar, User, ArrowLeft, ArrowRight, Share2, ShieldCheck } from 'lucide-react';
import { ARTICLES, Article } from '@/lib/articles';
import { SITE_CONFIG } from '@/lib/constants';
import JsonLd from '@/components/JsonLd';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return {
      title: 'Artikel Tidak Ditemukan',
    };
  }

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      type: 'article',
      url: `${SITE_CONFIG.url}/blog/${article.slug}`,
      title: article.title,
      description: article.excerpt,
      publishedTime: article.date,
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = ARTICLES.filter((a) => article.relatedSlugs?.includes(a.slug));

  const jsonLdArticle = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.date,
    author: {
      '@type': 'Organization',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'NIVA Platform',
      url: SITE_CONFIG.url,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.url}/icon.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_CONFIG.url}/blog/${article.slug}`,
    },
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Beranda',
        item: SITE_CONFIG.url,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${SITE_CONFIG.url}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `${SITE_CONFIG.url}/blog/${article.slug}`,
      },
    ],
  };

  return (
    <article className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      <JsonLd data={jsonLdArticle} />
      <JsonLd data={jsonLdBreadcrumb} />

      {/* Back button & Category */}
      <div className="flex items-center justify-between">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#68626D] hover:text-[#5B3A6D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Indeks Blog</span>
        </Link>
        <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          {article.category}
        </span>
      </div>

      {/* Article Header */}
      <header className="space-y-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight leading-tight">
          {article.title}
        </h1>

        <p className="text-base sm:text-lg text-[#68626D] max-w-2xl mx-auto leading-relaxed">
          {article.excerpt}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#68626D] pt-2 border-y border-[#5B3A6D]/10 py-3">
          <div className="flex items-center gap-1.5 font-medium text-[#17151A]">
            <User className="w-4 h-4 text-[#5B3A6D]" />
            <span>{article.author} ({article.authorRole})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{article.date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{article.readTime}</span>
          </div>
        </div>
      </header>

      {/* Article Body Content */}
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/10 shadow-soft text-sm sm:text-base text-[#17151A] leading-relaxed space-y-6">
        <div
          className="space-y-4"
          dangerouslySetInnerHTML={{
            __html: article.content
              .replace(/### (.*?)\n/g, '<h3 class="text-xl sm:text-2xl font-bold font-display text-[#17151A] pt-4 pb-1">$1</h3>')
              .replace(/#### (.*?)\n/g, '<h4 class="text-base sm:text-lg font-bold text-[#17151A] pt-2">$1</h4>')
              .replace(/\* \*\*(.*?)\*\*: (.*?)\n/g, '<div class="py-1"><strong class="text-[#5B3A6D]">$1:</strong> $2</div>')
              .replace(/\* (.*?)\n/g, '<li class="ml-4 list-disc text-[#68626D]">$1</li>')
              .replace(/---/g, '<hr class="my-6 border-[#5B3A6D]/10" />'),
          }}
        />
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="space-y-6 pt-6">
          <h2 className="text-xl font-display font-bold text-[#17151A]">
            Artikel Terkait untuk Mahasiswa
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.slug}
                href={`/blog/${rel.slug}`}
                className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 hover:border-[#5B3A6D]/30 transition-all space-y-2 group"
              >
                <span className="text-[11px] font-semibold text-[#8A5A9A]">
                  {rel.category}
                </span>
                <h3 className="font-bold text-base text-[#17151A] group-hover:text-[#5B3A6D] transition-colors leading-snug">
                  {rel.title}
                </h3>
                <p className="text-xs text-[#68626D] line-clamp-2">
                  {rel.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA Box */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white text-center space-y-4 shadow-card">
        <h2 className="text-2xl font-display font-bold">
          Ingin Memperluas Lingkaran Pertemanan Kampus?
        </h2>
        <p className="text-sm text-white/90 max-w-xl mx-auto">
          Bergabunglah dengan mahasiswa terverifikasi lainnya di Semarang sekarang juga melalui bot Telegram NIVA.
        </p>
        <div className="pt-2">
          <a
            href={SITE_CONFIG.telegramBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-[#17151A] bg-white hover:bg-[#FAF8F6] shadow-sm transition-all"
          >
            <span>Buka NIVA di Telegram</span>
            <ArrowRight className="w-4 h-4 text-[#5B3A6D]" />
          </a>
        </div>
      </div>
    </article>
  );
}
