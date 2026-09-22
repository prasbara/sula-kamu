import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  Send, 
  ArrowRight, 
  Sparkles, 
  Ticket,
  Users, 
  Lock, 
  EyeOff, 
  UserCheck, 
  Flag, 
  Camera, 
  CheckCircle2,
  Zap,
  RotateCcw,
  MessageSquare,
  Video,
  AlertTriangle,
  UserX,
  Compass,
  FileCheck2,
  HeartHandshake,
  MapPin,
  Ban,
  PhoneCall,
  Check,
  Star,
  ExternalLink,
  ChevronRight,
  Megaphone,
  BookOpen
} from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';
import { ARTICLES } from '@/lib/articles';
import { ReviewService } from '@/src/services/review/reviewService';
import LiveStatsBar from '@/components/LiveStatsBar';
import DatingWaitlistForm from '@/components/DatingWaitlistForm';
import JsonLd from '@/components/JsonLd';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  // Query real database records - Zero fake data, zero hardcoded testimonials
  let publicReviews: any[] = [];
  let reviewStats: any = null;
  try {
    const reviewData = ReviewService.getPublicReviews(4, 0, 'PRODUCTION');
    publicReviews = reviewData.reviews || [];
    reviewStats = ReviewService.getReviewStats('PRODUCTION');
  } catch (err) {
    console.error('Failed to load live reviews on homepage:', err);
  }

  // Top 6 curated blog articles from lib/articles.ts
  const featuredArticles = ARTICLES.slice(0, 6);

  const faqs = [
    {
      q: 'Apakah Stranger Chat membutuhkan pendaftaran akun?',
      a: 'Tidak. Stranger Chat NIVA dirancang dapat digunakan tanpa membuat akun. Pengguna cukup mengonfirmasi usia 18+, memberikan izin akses lokasi untuk verifikasi area Semarang, dan menyetujui aturan keselamatan komunitas.',
    },
    {
      q: 'Apakah Stranger Cam membutuhkan registrasi akun?',
      a: 'Tidak. Stranger Cam beroperasi menggunakan sesi peramban (browser session) anonim. Anda tidak perlu memasukkan nama asli, email, atau password.',
    },
    {
      q: 'Kenapa NIVA membutuhkan izin lokasi GPS?',
      a: 'NIVA adalah platform komunitas lokal khusus Kota dan Kabupaten Semarang. Verifikasi lokasi matematika (Point-in-Polygon) diperlukan untuk memastikan seluruh lawan bicara benar-benar berada di wilayah layanan yang sama.',
    },
    {
      q: 'Apakah koordinat GPS presisi saya dapat dilihat oleh stranger?',
      a: 'Tidak pernah. Koordinat GPS mentah Anda diproses secara instan di server dan tidak pernah disimpan permanen atau ditampilkan kepada pengguna lain. Lawan bicara hanya melihat identitas anonim "Stranger".',
    },
    {
      q: 'Apakah video call di Stranger Cam direkam oleh NIVA?',
      a: 'NIVA tidak melakukan perekaman otomatis terhadap panggilan video. Aliran audio dan video berjalan langsung antar-browser menggunakan teknologi WebRTC peer-to-peer terenkripsi, tanpa pipeline penyimpanan rekaman di server kami.',
    },
    {
      q: 'Apakah NIVA aman dari scam dan penipuan?',
      a: 'NIVA menerapkan berbagai kontrol moderasi, sensor nomor telepon otomatis, anti-spam, dan Three-Strike enforcement. Namun, tidak ada platform online yang bebas risiko secara mutlak. Jangan pernah mengirim uang, kode OTP, password, atau data sensitif kepada orang yang baru Anda kenal.',
    },
    {
      q: 'Bagaimana cara melaporkan pengguna yang melanggar aturan?',
      a: 'Setiap layar chat dan video dilengkapi tombol "Report" dan "Block" seketika. Memilih report akan mengirimkan cuplikan bukti ke antrean moderasi admin dan secara otomatis memutus koneksi aktif.',
    },
    {
      q: 'Bagaimana jika saya tidak ingin bertemu di dunia nyata?',
      a: 'Anda selalu berhak menolak. Tidak ada kewajiban untuk bertemu tatap muka dengan seseorang yang Anda kenal melalui NIVA. Kenyamanan dan keselamatan diri Anda adalah prioritas utama.',
    },
    {
      q: 'Apakah NIVA bertanggung jawab atas pertemuan langsung (meetup)?',
      a: 'NIVA menyediakan infrastruktur digital, moderasi, dan panduan keselamatan. Namun, keputusan untuk bertemu tatap muka di luar platform berada di luar kendali teknis NIVA. Kami mengimbau seluruh pengguna mematuhi Panduan Keselamatan Bertemu Tatap Muka.',
    },
  ];

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };

  const jsonLdOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NIVA',
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/logo-icon.png`,
    description: 'Platform social matching, stranger chat, dan video 1-on-1 khusus mahasiswa dan pengguna dewasa di Kota dan Kabupaten Semarang.',
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Kota Semarang dan Kabupaten Semarang',
    },
  };

  const jsonLdWebSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NIVA',
    url: SITE_CONFIG.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_CONFIG.url}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="space-y-24 md:space-y-32 pb-24 overflow-hidden">
      <JsonLd data={jsonLdFaq} />
      <JsonLd data={jsonLdOrg} />
      <JsonLd data={jsonLdWebSite} />

      {/* 1. HERO SECTION */}
      <section className="relative pt-12 md:pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-7">
          {/* Brand Identity Badge */}
          <div className="flex justify-center animate-fadeIn">
            <div className="inline-flex items-center gap-3.5 px-5 py-2.5 rounded-2xl bg-white shadow-soft border border-[#5B3A6D]/15 hover:border-[#5B3A6D]/30 transition-all hover:shadow-card">
              <Image
                src="/logo-icon.png"
                alt="NIVA Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
              <div className="text-left">
                <div className="font-display font-black text-2xl tracking-tight leading-none text-[#3B123F]">
                  NIVA
                </div>
                <div className="text-[11px] font-semibold text-[#8A5A9A] tracking-wider uppercase">
                  Semarang Social Platform
                </div>
              </div>
            </div>
          </div>

          {/* Truthful Positioning Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-semibold text-[#5B3A6D]">
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">18+ Only</span>
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">Semarang Only</span>
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">Privacy-First</span>
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">Safety-Focused</span>
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">Moderated</span>
          </div>

          {/* Main H1 Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-[#17151A] tracking-tight leading-[1.1]">
            Kenalan. Ngobrol.{' '}
            <span className="bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#E8B4C8] bg-clip-text text-transparent">
              Temukan koneksi baru di Semarang.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg lg:text-xl text-[#68626D] max-w-3xl mx-auto leading-relaxed font-normal">
            NIVA adalah platform social matching untuk mahasiswa dan pengguna dewasa di Semarang, dengan Stranger Chat, Stranger Cam, NIVA Telegram, dan ekosistem sosial yang dirancang dengan fokus pada privasi, keamanan, dan interaksi yang sehat.
          </p>

          {/* Primary Dual CTAs & Safety Link */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/stranger-chat"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-95 shadow-card hover:shadow-hover transition-all transform hover:-translate-y-0.5"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Mulai Stranger Chat</span>
            </Link>

            <Link
              href="/stranger-cam"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full text-base font-bold text-[#17151A] bg-white hover:bg-[#FAF8F6] border border-[#5B3A6D]/20 shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <Video className="w-5 h-5 text-[#5B3A6D]" />
              <span>Coba Stranger Cam</span>
            </Link>

            <Link
              href="/safety"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-sm font-semibold text-[#5B3A6D] hover:bg-[#5B3A6D]/5 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Pelajari Keamanan NIVA</span>
            </Link>
          </div>

          {/* Live System Metrics Bar */}
          <LiveStatsBar />
        </div>
      </section>

      {/* 2. TRUST & SAFETY BADGES BAR */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl border border-[#5B3A6D]/15 p-6 shadow-soft grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center mx-auto mb-2">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-[#17151A]">Kota & Kab. Semarang</div>
            <div className="text-[11px] text-[#68626D]">Verifikasi Polygon GPS Riil</div>
          </div>

          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center mx-auto mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-[#17151A]">Zero Media Recording</div>
            <div className="text-[11px] text-[#68626D]">WebRTC P2P Langsung</div>
          </div>

          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center mx-auto mb-2">
              <EyeOff className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-[#17151A]">Tanpa Pendaftaran Akun</div>
            <div className="text-[11px] text-[#68626D]">Untuk Stranger Chat & Cam</div>
          </div>

          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-[#C94B5B]/10 text-[#C94B5B] flex items-center justify-center mx-auto mb-2">
              <Flag className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-[#17151A]">Report & Block Seketika</div>
            <div className="text-[11px] text-[#68626D]">Terhubung ke Admin Moderasi</div>
          </div>
        </div>
      </section>

      {/* 3. APA ITU NIVA? */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-white via-[#FAF8F6] to-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15 shadow-soft space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-bold uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Mengenal Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Apa Itu NIVA?
          </h2>
          <p className="text-sm sm:text-base text-[#68626D] leading-relaxed">
            NIVA adalah platform independen yang dibangun khusus untuk mahasiswa dan masyarakat dewasa muda di Kota dan Kabupaten Semarang. Kami menghadirkan ruang sosial daring untuk berkenalan, berdiskusi, dan memperluas relasi pertemanan tanpa kerumitan kurasi profil yang kaku.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs sm:text-sm text-[#68626D]">
            <div className="p-4 rounded-xl bg-white border border-[#5B3A6D]/10 space-y-2">
              <h3 className="font-bold text-[#17151A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
                <span>Bukan Aplikasi Kencan Biasa</span>
              </h3>
              <p className="text-xs leading-relaxed">
                Kami tidak berfokus pada algoritma geser foto instan yang dangkal. NIVA mengedepankan percakapan langsung 1-on-1, batasan geografi yang relevan, dan perlindungan privasi yang transparan.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#5B3A6D]/10 space-y-2">
              <h3 className="font-bold text-[#17151A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
                <span>Ruang Mahasiswa & Pemuda Semarang</span>
              </h3>
              <p className="text-xs leading-relaxed">
                Menghubungkan mahasiswa dari 33 perguruan tinggi di Semarang—Tembalang, Gunungpati, Ngaliyan, Pleburan—dengan tetap menjaga independensi almamater.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE FEATURES (APA YANG BISA KAMU LAKUKAN DI NIVA?) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8A5A9A]/10 text-[#8A5A9A] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Fitur Utama</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Apa yang Bisa Kamu Lakukan di NIVA?
          </h2>
          <p className="text-base text-[#68626D]">
            Empat pilar layanan sosial yang dirancang dengan kontrol privasi mutakhir dan relevansi lokal Semarang.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Stranger Chat */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-4 flex flex-col justify-between hover:border-[#8A5A9A]/40 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center font-bold">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#17151A]">Stranger Chat</h3>
              <p className="text-xs text-[#68626D] leading-relaxed">
                Ngobrol 1-on-1 dengan orang baru secara acak tanpa harus memilih profil satu per satu. Dilengkapi sensor nomor kontak anti-scam dan sesi ephemeral.
              </p>
              <ul className="text-[11px] text-[#68626D] space-y-1.5 pt-2 border-t border-[#5B3A6D]/10">
                <li>● Random 1-on-1 matchmaking</li>
                <li>● Filter anti-scam nomor WhatsApp</li>
                <li>● Skip, Report & Block seketika</li>
                <li>● Tanpa pembuatan akun</li>
              </ul>
            </div>
            <Link
              href="/stranger-chat"
              className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] transition-colors"
            >
              Mulai Stranger Chat
            </Link>
          </div>

          {/* Card 2: Stranger Cam */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-4 flex flex-col justify-between hover:border-[#8A5A9A]/40 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center font-bold">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#17151A]">Stranger Cam</h3>
              <p className="text-xs text-[#68626D] leading-relaxed">
                Bertemu orang baru secara langsung melalui video 1-on-1 berbasis browser WebRTC. Tanpa rekaman server otomatis, dengan kontrol kamera dan audio mandiri.
              </p>
              <ul className="text-[11px] text-[#68626D] space-y-1.5 pt-2 border-t border-[#5B3A6D]/10">
                <li>● Browser WebRTC P2P connection</li>
                <li>● Kontrol mute & kamera off</li>
                <li>● Zero automatic recording</li>
                <li>● Deteksi wajah browser-local</li>
              </ul>
            </div>
            <Link
              href="/stranger-cam"
              className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-[#17151A] bg-white border border-[#5B3A6D]/20 hover:bg-[#FAF8F6] transition-colors"
            >
              Coba Stranger Cam
            </Link>
          </div>

          {/* Card 3: NIVA Telegram */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-4 flex flex-col justify-between hover:border-[#8A5A9A]/40 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center font-bold">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#17151A]">NIVA Telegram</h3>
              <p className="text-xs text-[#68626D] leading-relaxed">
                Hubungkan pengalaman NIVA dengan bot Telegram resmi untuk notifikasi akun, tiket bantuan premium, verifikasi identitas mahasiswa, dan update status.
              </p>
              <ul className="text-[11px] text-[#68626D] space-y-1.5 pt-2 border-t border-[#5B3A6D]/10">
                <li>● Notifikasi layanan & keamanan</li>
                <li>● Bantuan support ticket FIFO</li>
                <li>● Jalur verifikasi KTM resmi</li>
                <li>● Satu token otentikasi aman</li>
              </ul>
            </div>
            <a
              href={SITE_CONFIG.telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-[#2D8C6A] bg-[#2D8C6A]/10 hover:bg-[#2D8C6A]/20 transition-colors"
            >
              Buka Bot Telegram
            </a>
          </div>

          {/* Card 4: Dating Apps Coming Soon */}
          <div className="bg-gradient-to-br from-[#3B123F] to-[#5B3A6D] text-white p-7 rounded-2xl shadow-card space-y-4 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[#E8B4C8] text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Coming Soon</span>
              </div>
              <h3 className="text-xl font-bold text-white">NIVA Dating Apps</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Ruang social & dating matching mahasiswa terverifikasi dengan AI-assisted discovery, verifikasi KTM ganda, dan proteksi anti-scam mendalam.
              </p>
              <ul className="text-[11px] text-white/70 space-y-1.5 pt-2 border-t border-white/10">
                <li>● AI-Assisted Discovery</li>
                <li>● KTM Verification Required</li>
                <li>● Exclusive Campus Circle</li>
                <li>● Safety-Focused Matching</li>
              </ul>
            </div>
            <a
              href="#dating-waitlist"
              className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-[#3B123F] bg-[#E8B4C8] hover:bg-white transition-colors"
            >
              Daftar Waitlist
            </a>
          </div>
        </div>
      </section>

      {/* 5. LOCATION GATE REQUIREMENT EXPLAINER */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-amber-500/10 border border-amber-500/25 p-8 sm:p-10 rounded-3xl space-y-5 text-[#17151A]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-900">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-amber-950">
                Ketentuan Akses Wilayah: Kota & Kabupaten Semarang
              </h2>
              <p className="text-xs text-amber-900/80">
                NIVA Stranger Chat dan Stranger Cam hanya tersedia saat perangkat Anda terverifikasi berada di wilayah layanan.
              </p>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-[#4A4235] space-y-3 leading-relaxed">
            <p>
              Untuk memastikan interaksi tetap relevan dengan komunitas lokal, sistem kami menggunakan validasi koordinat perangkat melalui peramban:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3.5 bg-white/90 rounded-xl border border-amber-500/20 space-y-1">
                <span className="font-bold text-[#5B3A6D]">1. Izin Lokasi Peramban</span>
                <p className="text-[#68626D]">Perangkat harus memberikan izin lokasi (*Location Permission = Granted*).</p>
              </div>
              <div className="p-3.5 bg-white/90 rounded-xl border border-amber-500/20 space-y-1">
                <span className="font-bold text-[#5B3A6D]">2. Validasi Polygon Wilayah</span>
                <p className="text-[#68626D]">Koordinat harus berada di dalam batas administratif resmi Kota atau Kabupaten Semarang.</p>
              </div>
              <div className="p-3.5 bg-white/90 rounded-xl border border-amber-500/20 space-y-1">
                <span className="font-bold text-[#5B3A6D]">3. Koordinat Dirahasiakan</span>
                <p className="text-[#68626D]">Koordinat GPS presisi <strong>tidak pernah disimpan dan tidak pernah dilihat lawan bicara</strong>.</p>
              </div>
            </div>
            <p className="text-xs text-[#68626D] italic pt-1">
              Catatan: Kami tidak menggunakan kotak centang sederhana "Saya di Semarang" sebagai formalitas. Pengguna di luar batas Kota/Kabupaten Semarang (misal: Demak, Kendal, Salatiga, atau luar provinsi) akan mendapatkan pemberitahuan bahwa layanan belum tersedia di lokasi mereka.
            </p>
          </div>
        </div>
      </section>

      {/* 6. STRANGER CHAT DEEP DIVE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15 shadow-soft grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-bold">
              <MessageSquare className="w-4 h-4" />
              <span>Alur & Mekanisme</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
              Stranger Chat: Masuk Antrean, Dapatkan Match, Mulai Percakapan.
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-[#68626D] leading-relaxed">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                <span><strong>Konfirmasi Usia 18+ & Lokasi:</strong> Pastikan Anda berusia minimal 18 tahun dan berada di Semarang.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                <span><strong>Matchmaking 1-on-1:</strong> Server memasangkan Anda secara acak dengan pengguna lain yang sedang online.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
                <span><strong>Proteksi Anti-Scam Aktif:</strong> Nomor kontak WhatsApp/HP disensor otomatis untuk mencegah penipuan finansial.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
                <span><strong>Kendali Penuh:</strong> Tombol Skip untuk berganti partner seketika, dan Report & Block jika terjadi pelanggaran etika.</span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/stranger-chat"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-xs sm:text-sm text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] shadow-md transition-all"
              >
                <span>Mulai Percakapan Teks Anonim</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-[#17151A] text-white p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-200">Stranger Session (Semarang Area)</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">EPHEMERAL</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="bg-white/10 p-3 rounded-xl max-w-[85%] text-gray-200">
                Halo! Kamu kuliah di daerah mana di Semarang?
              </div>
              <div className="bg-[#5B3A6D]/70 p-3 rounded-xl max-w-[85%] ml-auto text-white">
                Hai! Di Tembalang nih, salam kenal ya!
              </div>
              <div className="bg-amber-500/20 border border-amber-400/30 p-2.5 rounded-lg text-amber-200 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Anti-Scam Filter aktif. Partner hanya melihat sebutan &ldquo;Stranger&rdquo;.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. STRANGER CAM DEEP DIVE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15 shadow-soft grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 bg-[#17151A] text-white p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-200">WebRTC Video 1-on-1</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                ZERO RECORDING
              </span>
            </div>
            <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Video className="w-10 h-10 text-[#8A5A9A]" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">Direct Peer-to-Peer Stream</p>
                <p className="text-[11px] text-gray-400 max-w-xs">
                  Audio dan video dialirkan langsung antar-peramban tanpa pipeline perekaman di server NIVA.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
              <span>● Deteksi Wajah Lokal di Browser</span>
              <span>● Skip / Block Kapan Saja</span>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8A5A9A]/10 text-[#8A5A9A] text-xs font-bold">
              <Video className="w-4 h-4" />
              <span>Video Percakapan Langsung</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
              Stranger Cam: Satu Kamera. Satu Stranger. Satu Percakapan.
            </h2>
            <p className="text-sm sm:text-base text-[#68626D] leading-relaxed">
              Bertemu orang baru secara visual melalui peramban web modern tanpa instalasi aplikasi tambahan. Panggilan video berlangsung 1-on-1 dengan enkripsi standar industri WebRTC.
            </p>
            <div className="space-y-3 text-xs sm:text-sm text-[#68626D]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>No Automatic Recording:</strong> Server NIVA tidak merekam, menyimpan, atau menyalin aliran panggilan video Anda.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>Deteksi Kehadiran Wajah:</strong> Sistem browser memeriksa keterlihatan wajah pengguna demi mencegah perilaku eksibisionisme dan penyalahgunaan.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>Catatan Metadata Jaringan:</strong> Seperti semua teknologi WebRTC standar, koneksi langsung dapat memiliki metadata IP antar-peer. Jangan bagikan informasi pribadi sensitif saat video berlangsung.</span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/stranger-cam"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-xs sm:text-sm text-[#17151A] bg-white hover:bg-[#FAF8F6] border border-[#5B3A6D]/20 shadow-sm transition-all"
              >
                <span>Buka Stranger Cam</span>
                <ArrowRight className="w-4 h-4 text-[#5B3A6D]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. NIVA TELEGRAM SHOWCASE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-white via-[#FAF8F6] to-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15 shadow-soft space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2D8C6A]/10 text-[#2D8C6A] text-xs font-bold">
              <Send className="w-4 h-4" />
              <span>Ekosistem Akun & Layanan</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
              NIVA Telegram / NIVANotify
            </h2>
            <p className="text-sm sm:text-base text-[#68626D] leading-relaxed">
              Satu kanal resmi untuk notifikasi akun, tiket bantuan langsung, verifikasi mahasiswa, dan komunikasi administratif platform.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            <div className="p-4 bg-white rounded-2xl border border-[#5B3A6D]/10 space-y-1.5 shadow-sm">
              <div className="font-bold text-xs text-[#17151A]">Notifikasi Instan</div>
              <p className="text-[11px] text-[#68626D]">Pemberitahuan status akun & keamanan</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#5B3A6D]/10 space-y-1.5 shadow-sm">
              <div className="font-bold text-xs text-[#17151A]">Bantuan Tiket</div>
              <p className="text-[11px] text-[#68626D]">Jalur antrean bantuan admin resmi</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#5B3A6D]/10 space-y-1.5 shadow-sm">
              <div className="font-bold text-xs text-[#17151A]">Verifikasi KTM</div>
              <p className="text-[11px] text-[#68626D]">Validasi kartu mahasiswa Semarang</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#5B3A6D]/10 space-y-1.5 shadow-sm">
              <div className="font-bold text-xs text-[#17151A]">Laporan Darurat</div>
              <p className="text-[11px] text-[#68626D]">Eskalasi bukti pelanggaran berat</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#5B3A6D]/10 space-y-1.5 shadow-sm">
              <div className="font-bold text-xs text-[#17151A]">Status Layanan</div>
              <p className="text-[11px] text-[#68626D]">Pembaruan pemeliharaan sistem</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-[#5B3A6D]/10 space-y-1.5 shadow-sm">
              <div className="font-bold text-xs text-[#17151A]">Hak Hapus Akun</div>
              <p className="text-[11px] text-[#68626D]">Perintah mandiri /delete_account</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#5B3A6D]/10 text-xs text-[#68626D] text-center max-w-2xl mx-auto">
            <strong>Penting:</strong> Bot Telegram bukan tempat panggilan video Stranger Cam. Panggilan video Stranger Cam tetap berlangsung secara WebRTC di peramban web NIVA.
          </div>
        </div>
      </section>

      {/* 9. NIVA DATING APPS — COMING SOON */}
      <section id="dating-waitlist" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-[#3B123F] via-[#5B3A6D] to-[#8A5A9A] text-white p-8 sm:p-14 rounded-3xl shadow-hover space-y-8 relative overflow-hidden">
          <div className="text-center max-w-3xl mx-auto space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-[#E8B4C8] text-xs font-bold tracking-wider uppercase backdrop-blur-md">
              <Sparkles className="w-4 h-4" />
              <span>Coming Soon</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight leading-tight">
              NIVA Dating Apps
            </h2>

            <p className="text-lg sm:text-xl font-semibold text-[#E8B4C8]">
              Meet Someone Worth Knowing in Semarang.
            </p>

            <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto leading-relaxed">
              NIVA Dating Apps sedang dipersiapkan sebagai ruang social/dating matching dengan pendekatan AI-assisted discovery, verifikasi KTM berbasis AI dan manual review, serta fitur report dan block untuk membantu membangun lingkungan interaksi yang lebih bertanggung jawab di Semarang.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] sm:text-xs font-semibold text-white">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">COMING SOON</span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">AI-ASSISTED</span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">KTM VERIFIED</span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">SAFETY FOCUSED</span>
            </div>
          </div>

          <div className="relative z-10 pt-2">
            <DatingWaitlistForm />
          </div>
        </div>
      </section>

      {/* 10. SECURITY & PRIVACY CENTER */}
      <section id="keamanan" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Pusat Keamanan & Privasi</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Bagaimana NIVA Melindungi Pengguna?
          </h2>
          <p className="text-base text-[#68626D]">
            Kami merancang NIVA dengan prinsip privacy-first, minimisasi data, dan kontrol pengguna yang tegas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: 18+ Only */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">1. 18+ Only</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              NIVA ditujukan untuk pengguna berusia minimal 18 tahun. Jika sistem atau laporan yang valid menunjukkan adanya pengguna di bawah umur, akses dapat dibatasi atau dihentikan sesuai prosedur keselamatan NIVA.
            </p>
          </div>

          {/* Card 2: Semarang Gate */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">2. Semarang Location Gate</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Stranger Chat dan Stranger Cam hanya tersedia ketika perangkat memberikan izin lokasi dan sistem memverifikasi bahwa pengguna berada di Kota atau Kabupaten Semarang. Koordinat presisi tidak pernah ditampilkan.
            </p>
          </div>

          {/* Card 3: Report */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#C94B5B]/10 text-[#C94B5B] flex items-center justify-center font-bold">
              <Flag className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">3. Report System</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Kategori laporan mencakup spam, pelecehan seksual, penipuan finansial, ancaman kekerasan, pemerasan, hingga konten tidak pantas. Setiap laporan masuk ke antrean investigasi admin secara riil.
            </p>
          </div>

          {/* Card 4: Block */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#17151A]/10 text-[#17151A] flex items-center justify-center font-bold">
              <UserX className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">4. Block Instan</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Merasa tidak nyaman? Tekan tombol Block seketika untuk menghentikan percakapan, memutus koneksi transport aktif, dan mencegah sistem memasangkan Anda kembali dengan pengguna tersebut di masa depan.
            </p>
          </div>

          {/* Card 5: Anti-Scam */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">5. Anti-Scam Controls</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Sensor teks otomatis mendeteksi pola nomor telepon, phishing, permintaan pinjaman, dan slot gacor. <strong>Peringatan:</strong> Jangan pernah mengirim uang, kode OTP, atau password kepada orang yang baru dikenal.
            </p>
          </div>

          {/* Card 6: Anti-NSFW */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center font-bold">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">6. Anti-NSFW & Harassment</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              AI-assisted moderation dan mekanisme pelaporan pengguna bekerja bersama untuk menindak perilaku seksual eksplisit, eksibisionisme, dan pelecehan seksual di platform.
            </p>
          </div>
        </div>
      </section>

      {/* 11. WHAT NIVA DOES / DOES NOT STORE (UU PDP) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-display font-bold text-[#17151A] tracking-tight">
            Data Apa yang NIVA Simpan?
          </h2>
          <p className="text-xs sm:text-sm text-[#68626D]">
            Transparansi pengelolaan data mengacu pada prinsip UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* We Store */}
          <div className="bg-white p-7 rounded-2xl border border-[#2D8C6A]/20 shadow-soft space-y-4">
            <div className="flex items-center gap-2 text-[#2D8C6A] font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              <h3>Data yang Disimpan / Diproses</h3>
            </div>
            <ul className="text-xs text-[#68626D] space-y-2.5 list-disc pl-4 leading-relaxed">
              <li><strong>Status Sesi Percakapan:</strong> Timestamp mulai dan berakhir sesi, serta status matchmaking aktif.</li>
              <li><strong>Status Kelayakan Wilayah:</strong> Hasil validasi biner (Kota/Kab. Semarang) tanpa menyimpan koordinat GPS mentah.</li>
              <li><strong>Metadata Pelanggaran:</strong> Cuplikan teks bukti (&lt;75 karakter) yang dilaporkan secara eksplisit oleh pengguna untuk keperluan penegakan Three-Strike.</li>
              <li><strong>Identitas Telegram:</strong> User ID Telegram jika pengguna memilih menghubungkan bot untuk notifikasi atau verifikasi KTM.</li>
              <li><strong>Hash Dokumen KTM:</strong> Hasil verifikasi hash satu arah untuk mencegah pemalsuan identitas ganda (dokumen mentah dihapus bertahap).</li>
            </ul>
          </div>

          {/* We DO NOT Store */}
          <div className="bg-white p-7 rounded-2xl border border-[#C94B5B]/20 shadow-soft space-y-4">
            <div className="flex items-center gap-2 text-[#C94B5B] font-bold text-base">
              <Ban className="w-5 h-5" />
              <h3>Data yang TIDAK Pernah Disimpan</h3>
            </div>
            <ul className="text-xs text-[#68626D] space-y-2.5 list-disc pl-4 leading-relaxed">
              <li><strong>Riwayat Percakapan Teks Penuh:</strong> Isi pesan teks Stranger Chat hanya berada di memori transport aktif dan dihapus seketika saat sesi berakhir.</li>
              <li><strong>Rekaman Video atau Audio:</strong> Panggilan video Stranger Cam tidak pernah direkam atau diunggah ke server NIVA.</li>
              <li><strong>Koordinat GPS Presisi:</strong> Titik koordinat latitude/longitude perangkat Anda tidak pernah disimpan permanen atau dibagikan ke pengguna lain.</li>
              <li><strong>Kata Sandi / Kredensial Pribadi:</strong> NIVA tidak meminta PIN ATM, kata sandi email, atau data perbankan pengguna.</li>
            </ul>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#5B3A6D]/5 border border-[#5B3A6D]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span className="text-[#68626D]">
            Anda memiliki hak atas data pribadi Anda: meminta penghapusan, pembaruan, atau mengajukan pertanyaan privasi.
          </span>
          <Link
            href="/privacy"
            className="px-5 py-2.5 rounded-full font-bold text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] transition-colors shrink-0"
          >
            Pelajari Kebijakan Privasi & UU PDP
          </Link>
        </div>
      </section>

      {/* 12. MEETUP SAFETY (KALAU KAMU MEMUTUSKAN BERTEMU DI DUNIA NYATA) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 text-xs font-bold uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4" />
            <span>Panduan Keselamatan Tatap Muka</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Kalau Kamu Memutuskan Bertemu di Dunia Nyata
          </h2>
          <p className="text-sm sm:text-base text-[#68626D] leading-relaxed">
            NIVA membantu menyediakan ruang untuk berkenalan secara online. Pertemuan langsung adalah keputusan pribadi Anda dan memiliki dinamika risiko yang berbeda dari interaksi di platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
              <span>1. Pilih Tempat Publik Ramai</span>
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Bertemulah di kafe produktif, mall, atau area kampus yang ramai di siang atau sore hari. Hindari tempat sepi, kamar kos, atau kendaraan tertutup.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
              <span>2. Beri Tahu Sahabat Sekos</span>
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Beri tahu teman atau keluarga mengenai nama orang yang ditemui, lokasi spesifik, dan jam berapa Anda berencana pulang.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
              <span>3. Transportasi Mandiri</span>
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Datang dan pulang menggunakan kendaraan pribadi atau transportasi online Anda sendiri agar bebas meninggalkan lokasi kapan saja.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
              <span>4. Jangan Kirim / Pinjamkan Uang</span>
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Jangan melakukan transaksi finansial, meminjamkan saldo, atau membayar pesanan orang yang baru Anda kenal.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
              <span>5. Percayai Batasanmu</span>
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Jika Anda merasa tidak nyaman atau curiga, Anda berhak membatalkan janji temu kapan saja tanpa perlu merasa bersalah.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-2.5">
            <h3 className="font-bold text-base text-[#17151A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
              <span>6. Tidak Ada Kewajiban Bertemu</span>
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Tidak ada keharusan untuk bertemu tatap muka hanya karena sudah chatting. Keselamatan Anda selalu nomor satu.
            </p>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/guides/safe-meetup"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#5B3A6D] hover:underline"
          >
            <span>Baca Checklist Lengkap Panduan Bertemu Tatap Muka di Semarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 13. SAFETY INCIDENT FLOW & EMERGENCY NOTICE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        <div className="p-7 rounded-3xl bg-slate-900 text-white space-y-5">
          <div className="flex items-center gap-2.5 text-rose-300 font-bold text-base">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2>Alur Penanganan Insiden Keamanan & Layanan Darurat</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300 leading-relaxed">
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="font-bold text-white text-sm block">Kasus di Dalam Layanan NIVA:</span>
              <div className="flex items-center gap-2 text-xs text-gray-200">
                <span>Merasa Tidak Nyaman</span> ➔ <span>Block</span> ➔ <span>Report</span> ➔ <span>Simpan Bukti Screenshot</span> ➔ <span>Moderasi NIVA Menindak</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Gunakan tombol report pada sesi aktif agar cuplikan bukti terkirim langsung ke antrean investigasi moderator.
              </p>
            </div>

            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="font-bold text-white text-sm block">Kasus Ancaman Fisik Darurat:</span>
              <div className="flex items-center gap-2 text-xs text-gray-200">
                <span>Bahaya Fisik Nyata</span> ➔ <span>Prioritaskan Keselamatan</span> ➔ <span>Hubungi Kontak Otoritas</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-bold text-[11px]">
                <div className="p-2 bg-white/10 rounded-lg text-emerald-400">110 (Polisi)</div>
                <div className="p-2 bg-white/10 rounded-lg text-emerald-400">112 (Darurat)</div>
                <div className="p-2 bg-white/10 rounded-lg text-emerald-400">129 (SAPA)</div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 border-t border-white/10 pt-3">
            <strong>Batas Tanggung Jawab:</strong> NIVA menyediakan fitur komunikasi, enkripsi transport, report, block, dan moderasi di platform. Setelah pengguna memilih bertemu langsung di luar platform, keputusan dan risiko berada di luar kendali teknis NIVA.
          </p>
        </div>
      </section>

      {/* 14. STUDENT REVIEWS (GENUINE DATA ONLY) */}
      <section id="ulasan" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-bold uppercase tracking-wider">
            <Star className="w-4 h-4 text-amber-500" />
            <span>Pengalaman Pengguna Nyata</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            What Students Are Saying
          </h2>
          <p className="text-sm sm:text-base text-[#68626D] leading-relaxed">
            Pendapat dan pengalaman jujur dari mahasiswa Semarang yang telah menggunakan NIVA. Kami tidak menggunakan review rekayasa.
          </p>
        </div>

        {/* Real Reviews Cards or Authentic Empty State */}
        {publicReviews.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#5B3A6D]/20 rounded-3xl bg-white p-8 space-y-4 max-w-2xl mx-auto">
            <MessageSquare className="w-10 h-10 text-[#5B3A6D]/40 mx-auto" />
            <h3 className="text-base font-bold text-[#17151A]">
              Be Among the First to Share Your NIVA Experience
            </h3>
            <p className="text-xs text-[#68626D] leading-relaxed max-w-md mx-auto">
              NIVA tidak memalsukan ulasan atau merekayasa rating untuk tujuan promosi. Ulasan publik berasal dari pengguna yang mengirimkannya melalui sistem review NIVA dan ditampilkan setelah disetujui tim moderasi.
            </p>
            <div className="pt-2">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] transition-colors"
              >
                <span>Tulis Ulasan Pengalaman Anda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {publicReviews.map((rev: any) => (
                <div
                  key={rev.id}
                  className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[#17151A] leading-relaxed italic">
                      "{rev.review_text}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#5B3A6D]/10 text-[11px] text-[#68626D]">
                    <div className="font-bold text-[#17151A]">{rev.display_name}</div>
                    <div>{rev.institution_short_name || 'Mahasiswa Semarang'}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-2">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#5B3A6D] hover:underline"
              >
                <span>Lihat Semua Ulasan & Kirim Masukan Anda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 15. BLOG & PANDUAN SOSIAL NIVA */}
      <section id="blog" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#5B3A6D]/10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8A5A9A]/10 text-[#8A5A9A] text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Literasi Sosial & Keamanan</span>
            </div>
            <h2 className="text-3xl font-display font-bold text-[#17151A] tracking-tight">
              Blog & Panduan Sosial NIVA
            </h2>
            <p className="text-xs sm:text-sm text-[#68626D]">
              Panduan praktis, etika komunikasi, dan tips navigasi pertemanan sehat bagi mahasiswa di Semarang.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B3A6D] hover:underline self-start sm:self-auto"
          >
            <span>Semua 12 Artikel Panduan</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredArticles.map((art) => (
            <Link
              key={art.slug}
              href={`/blog/${art.slug}`}
              className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/15 shadow-soft hover:shadow-card hover:border-[#8A5A9A]/40 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#8A5A9A]">
                  <span className="font-semibold px-2.5 py-0.5 rounded-full bg-[#8A5A9A]/10">
                    {art.category}
                  </span>
                  <span>{art.readTime}</span>
                </div>
                <h3 className="font-bold text-base text-[#17151A] group-hover:text-[#5B3A6D] transition-colors leading-snug">
                  {art.title}
                </h3>
                <p className="text-xs text-[#68626D] leading-relaxed line-clamp-3">
                  {art.excerpt}
                </p>
              </div>
              <div className="pt-4 border-t border-[#5B3A6D]/10 text-[11px] text-[#68626D] flex items-center justify-between">
                <span>{art.author}</span>
                <span className="font-semibold text-[#5B3A6D] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Baca <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 16. ADVERTISING CALLOUT BANNER */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-white via-[#FAF8F6] to-white p-8 sm:p-10 rounded-3xl border border-[#5B3A6D]/20 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-bold">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Kemitraan Brand & Komunitas</span>
            </div>
            <h3 className="text-2xl font-display font-bold text-[#17151A]">
              Punya Brand, Event, atau Komunitas di Semarang?
            </h3>
            <p className="text-xs sm:text-sm text-[#68626D] max-w-xl leading-relaxed">
              Jangkau mahasiswa dan pengguna dewasa muda di Kota dan Kabupaten Semarang melalui kanal media yang aman, beretika, dan dimoderasi secara profesional.
            </p>
          </div>
          <Link
            href="/advertise"
            className="px-7 py-3.5 rounded-full font-bold text-xs sm:text-sm text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] shadow-md transition-all shrink-0 flex items-center gap-2"
          >
            <span>Beriklan di NIVA</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 17. FAQ SECTION */}
      <section id="faq" className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-display font-bold text-[#17151A] tracking-tight">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h2>
          <p className="text-sm text-[#68626D]">
            Informasi faktual dan transparan mengenai operasional platform NIVA di Semarang.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-2.5">
              <h3 className="text-sm font-bold text-[#17151A] leading-snug">
                {faq.q}
              </h3>
              <p className="text-xs text-[#68626D] leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 17b. PUSAT BANTUAN NIVA */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-[#1C1726] to-[#14111C] p-8 sm:p-12 rounded-3xl border border-[#2B2438] text-white shadow-xl space-y-6">
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/30 border border-[#5B3A6D]/60 text-xs font-semibold text-[#E8B4C8]">
              <Ticket className="w-3.5 h-3.5" />
              <span>Saluran Bantuan Resmi NIVA</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Pusat Bantuan NIVA
            </h2>
            <p className="text-xs sm:text-sm text-[#C8BED4] max-w-2xl leading-relaxed">
              Ada pertanyaan, laporan keamanan, masalah akun, kebutuhan verifikasi manual, atau ingin bekerja sama dengan NIVA? <strong>Buat Ticket Bantuan melalui NIVA.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Link
              href="/support"
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#8A5A9A]/60 hover:bg-white/10 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#5B3A6D] flex items-center justify-center text-white">
                  <Ticket className="w-5 h-5" />
                </div>
                <div className="font-bold text-base text-white group-hover:text-[#E8B4C8] transition-colors">
                  Buka Pusat Bantuan & Tiket
                </div>
                <p className="text-xs text-[#9D93A8] leading-relaxed">
                  Ajukan tiket bantuan resmi untuk ditangani langsung oleh tim staf dan moderator NIVA.
                </p>
              </div>
              <div className="text-xs font-semibold text-purple-300 flex items-center gap-1">
                <span>Buka Pusat Bantuan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/ai-support"
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#8A5A9A]/60 hover:bg-white/10 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5B3A6D] to-[#8A5A9A] flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="font-bold text-base text-white group-hover:text-[#E8B4C8] transition-colors">
                  Tanya AI NIVA
                </div>
                <p className="text-xs text-[#9D93A8] leading-relaxed">
                  Dapatkan jawaban cepat seputar fitur, keselamatan berteman, privasi UU PDP, dan aturan komunitas.
                </p>
              </div>
              <div className="text-xs font-semibold text-[#E8B4C8] flex items-center gap-1">
                <span>Mulai Tanya AI</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          <p className="text-[11px] text-[#9D93A8] border-t border-[#2B2438] pt-4">
            ℹ️ Tim NIVA mungkin tidak selalu tersedia 24/7. Jika pesan belum langsung mendapat respons, ticket Anda tetap tersimpan dan dapat ditindaklanjuti oleh admin ketika tersedia.
          </p>
        </div>
      </section>

      {/* 18. FINAL CTA */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-[#3B123F] via-[#5B3A6D] to-[#8A5A9A] text-white p-10 sm:p-14 rounded-3xl shadow-hover text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight leading-tight">
            Siap kenalan dengan orang baru di Semarang?
          </h2>
          <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto leading-relaxed">
            Masuk tanpa registrasi akun untuk fitur Stranger. Obrolan teks atau video langsung antar-browser dengan perlindungan privasi mutakhir.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/stranger-chat"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-sm text-[#3B123F] bg-white hover:bg-[#FAF8F6] shadow-md transition-all"
            >
              <MessageSquare className="w-4 h-4 text-[#5B3A6D]" />
              <span>Mulai Stranger Chat</span>
            </Link>
            <Link
              href="/stranger-cam"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-sm text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-all"
            >
              <Video className="w-4 h-4" />
              <span>Coba Stranger Cam</span>
            </Link>
          </div>
          <div className="text-[11px] sm:text-xs text-[#E8B4C8] font-medium pt-2">
            18+ • Semarang Only • Privacy Focused • Report & Block Available
          </div>
        </div>
      </section>
    </div>
  );
}
