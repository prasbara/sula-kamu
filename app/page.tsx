import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  Send, 
  ArrowRight, 
  Sparkles, 
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
  HeartHandshake
} from 'lucide-react';
import { SITE_CONFIG, FIXED_INSTITUTION_COUNT } from '@/lib/constants';
import LiveStatsBar from '@/components/LiveStatsBar';
import DatingWaitlistForm from '@/components/DatingWaitlistForm';
import JsonLd from '@/components/JsonLd';

export default function HomePage() {
  const faqs = [
    {
      q: 'Apakah NIVA membutuhkan pendaftaran?',
      a: 'Untuk Stranger Chat dan Stranger Cam, pengguna tidak perlu membuat akun jika memenuhi persyaratan akses. Cukup konfirmasi usia 18+, konfirmasi domisili area Semarang, dan setujui aturan keselamatan.',
    },
    {
      q: 'Apakah NIVA menyimpan video call?',
      a: 'NIVA tidak melakukan perekaman video call secara otomatis. Arsitektur WebRTC kami beroperasi secara langsung antar-browser (peer-to-peer). Server hanya menangani proses signaling/matchmaking dan tidak menyimpan aliran audio maupun video.',
    },
    {
      q: 'Apakah saya harus memberikan KTM?',
      a: 'KTM tidak diperlukan untuk Stranger Chat dan Stranger Cam. Verifikasi KTM digunakan khusus untuk ekosistem akun terverifikasi seperti Telegram Bot NIVA dan NIVA Dating Apps yang membutuhkan identitas mahasiswa tervalidasi.',
    },
    {
      q: 'Apakah Stranger Chat aman?',
      a: 'NIVA menerapkan sistem sensor kontak otomatis (anti-scam), penyaringan nomor telepon, rate limiting, Three-Strike enforcement, serta tombol Report dan Block seketika. Meskipun demikian, tidak ada platform online dengan risiko nol, sehingga Anda disarankan untuk tidak membagikan informasi pribadi kepada orang asing.',
    },
    {
      q: 'Bagaimana jika saya mengalami pelecehan?',
      a: 'Gunakan fitur Report dan Block seketika untuk memutus koneksi dan mencatat laporan ke antrean moderasi. Jika Anda membutuhkan bantuan lebih lanjut atau terjadi ancaman darurat, simpan tangkapan layar bukti dan hubungi admin melalui kanal resmi NIVA atau otoritas darurat terkait.',
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

  return (
    <div className="space-y-24 md:space-y-32 pb-24 overflow-hidden">
      <JsonLd data={jsonLdFaq} />

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
                  Semarang Community Platform
                </div>
              </div>
            </div>
          </div>

          {/* Core Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-semibold text-[#5B3A6D]">
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">18+ Only</span>
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">Semarang Community</span>
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">1-on-1</span>
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">Privacy First</span>
            <span className="px-3 py-1 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20">Moderated</span>
          </div>

          {/* Main H1 Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-[#17151A] tracking-tight leading-[1.1]">
            Meet a Stranger.{' '}
            <span className="bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#E8B4C8] bg-clip-text text-transparent">
              Start a Conversation.
            </span>
          </h1>

          {/* Supporting Subheadline */}
          <p className="text-lg sm:text-xl text-[#68626D] max-w-2xl mx-auto leading-relaxed font-normal">
            Stranger Chat dan Stranger Cam 1-on-1 untuk komunitas Semarang. Masuk tanpa registrasi, temukan orang yang sedang online, dan ngobrol dengan privacy-first protection.
          </p>

          {/* Primary Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/stranger-chat"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-95 shadow-card hover:shadow-hover transition-all transform hover:-translate-y-0.5"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Start Stranger Chat</span>
            </Link>

            <Link
              href="/stranger-cam"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full text-base font-bold text-[#17151A] bg-white hover:bg-[#FAF8F6] border border-[#5B3A6D]/20 shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <Video className="w-5 h-5 text-[#5B3A6D]" />
              <span>Open Stranger Cam</span>
            </Link>
          </div>

          {/* Live System Metrics Bar */}
          <LiveStatsBar />
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8A5A9A]/10 text-[#8A5A9A] text-xs font-bold uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Alur Penggunaan</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            How It Works
          </h2>
          <p className="text-base text-[#68626D]">
            Empat langkah sederhana untuk terhubung secara anonim dan aman di Kota Semarang.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3 relative group hover:border-[#8A5A9A]/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="text-xl font-bold text-[#17151A]">Enter</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Cukup konfirmasi usia 18+ dan domisili Semarang di browser. Tanpa registrasi akun, tanpa mengisi form identitas pribadi.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3 relative group hover:border-[#8A5A9A]/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center font-bold text-lg">
              2
            </div>
            <h3 className="text-xl font-bold text-[#17151A]">Get Matched</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Sistem matchmaking otomatis memasangkan Anda secara acak 1-on-1 dengan sesama pengguna yang sedang online di area Semarang.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3 relative group hover:border-[#8A5A9A]/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center font-bold text-lg">
              3
            </div>
            <h3 className="text-xl font-bold text-[#17151A]">Start Talking</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Ngobrol lewat teks yang dilindungi anti-scam atau video WebRTC peer-to-peer berkualitas tinggi dengan proteksi privasi mutakhir.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3 relative group hover:border-[#8A5A9A]/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#C94B5B]/10 text-[#C94B5B] flex items-center justify-center font-bold text-lg">
              4
            </div>
            <h3 className="text-xl font-bold text-[#17151A]">Skip Anytime</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Jika percakapan tidak sesuai minat atau partner tidak responsif, lewati partner kapan saja dengan tombol Skip tanpa batasan.
            </p>
          </div>
        </div>
      </section>

      {/* 3. STRANGER CHAT SHOWCASE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-white via-[#FAF8F6] to-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15 shadow-soft grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8A5A9A]/10 text-[#8A5A9A] text-xs font-bold">
              <MessageSquare className="w-4 h-4" />
              <span>Stranger Chat Semarang</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
              Obrolan Teks Acak 1-on-1 Tanpa Akun
            </h2>
            <p className="text-sm sm:text-base text-[#68626D] leading-relaxed">
              NIVA Stranger Chat memungkinkan pengguna dewasa di komunitas Semarang bertemu secara acak dan memulai percakapan 1-on-1 tanpa harus membuat akun.
            </p>
            <div className="space-y-3 text-xs sm:text-sm text-[#68626D]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>Multi-Stage Server Moderation:</strong> Pembersihan Unicode homoglyph dan deteksi pola teks tersembunyi (S1OT G4C0R, variasi nomor WhatsApp).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>Perlindungan Nomor HP:</strong> Penyensoran otomatis nomor telepon (+62/08) demi mencegah tindak penipuan finansial.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>Zero Plaintext Storage:</strong> Isi pesan hanya berada di memori transport aktif dan tidak disimpan dalam database.</span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/stranger-chat"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm text-white bg-[#5B3A6D] hover:bg-[#8A5A9A] shadow-md transition-all"
              >
                <span>Start Stranger Chat</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-[#17151A] text-white p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-200">Stranger Session (Semarang)</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono bg-white/10 px-2 py-0.5 rounded">EPHEMERAL</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="bg-white/10 p-3 rounded-xl max-w-[85%] text-gray-200">
                Halo! Kuliah atau kerja di daerah Semarang mana?
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

      {/* 4. STRANGER CAM SHOWCASE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-white via-[#FAF8F6] to-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15 shadow-soft grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
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
                <p className="text-xs font-bold text-white">Peer-to-Peer Encrypted Stream</p>
                <p className="text-[11px] text-gray-400 max-w-xs">
                  Video dan audio diproses langsung di perangkat Anda tanpa pipeline rekaman server.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
              <span>● Deteksi Wajah Lokal di Browser</span>
              <span>● Skip / Block Seketika</span>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-bold">
              <Video className="w-4 h-4" />
              <span>Stranger Cam Semarang</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
              Real-Time Browser Video Conversation
            </h2>
            <p className="text-sm sm:text-base text-[#68626D] leading-relaxed">
              NIVA Stranger Cam mempertemukan pengguna dewasa secara acak melalui browser menggunakan koneksi video 1-on-1. Kamera dan mikrofon digunakan untuk sesi aktif dan NIVA tidak melakukan perekaman otomatis.
            </p>
            <div className="space-y-3 text-xs sm:text-sm text-[#68626D]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>WebRTC Peer-to-Peer:</strong> Koneksi video langsung antar peramban dengan enkripsi DTLS/SRTP standar industri.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>No Automatic Recording:</strong> Server tidak merekam, menyimpan, atau mengunggah panggilan video Anda ke penyimpanan apa pun.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A] shrink-0 mt-0.5" />
                <span><strong>Kontrol Keamanan Penuh:</strong> Tombol Skip untuk berganti partner seketika, serta Report & Block saat terjadi pelanggaran.</span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/stranger-cam"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm text-[#17151A] bg-white hover:bg-[#FAF8F6] border border-[#5B3A6D]/20 shadow-sm transition-all"
              >
                <span>Open Stranger Cam</span>
                <ArrowRight className="w-4 h-4 text-[#5B3A6D]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST SECTION — BUILT FOR SAFER CONVERSATIONS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Standar Keamanan Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Built for Safer Conversations
          </h2>
          <p className="text-base text-[#68626D]">
            Designed with privacy and safety controls. Kami mengutamakan pencegahan penyalahgunaan dan perlindungan data pengguna.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">18+ Only</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Dirancang untuk pengguna dewasa muda. Akses dibatasi secara tegas bagi pengguna di bawah umur demi mematuhi regulasi digital.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">Semarang Community</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Matchmaking dibatasi pada komunitas yang memenuhi eligibility Semarang tanpa pernah mengekspos koordinat GPS presisi kepada partner.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">1-on-1</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Percakapan dilakukan secara private antar dua pengguna langsung, tanpa perantara, ruang publik, atau penonton luar.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#E8B4C8]/30 text-[#8A5A9A] flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">No Automatic Recording</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              NIVA tidak merekam video call secara otomatis. Server kami tidak memiliki sistem penyimpanan untuk media audio maupun video.
            </p>
          </div>

          {/* Pillar 5 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#C94B5B]/10 text-[#C94B5B] flex items-center justify-center">
              <Flag className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">Report & Block</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Pengguna dapat menghentikan percakapan dan melaporkan penyalahgunaan. Akun yang melanggar ditindak melalui moderasi server.
            </p>
          </div>

          {/* Pillar 6 */}
          <div className="bg-white p-7 rounded-2xl border border-[#5B3A6D]/10 shadow-soft space-y-3">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#8A5A9A] flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#17151A]">Privacy First</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Data yang tidak diperlukan tidak dikumpulkan. Tanpa nama asli, tanpa email, dan tanpa password untuk fitur Stranger Chat & Cam.
            </p>
          </div>
        </div>
      </section>

      {/* 6. COMING SOON — NIVA DATING APPS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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
              NIVA Dating Apps sedang dipersiapkan untuk membantu pengguna menemukan teman, koneksi, atau pasangan dengan pendekatan yang lebih terverifikasi.
              Pengguna akan melalui verifikasi KTM berbasis AI dan manual review sebelum mendapatkan akses ke fitur dating.
              Kami membangun sistem dengan fokus pada privacy, verification, anti-scam, dan mekanisme report & block.
            </p>

            {/* Architecture Flow Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] sm:text-xs font-medium text-white/80">
              <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">Coming Soon</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">Register Interest</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">KTM Verification</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">AI + Manual Review</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">Verified Profile</span>
            </div>

            <div className="text-xs font-bold text-[#E8B4C8] pt-1">
              Verified people. Real connections. Safer dating.
            </div>
          </div>

          {/* Interactive Waitlist Subscription Component */}
          <div className="relative z-10 pt-2">
            <DatingWaitlistForm />
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
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

      {/* 8. SAFETY & EMERGENCY NOTICE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[#17151A] space-y-2 text-xs sm:text-sm leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Pemberitahuan Keselamatan & Bantuan Resmi</span>
          </div>
          <p className="text-[#68626D] text-xs">
            NIVA menyediakan mekanisme report, block, dan bantuan admin untuk penyalahgunaan di platform. Jika Anda mengalami kekerasan verbal, ancaman, pelecehan seksual, pemerasan, atau bentuk kejahatan lainnya, simpan bukti yang tersedia dan hubungi admin melalui kanal resmi NIVA. Jika terdapat keadaan darurat atau ancaman langsung terhadap keselamatan fisik, hubungi layanan darurat 110 (Kepolisian) atau 112 (Panggilan Darurat Kota Semarang).
          </p>
        </div>
      </section>
    </div>
  );
}
