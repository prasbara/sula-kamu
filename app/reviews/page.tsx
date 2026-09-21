'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Star, 
  ShieldCheck, 
  MessageSquare, 
  ThumbsUp, 
  Sparkles, 
  AlertCircle, 
  Send,
  Heart,
  ChevronRight
} from 'lucide-react';

interface ReviewItem {
  id: string;
  display_name: string;
  rating: number;
  review_text: string;
  recommend: number;
  improvement_category: string | null;
  admin_response: string | null;
  admin_response_at: string | null;
  created_at: string;
  study_field?: string;
  institution_short_name?: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    [key: number]: { count: number; percentage: number };
  };
  recommendPercentage: number;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Submit form state
  const [formRating, setFormRating] = useState<number>(5);
  const [formText, setFormText] = useState('');
  const [formRecommend, setFormRecommend] = useState(true);
  const [formCategory, setFormCategory] = useState('MATCHING');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: formRating,
          reviewText: formText,
          recommend: formRecommend,
          improvementCategory: formCategory,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitMessage({ type: 'success', text: data.message });
        setFormText('');
        setTimeout(() => {
          setShowSubmitModal(false);
          setSubmitMessage(null);
        }, 2500);
      } else {
        setSubmitMessage({ type: 'error', text: data.error || 'Gagal mengirim ulasan.' });
      }
    } catch {
      setSubmitMessage({ type: 'error', text: 'Terjadi kendala jaringan.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-rose-500 selection:text-white pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12 border-b border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Transparansi & Pengalaman Pengguna Nyata
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ulasan Asli Mahasiswa Semarang
          </h1>
          <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base leading-relaxed">
            NIVA tidak memalsukan testimoni atau peringkat bintang. Setiap ulasan berasal langsung dari akun mahasiswa terverifikasi yang menggunakan platform kami.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold text-xs sm:text-sm hover:opacity-90 shadow-lg shadow-rose-500/20 transition"
            >
              <MessageSquare className="w-4 h-4" />
              Bagikan Pengalaman Anda
            </button>
          </div>
        </div>
      </section>

      {/* Main Review Content */}
      <main className="max-w-5xl mx-auto px-4 pt-10 space-y-12">
        {/* Rating Summary Card */}
        {stats && (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center shadow-xl">
            {/* Left: Big Score */}
            <div className="text-center md:border-r border-white/10 md:pr-6 space-y-2">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                {stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : '0.0'}
              </span>
              <div className="flex items-center justify-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      s <= Math.round(stats.averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {stats.totalReviews > 0
                  ? `Berdasarkan ${stats.totalReviews} ulasan terverifikasi`
                  : 'Belum ada ulasan terverifikasi'}
              </p>
              {stats.totalReviews > 0 && (
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                  {stats.recommendPercentage}% Mahasiswa merekomendasikan
                </span>
              )}
            </div>

            {/* Right: Real Star Distribution Bars */}
            <div className="md:col-span-2 space-y-2.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const dist = stats.distribution[star] || { count: 0, percentage: 0 };
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-slate-400 font-medium flex items-center gap-1">
                      {star} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all duration-500"
                        style={{ width: `${dist.percentage}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-slate-400">
                      {dist.count} ({dist.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviews List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ulasan & Masukan Mahasiswa
            </h2>
            <span className="text-xs text-slate-400">
              Menampilkan ulasan moderasi yang telah disetujui
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400">Memuat ulasan terverifikasi...</div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-slate-900/30 p-8 space-y-4">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-300">Belum Ada Ulasan Publik</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Jadilah yang pertama membagikan pengalaman Anda menggunakan NIVA! Masukan nyata dari Anda sangat berharga bagi peningkatan komunitas mahasiswa Semarang.
              </p>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Tulis Ulasan Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition space-y-3.5 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Stars & Category */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.improvement_category && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono">
                          {rev.improvement_category}
                        </span>
                      )}
                    </div>

                    {/* Review Body */}
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                      "{rev.review_text}"
                    </p>

                    {/* Official Admin Response */}
                    {rev.admin_response && (
                      <div className="bg-rose-950/20 border-l-2 border-rose-500 p-3 rounded-r-xl text-xs space-y-1 mt-2">
                        <span className="font-semibold text-rose-300 text-[11px] block">
                          Tanggapan Resmi Tim NIVA:
                        </span>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {rev.admin_response}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Reviewer Details */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-rose-400 text-[10px]">
                        {rev.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-white block leading-tight">
                          {rev.display_name}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          {rev.institution_short_name ? `${rev.institution_short_name} Verified` : 'Mahasiswa Terverifikasi'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(rev.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Bagikan Pengalaman Nyata Anda</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ulasan Anda membantu kami menjaga kualitas & integritas NIVA
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              {/* Star Rating Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Berapa rating yang Anda berikan?
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setFormRating(s)}
                      className="p-1.5 rounded-lg hover:scale-110 transition"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          s <= formRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-mono text-sm font-bold text-amber-400">
                    {formRating} / 5 Bintang
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Tuliskan ulasan pengalaman Anda (minimal 10 karakter):
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  maxLength={1000}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Ceritakan apa yang Anda sukai dari NIVA, kecocokan profil mahasiswa, kemudahan verifikasi, atau apa yang perlu diperbaiki..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Bersikaplah obyektif & sopan.</span>
                  <span>{formText.length} / 1000</span>
                </div>
              </div>

              {/* Actionable Feedback Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Aspek apa yang paling bisa ditingkatkan oleh NIVA?
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50"
                >
                  <option value="MATCHING">Sistem Kecocokan (Matching Algorithm)</option>
                  <option value="DISCOVERY">Pencarian & Penemuan Teman (Discovery)</option>
                  <option value="VERIFICATION">Proses Verifikasi Mahasiswa / KTM</option>
                  <option value="TELEGRAM">Pengalaman Bot Telegram</option>
                  <option value="WEBSITE">Website & Dashboard</option>
                  <option value="PREMIUM">Fitur & Nilai Langganan Premium</option>
                  <option value="SAFETY">Fitur Keselamatan & Privasi</option>
                  <option value="PERFORMANCE">Kecepatan & Performa Platform</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              {/* Recommend Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recommend"
                  checked={formRecommend}
                  onChange={(e) => setFormRecommend(e.target.checked)}
                  className="rounded border-white/20 bg-slate-950 text-rose-500 focus:ring-0"
                />
                <label htmlFor="recommend" className="text-slate-300 cursor-pointer">
                  Saya merekomendasikan NIVA kepada sesama mahasiswa Semarang
                </label>
              </div>

              {submitMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    submitMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitMessage.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || formText.trim().length < 10}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white font-semibold transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Mengirim...' : 'Kirim Ulasan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
