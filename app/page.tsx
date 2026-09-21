import Link from 'next/link';
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
  Compass, 
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { SITE_CONFIG, SEMARANG_INSTITUTIONS } from '@/lib/constants';

export default function HomePage() {
  const faqs = [
    {
      q: 'Apakah NIVA merupakan aplikasi resmi dari universitas di Semarang?',
      a: 'Tidak. NIVA adalah platform independen yang dibangun khusus untuk melayani mahasiswa di wilayah Semarang. NIVA tidak berafiliasi, dioperasikan, atau disponsori oleh perguruan tinggi mana pun.',
    },
    {
      q: 'Bagaimana cara NIVA memverifikasi status mahasiswa?',
      a: 'NIVA menggunakan teknologi analisa Kartu Tanda Mahasiswa (KTM) berbasis kecerdasan buatan (AI Vision) dan tim reviewer manusia untuk mengonfirmasi sinyal keaktifan mahasiswa. Verifikasi kartu memastikan sinyal status mahasiswa valid, sementara kontrol keamanan terpisah melindungi komunitas dari penyalahgunaan.',
    },
    {
      q: 'Apakah data NIM atau foto KTM saya akan terlihat oleh pengguna lain?',
      a: 'Sama sekali tidak. Foto kartu mahasiswa Anda disimpan sementara secara terenkripsi dan dihapus secara otomatis sesuai batas retensi privasi. Data sensitif seperti NIM, nomor telepon, dan email tidak pernah dipublikasikan kepada pengguna lain.',
    },
    {
      q: 'Mengapa NIVA dijalankan melalui Telegram Bot?',
      a: 'Telegram menyediakan infrastruktur yang sangat cepat, ringan, aman, dan mudah diakses di smartphone Android maupun iOS tanpa perlu mengunduh aplikasi pihak ketiga yang membebani memori ponsel Anda.',
    },
    {
      q: 'Berapa biaya untuk menggunakan NIVA?',
      a: 'NIVA dapat digunakan secara gratis oleh seluruh mahasiswa terverifikasi di Semarang dengan kuota like dan interaksi harian yang adil.',
    },
    {
      q: 'Siapa saja yang boleh bergabung di NIVA?',
      a: 'NIVA hanya diperuntukkan bagi mahasiswa aktif berusia 18 tahun ke atas yang sedang menempuh pendidikan tinggi di wilayah Semarang dan sekitarnya.',
    },
  ];

  return (
    <div className="space-y-24 md:space-y-32 pb-24 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 md:pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20 text-[#5B3A6D] text-xs sm:text-sm font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-[#8A5A9A]" />
            <span>Ekosistem Pertemanan Mahasiswa Semarang</span>
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
              <span className="text-[11px] text-[#68626D]">Sinyal status kartu</span>
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

      {/* 2. WHY NIVA */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8A5A9A]">
            Mengapa Memilih NIVA
          </h2>
          <p className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Bertemu orang baru di luar lingkaran kampus Anda.
          </p>
          <p className="text-base text-[#68626D]">
            Tempat aman untuk mahasiswa di Semarang memperluas circle pertemanan, berdiskusi, dan mencari pasangan yang sefrekuensi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft hover:shadow-card transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center mb-6">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#17151A] mb-3">Verified Students</h3>
            <p className="text-sm text-[#68626D] leading-relaxed">
              Setiap anggota diverifikasi menggunakan Kartu Tanda Mahasiswa untuk meminimalisasi akun palsu dan bot komersial.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft hover:shadow-card transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#8A5A9A]/10 text-[#8A5A9A] flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#17151A] mb-3">Shared Interests</h3>
            <p className="text-sm text-[#68626D] leading-relaxed">
              Jelajahi profil mahasiswa dengan minat yang sama—dari coding, fotografi, cafe hopping di Pleburan, hingga musik dan diskusi karir.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft hover:shadow-card transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#E8B4C8]/30 text-[#5B3A6D] flex items-center justify-center mb-6">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#17151A] mb-3">Mutual Connections</h3>
            <p className="text-sm text-[#68626D] leading-relaxed">
              Percakapan hanya dapat dimulai ketika kedua belah pihak saling menyukai. Bebas dari pesan spam atau gangguan yang tidak diinginkan.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-[#5B3A6D]/10 shadow-soft hover:shadow-card transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#17151A] mb-3">Privacy-First Design</h3>
            <p className="text-sm text-[#68626D] leading-relaxed">
              Nomor WhatsApp, email, dan username Telegram asli Anda tetap terlindungi melalui perantara chat bot yang aman.
            </p>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="bg-white py-20 border-y border-[#5B3A6D]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8A5A9A]">
              Alur Penggunaan
            </h2>
            <p className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
              Enam langkah sederhana menuju koneksi yang bermakna.
            </p>
            <p className="text-base text-[#68626D]">
              Dirancang ringkas langsung di Telegram tanpa perlu instalasi aplikasi tambahan yang rumit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-3">
              <span className="inline-block w-8 h-8 rounded-lg bg-[#5B3A6D] text-white font-bold text-sm text-center leading-8">1</span>
              <h3 className="text-lg font-bold text-[#17151A]">Verifikasi Status Mahasiswa</h3>
              <p className="text-sm text-[#68626D]">
                Pilih kampus Anda di Semarang dan unggah foto KTM. AI Vision memeriksa keaslian kartu secara otomatis.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-3">
              <span className="inline-block w-8 h-8 rounded-lg bg-[#5B3A6D] text-white font-bold text-sm text-center leading-8">2</span>
              <h3 className="text-lg font-bold text-[#17151A]">Lengkapi Profil Diri</h3>
              <p className="text-sm text-[#68626D]">
                Tulis nama panggilan, jurusan, area tempat tinggal di Semarang, tujuan pertemanan, dan minat favorit Anda.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-3">
              <span className="inline-block w-8 h-8 rounded-lg bg-[#5B3A6D] text-white font-bold text-sm text-center leading-8">3</span>
              <h3 className="text-lg font-bold text-[#17151A]">Eksplorasi Profil Mahasiswa</h3>
              <p className="text-sm text-[#68626D]">
                Lihat kartu profil mahasiswa lain yang berada di sekitar Semarang dengan informasi kampus yang sudah terverifikasi.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-3">
              <span className="inline-block w-8 h-8 rounded-lg bg-[#8A5A9A] text-white font-bold text-sm text-center leading-8">4</span>
              <h3 className="text-lg font-bold text-[#17151A]">Like atau Lewati</h3>
              <p className="text-sm text-[#68626D]">
                Kirimkan tanda suka jika Anda tertarik berkenalan, atau lewati untuk melihat mahasiswa berikutnya.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-3">
              <span className="inline-block w-8 h-8 rounded-lg bg-[#8A5A9A] text-white font-bold text-sm text-center leading-8">5</span>
              <h3 className="text-lg font-bold text-[#17151A]">Match Saat Minat Mutual</h3>
              <p className="text-sm text-[#68626D]">
                Ketika orang yang Anda sukai juga menyukai Anda kembali, sistem NIVA akan otomatis mencocokkan profil Anda berdua.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-3">
              <span className="inline-block w-8 h-8 rounded-lg bg-[#8A5A9A] text-white font-bold text-sm text-center leading-8">6</span>
              <h3 className="text-lg font-bold text-[#17151A]">Mulai Percakapan Aman</h3>
              <p className="text-sm text-[#68626D]">
                Mengobrol santai melalui sesi chat terenkripsi di Telegram dengan perlindungan tombol blokir dan lapor kapan saja.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY VERIFICATION MATTERS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-[#5B3A6D]/5 via-[#8A5A9A]/10 to-transparent p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
                <span>Transparansi & Batasan Keamanan</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
                Mengapa Verifikasi Mahasiswa Sangat Penting?
              </h2>
              <p className="text-base text-[#68626D] leading-relaxed">
                NIVA menggunakan verifikasi mahasiswa untuk mengurangi akun palsu dan meningkatkan rasa saling percaya di lingkungan kampus.
              </p>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white border border-[#5B3A6D]/10">
                  <h3 className="font-bold text-sm text-[#17151A] mb-1">
                    Verifikasi Status Mahasiswa, Bukan Bukti Kepemilikan Wajah Mutlak
                  </h3>
                  <p className="text-xs text-[#68626D] leading-relaxed">
                    Verifikasi kartu mahasiswa mengonfirmasi sinyal status keaktifan akademik pengguna di institusi Semarang. Untuk menjaga integritas menyeluruh, NIVA menerapkan kontrol keamanan dan moderasi perilaku terpisah.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#5B3A6D]/10">
                  <h3 className="font-bold text-sm text-[#17151A] mb-1">
                    Proteksi Privasi Maksimal (Privacy-by-Design)
                  </h3>
                  <p className="text-xs text-[#68626D] leading-relaxed">
                    KTM Anda hanya diproses untuk ekstraksi sinyal keaktifan dan segera dimusnahkan sesuai retention limit. NIM Anda tidak akan pernah dibagikan kepada siapa pun.
                  </p>
                </div>
              </div>

              <div>
                <Link
                  href="/student-verification"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#5B3A6D] hover:text-[#8A5A9A]"
                >
                  <span>Pelajari selengkapnya tentang proses verifikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Visual Card Mockup */}
            <div className="relative mx-auto w-full max-w-sm bg-white p-6 rounded-2xl shadow-card border border-[#5B3A6D]/10 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#5B3A6D] text-white flex items-center justify-center font-bold">
                    A
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#17151A]">Alden, 20</h4>
                    <p className="text-xs text-[#68626D]">Teknik Informatika</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2D8C6A] bg-[#2D8C6A]/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                </span>
              </div>
              <div className="space-y-2 text-xs text-[#68626D]">
                <p><strong className="text-[#17151A]">Kampus:</strong> Universitas Islam Sultan Agung (UNISSULA)</p>
                <p><strong className="text-[#17151A]">Area:</strong> Tembalang / Semarang</p>
                <p><strong className="text-[#17151A]">Minat:</strong> #Coding&Tech #Ngopi #Music</p>
              </div>
              <div className="p-3 bg-[#FAF8F6] rounded-xl text-xs text-[#17151A] italic">
                “Lets grab some coffee around Tembalang or Pleburan maybe?”
              </div>
              <div className="text-[10px] text-[#68626D] text-center border-t pt-2 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> NIM & Akun Telegram Terlindungi
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SAFETY & COMMUNITY CONTROLS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8A5A9A]">
            Perlindungan Komunitas
          </h2>
          <p className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
            Ruang sosial aman dengan kontrol penuh di tangan Anda.
          </p>
          <p className="text-base text-[#68626D]">
            Kami menolak keras perilaku kasar, pelecehan, dan penipuan. Setiap pengguna memiliki akses ke mekanisme pertahanan diri yang mudah digunakan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/10 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#C94B5B]/10 text-[#C94B5B] flex items-center justify-center">
              <Flag className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#17151A]">Fitur Pelaporan 24/7</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Laporkan perilaku tidak pantas dalam percakapan dengan satu ketukan. Laporan segera ditindaklanjuti oleh sistem moderasi.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/10 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#5B3A6D]/10 text-[#5B3A6D] flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#17151A]">Blokir Seketika</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Hentikan interaksi secara permanen tanpa perlu menjelaskan alasan apa pun. Pengguna yang diblokir tidak akan pernah muncul kembali di feed Anda.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#5B3A6D]/10 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#2D8C6A]/10 text-[#2D8C6A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#17151A]">Moderasi Konten & NSFW</h3>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Foto profil melewati pemeriksaan otomatis untuk mencegah konten pornografi, vulgar, atau materi tidak senonoh.
            </p>
          </div>
        </div>
      </section>

      {/* 6. SEMARANG STUDENT COMMUNITY */}
      <section className="bg-white py-20 border-y border-[#5B3A6D]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8A5A9A]">
              Ekosistem Pendidikan Tinggi
            </h2>
            <p className="text-3xl sm:text-4xl font-display font-bold text-[#17151A] tracking-tight">
              Dirancang untuk Mahasiswa di Seluruh Semarang.
            </p>
            <p className="text-base text-[#68626D]">
              NIVA dirancang untuk melayani mahasiswa dari berbagai perguruan tinggi negeri, swasta, dan politeknik di wilayah Semarang secara inklusif.
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
              Lihat Seluruh Kampus Semarang →
            </Link>
          </div>

          <div className="mt-8 text-center text-xs text-[#68626D] max-w-2xl mx-auto">
            <p>
              *Penyebutan nama perguruan tinggi di atas hanya bertujuan sebagai referensi komunitas mahasiswa di wilayah Semarang dan tidak mengindikasikan adanya afiliasi formal atau kemitraan komersial dengan pihak kampus.
            </p>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
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

      {/* 8. FINAL CTA */}
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
