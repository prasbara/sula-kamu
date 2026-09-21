import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  Send, 
  ArrowRight, 
  Sparkles, 
  Users, 
  Heart, 
  Lock, 
  EyeOff, 
  UserCheck, 
  Flag, 
  Camera, 
  CheckCircle2,
  GraduationCap,
  Zap,
  RotateCcw,
  Star,
  MessageSquare
} from 'lucide-react';
import { SITE_CONFIG, SEMARANG_INSTITUTIONS, FIXED_INSTITUTION_COUNT } from '@/lib/constants';
import LiveStatsBar from '@/components/LiveStatsBar';
import StrangerCamComingSoon from '@/components/StrangerCamComingSoon';
import { ReviewService } from '@/src/services/review/reviewService';

export default function HomePage() {
  let reviewsData = { reviews: [] as any[], total: 0 };
  try {
    reviewsData = ReviewService.getPublicReviews(3);
  } catch (err) {
    // Graceful fallback if database initializing
    reviewsData = { reviews: [], total: 0 };
  }

  const faqs = [
    {
      q: 'Apakah NIVA merupakan aplikasi resmi dari universitas di Semarang?',
      a: 'Tidak. NIVA adalah platform independen yang dibangun khusus untuk melayani mahasiswa di wilayah Semarang. NIVA tidak berafiliasi, dioperasikan, atau disponsori oleh perguruan tinggi mana pun.',
    },
    {
      q: 'Apa perbedaan Verifikasi Foto (Photo Verified) dan Verifikasi KTM (Student Verified)?',
      a: 'Verifikasi Foto memastikan keaslian foto selfie wajah Anda untuk mencegah akun bot/tiruan (kuota 50 like/hari), namun tidak membuktikan pendaftaran universitas. Sementara Verifikasi KTM mengonfirmasi sinyal keaktifan mahasiswa di 33 perguruan tinggi Semarang (kuota 50 like/hari). Keduanya ditinjau manual oleh admin secara terpisah.',
    },
    {
      q: 'Berapa kuota like harian untuk pengguna gratis?',
      a: 'Pengguna yang belum terverifikasi mendapatkan 10 like per hari. Setelah lulus Verifikasi Foto atau Verifikasi KTM, kuota like Anda meningkat otomatis menjadi 50 like per hari.',
    },
    {
      q: 'Bagaimana cara mendaftar langganan NIVA Premium?',
      a: 'Pembelian Premium dilakukan secara resmi melalui website NIVA pada halaman Premium. Anda memilih paket (Early Access Rp5.000 atau Early Launch Rp8.000), melakukan transfer/QRIS, dan mengunggah bukti pembayaran untuk diverifikasi tim admin melalui antrean FIFO.',
    },
    {
      q: 'Apakah data NIM atau foto kartu mahasiswa saya akan terlihat oleh pengguna lain?',
      a: 'Sama sekali tidak. Foto kartu mahasiswa Anda disimpan sementara secara terenkripsi dan dihapus secara otomatis maksimal 72 jam. Data sensitif seperti NIM, nomor telepon, dan email tidak pernah dipublikasikan kepada pengguna lain.',
    },
    {
      q: 'Mengapa NIVA dijalankan melalui Telegram Bot?',
      a: 'Telegram menyediakan infrastruktur yang sangat cepat, ringan, aman, dan mudah diakses di smartphone Android maupun iOS tanpa perlu mengunduh aplikasi pihak ketiga yang membebani memori ponsel Anda.',
    },
  ];

  return (
    <div className="space-y-24 md:space-y-32 pb-24 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 md:pt-18 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-7">
          {/* Official Brand Identity Logo Presentation */}
          <div className="flex justify-center animate-fadeIn">
            <div className="inline-flex items-center gap-3.5 px-5 py-2.5 rounded-2xl bg-white shadow-soft border border-[#5B3A6D]/15 hover:border-[#5B3A6D]/30 transition-all hover:shadow-card">
              <Image
                src="/logo-icon.png"
                alt="NIVA Logo"
                width={44}
                height={44}
                className="object-contain"
                priority
              />
              <div className="text-left">
                <div className="font-display font-black text-2xl tracking-tight leading-none text-[#3B123F]">
                  NIVA
                </div>
                <div className="text-[11px] font-medium text-[#8A5A9A] tracking-wider uppercase">
                  Meet someone worth knowing.
                </div>
              </div>
            </div>
          </div>

          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20 text-[#5B3A6D] text-xs sm:text-sm font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-[#8A5A9A]" />
            <span>Built for students across {FIXED_INSTITUTION_COUNT} higher-education institutions in Semarang</span>
          </div>

          {/* Main H1 Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-[#17151A] tracking-tight leading-[1.1]">
            Meet Someone Worth Knowing in{' '}
            <span className="bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#E8B4C8] bg-clip-text text-transparent">
              Semarang.
            </span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-lg sm:text-xl text-[#68626D] max-w-2xl mx-auto leading-relaxed font-normal">
            NIVA adalah platform sosial dan matchmaking berbasis mahasiswa yang dirancang untuk komunitas kampus di Semarang. Temukan teman dengan minat yang sama, terhubung lewat mutual connection, dan mulai percakapan dalam ruang yang lebih aman serta terverifikasi.
          </p>

          {/* Primary & Secondary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={SITE_CONFIG.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-95 shadow-card hover:shadow-hover transition-all transform hover:-translate-y-0.5"
            >
              <Send className="w-5 h-5" />
              <span>Join NIVA on Telegram</span>
            </a>
            <Link
              href="/how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base font-semibold text-[#17151A] bg-white hover:bg-[#FAF8F6] border border-[#5B3A6D]/20 shadow-sm transition-all"
            >
              <span>See How It Works</span>
              <ArrowRight className="w-4 h-4 text-[#5B3A6D]" />
            </Link>
          </div>

          {/* Live Product Metrics Bar (Real Data Sourced from Database) */}
          <LiveStatsBar />

          {/* Trust Indicators */}
          <div className="pt-8 border-t border-[#5B3A6D]/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/60 border border-[#5B3A6D]/5">
              <ShieldCheck className="w-5 h-5 text-[#5B3A6D]" />
              <span className="text-xs sm:text-sm font-semibold text-[#17151A]">18+ Only</span>
              <span className="text-[11px] text-[#68626D]">Khusus dewasa muda</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/60 border border-[#5B3A6D]/5">
              <UserCheck className="w-5 h-5 text-[#2D8C6A]" />
              <span className="text-xs sm:text-sm font-semibold text-[#17151A]">Student Verification</span>
              <span className="text-[11px] text-[#68626D]">Sinyal status KTM</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/60 border border-[#5B3A6D]/5">
              <Lock className="w-5 h-5 text-[#8A5A9A]" />
              <span className="text-xs sm:text-sm font-semibold text-[#17151A]">Privacy-First</span>
              <span className="text-[11px] text-[#68626D]">NIM & kontak terlindungi</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/60 border border-[#5B3A6D]/5">
              <Flag className="w-5 h-5 text-[#C94B5B]" />
              <span className="text-xs sm:text-sm font-semibold text-[#17151A]">Safety Controls</span>
              <span className="text-[11px] text-[#68626D]">Lapor & blokir instan</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VERIFICATION TIERS & LIKE LIMITS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8A5A9A]">
            Tingkat Kepercayaan & Kuota Like
          </h2>
          <p className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Transparansi Verifikasi & Batasan Server-Side
          </p>
          <p className="text-base text-[#68626D]">
            NIVA menerapkan sistem kuota harian otomatis di tingkat server untuk mencegah penyalahgunaan dan menjaga kualitas interaksi antar-mahasiswa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Level 0 */}
          <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#68626D] bg-[#FAF8F6] px-3 py-1 rounded-full border">Level 0</span>
              <span className="text-xs font-bold text-[#17151A]">10 Like / Hari</span>
            </div>
            <h3 className="text-xl font-bold text-[#17151A]">Unverified</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Pengguna baru yang telah menyelesaikan onboarding dasar dan verifikasi usia 18+. Dapat menjelajahi feed dan mengirimkan hingga 10 like per hari.
            </p>
          </div>

          {/* Level 1 */}
          <div className="bg-white p-8 rounded-2xl border border-[#8A5A9A]/30 shadow-card space-y-4 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8A5A9A] bg-[#8A5A9A]/10 px-3 py-1 rounded-full border border-[#8A5A9A]/20">Level 1</span>
              <span className="text-xs font-bold text-[#2D8C6A]">50 Like / Hari</span>
            </div>
            <h3 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#8A5A9A]" /> Photo Verified
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Telah lulus verifikasi foto selfie wajah asli oleh tim admin. Memastikan profil bukan bot atau foto curian, tanpa perlu menunjukkan kartu mahasiswa.
            </p>
          </div>

          {/* Level 2 */}
          <div className="bg-white p-8 rounded-2xl border border-[#2D8C6A]/30 shadow-card space-y-4 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2D8C6A] bg-[#2D8C6A]/10 px-3 py-1 rounded-full border border-[#2D8C6A]/20">Level 2</span>
              <span className="text-xs font-bold text-[#2D8C6A]">50 Like / Hari</span>
            </div>
            <h3 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#2D8C6A]" /> Student Verified
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Telah diverifikasi menggunakan Kartu Tanda Mahasiswa (KTM) di salah satu dari 33 perguruan tinggi Semarang. Lencana verifikasi kampus resmi aktif.
            </p>
          </div>
        </div>
      </section>

      {/* 3. NIVA PREMIUM SECTION */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-[#5B3A6D] via-[#734882] to-[#8A5A9A] text-white p-8 sm:p-14 rounded-3xl shadow-hover space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>NIVA Premium Membership</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold">
              Unlock More Ways to Connect.
            </h2>
            <p className="text-sm sm:text-base text-white/90">
              Dapatkan kuota interaksi ekstra, lencana eksklusif, dan kemampuan rewind untuk memperluas pertemanan secara maksimal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Early Access Card */}
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E8B4C8] text-[#17151A] px-2.5 py-1 rounded-full">
                  EARLY ACCESS
                </span>
                <h3 className="text-2xl font-bold mt-3">Rp5.000 <span className="text-xs font-normal text-white/80">/ 1 bulan</span></h3>
                <p className="text-xs text-white/80 mt-1">Paket peluncuran terbatas untuk mahasiswa pertama.</p>
              </div>
              <Link
                href="/premium"
                className="w-full text-center py-2.5 rounded-xl font-bold text-xs bg-white text-[#17151A] hover:bg-[#FAF8F6] transition-all shadow-sm"
              >
                Dapatkan Early Access →
              </Link>
            </div>

            {/* Early Launch Card */}
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/30 text-white px-2.5 py-1 rounded-full">
                  EARLY LAUNCH
                </span>
                <h3 className="text-2xl font-bold mt-3">Rp8.000 <span className="text-xs font-normal text-white/80">/ 1 bulan</span></h3>
                <p className="text-xs text-white/80 mt-1">Paket standar fase peluncuran resmi berikutnya.</p>
              </div>
              <Link
                href="/premium"
                className="w-full text-center py-2.5 rounded-xl font-bold text-xs bg-white text-[#17151A] hover:bg-[#FAF8F6] transition-all shadow-sm"
              >
                Dapatkan Early Launch →
              </Link>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/premium"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4"
            >
              <span>Lihat Detail Fitur & Alur Pembayaran di Halaman Premium</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. SEMARANG STUDENT COMMUNITY (33 INSTITUTIONS FIXED) */}
      <section className="bg-white py-20 border-y border-[#5B3A6D]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8A5A9A]">
              Ekosistem Pendidikan Tinggi
            </h2>
            <p className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
              Dirancang untuk Mahasiswa di Seluruh {FIXED_INSTITUTION_COUNT} Perguruan Tinggi Semarang.
            </p>
            <p className="text-base text-[#68626D]">
              NIVA dirancang untuk melayani mahasiswa dari {FIXED_INSTITUTION_COUNT} institusi perguruan tinggi negeri, swasta, kedinasan, dan kesehatan di wilayah Semarang secara inklusif.
            </p>
          </div>

          {/* University Tags Grid */}
          <div className="flex flex-wrap justify-center gap-2.5 max-w-5xl mx-auto">
            {SEMARANG_INSTITUTIONS.slice(0, 24).map((inst) => (
              <span
                key={inst.shortName}
                className="px-3.5 py-1.5 rounded-full bg-[#FAF8F6] border border-[#5B3A6D]/15 text-xs font-medium text-[#17151A] hover:border-[#5B3A6D] transition-colors"
                title={`${inst.fullName} (${inst.area})`}
              >
                {inst.shortName}
              </span>
            ))}
            <Link
              href="/students/semarang"
              className="px-3.5 py-1.5 rounded-full bg-[#5B3A6D]/10 text-xs font-semibold text-[#5B3A6D] hover:bg-[#5B3A6D]/20 transition-colors"
            >
              Lihat Seluruh {FIXED_INSTITUTION_COUNT} Kampus Semarang →
            </Link>
          </div>

          <div className="mt-8 text-center text-xs text-[#68626D] max-w-2xl mx-auto">
            <p>
              *Penyebutan nama {FIXED_INSTITUTION_COUNT} perguruan tinggi bertujuan murni sebagai referensi almamater mahasiswa di Kota Semarang dan tidak mengindikasikan adanya afiliasi formal atau kemitraan komersial dengan pihak kampus.
            </p>
          </div>
        </div>
      </section>

      {/* 5. COMING SOON: NIVA STRANGER CAM */}
      <StrangerCamComingSoon />

      {/* 6. GENUINE REVIEWS SECTION (Section 33) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8A5A9A]/10 text-[#8A5A9A] text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-[#8A5A9A]" />
            <span>Transparansi & Ulasan Mahasiswa</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            What students are saying
          </h2>
          <p className="text-sm sm:text-base text-[#68626D] max-w-xl mx-auto">
            Pendapat dan pengalaman jujur dari mahasiswa Semarang yang telah terverifikasi di platform NIVA.
          </p>
        </div>

        {reviewsData.reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviewsData.reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[#8A5A9A]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= rev.rating ? 'fill-[#8A5A9A] text-[#8A5A9A]' : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-[#17151A] italic leading-relaxed">
                    &quot;{rev.review_text}&quot;
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[#17151A]">{rev.display_name}</p>
                    <p className="text-[#68626D]">{rev.institution_short_name || 'Mahasiswa Semarang'}</p>
                  </div>
                  <span className="text-[10px] text-[#2D8C6A] bg-[#2D8C6A]/10 px-2 py-0.5 rounded-full font-semibold">
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-10 rounded-2xl border border-dashed border-[#5B3A6D]/20 text-center max-w-2xl mx-auto space-y-4 shadow-soft">
            <div className="w-12 h-12 rounded-full bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">
              Be among the first to share your NIVA experience.
            </h3>
            <p className="text-xs text-[#68626D] max-w-md mx-auto leading-relaxed">
              NIVA berkomitmen untuk tidak pernah memalsukan ulasan atau merekayasa skor bintang demi promosi. Semua testimoni murni bersumber dari mahasiswa yang diverifikasi.
            </p>
            <div className="pt-2">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B3A6D] text-white text-xs font-bold hover:bg-[#482D57] transition-all shadow-sm"
              >
                <span>Tulis Ulasan Pengalaman Anda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        <div className="text-center pt-8">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#5B3A6D] hover:text-[#8A5A9A] transition-colors"
          >
            <span>Buka Halaman Ulasan Publik & Statistik Rating Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8A5A9A]">
            Pertanyaan Umum
          </h2>
          <p className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Jawaban untuk Pertanyaan Anda
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white p-6 sm:p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-2"
            >
              <h3 className="text-base sm:text-lg font-bold text-[#17151A]">
                {faq.q}
              </h3>
              <p className="text-sm text-[#68626D] leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-br from-[#5B3A6D] via-[#734882] to-[#8A5A9A] text-white p-12 sm:p-16 rounded-3xl shadow-hover space-y-6">
          <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight">
            Meet someone worth knowing.
          </h2>
          <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto leading-relaxed">
            Bergabunglah dengan mahasiswa Semarang lainnya di NIVA sekarang juga. Verifikasi identitas Anda dan mulailah berkenalan dalam hitungan menit.
          </p>
          <div className="pt-4">
            <a
              href={SITE_CONFIG.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-base font-bold text-[#17151A] bg-white hover:bg-[#FAF8F6] shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Send className="w-5 h-5 text-[#5B3A6D]" />
              <span>Join NIVA on Telegram</span>
            </a>
          </div>
          <p className="text-xs text-white/70">
            Gratis • 18+ Khusus Mahasiswa Semarang • Tanpa Unduhan Berat
          </p>
        </div>
      </section>
    </div>
  );
}
