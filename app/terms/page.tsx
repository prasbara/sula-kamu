import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, FileText, AlertTriangle, ArrowRight, Scale, CheckCircle2 } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan Layanan — NIVA Semarang',
  description: 'Syarat dan ketentuan resmi penggunaan platform NIVA: batasan 18+, wilayah Semarang, aturan perilaku, sistem sanksi Three-Strike, dan batasan tanggung jawab hukum.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <Scale className="w-4 h-4" />
          <span>Ketentuan Hukum & Penggunaan Platform</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-[#17151A] tracking-tight">
          Syarat & Ketentuan Layanan NIVA
        </h1>
        <p className="text-sm text-[#68626D]">
          Terakhir diperbarui: September 2026 • Berlaku efektif untuk seluruh pengguna platform NIVA
        </p>
      </div>

      <div className="prose prose-purple max-w-none text-sm text-[#68626D] space-y-8 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">1. Penerimaan Ketentuan</h2>
          <p>
            Dengan mengakses, menggunakan, atau berinteraksi pada platform NIVA (termasuk fitur <em>Stranger Chat</em>, <em>Stranger Cam</em>, bot Telegram resmi, dan situs web kami), Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui bagian mana pun dari ketentuan ini, Anda tidak diperkenankan menggunakan platform NIVA.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">2. Batasan Kelayakan Pengguna (18+ & Semarang)</h2>
          <p>
            Layanan NIVA dirancang khusus untuk komunitas dewasa muda di wilayah Kota Semarang dan sekitarnya. Untuk dapat menggunakan layanan:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Batas Usia 18+:</strong> Anda wajib berusia minimal 18 (delapan belas) tahun penuh. Penggunaan oleh individu di bawah 18 tahun dilarang keras.</li>
            <li><strong>Domisili & Kelayakan Komunitas:</strong> Matchmaking dibatasi pada area Semarang. Sistem memvalidasi kelayakan tanpa menyimpan riwayat koordinat GPS presisi Anda.</li>
            <li><strong>Tanpa Registrasi untuk Fitur Stranger:</strong> Fitur Stranger Chat dan Stranger Cam dapat diakses tanpa pendaftaran akun, selama Anda memenuhi verifikasi usia dan wilayah.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">3. Larangan Perilaku & Konten</h2>
          <p>
            Dalam menggunakan NIVA, Anda dilarang keras melakukan hal-hal berikut:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Menampilkan atau mengirim materi pornografi, ketelanjangan, eksploitasi seksual, atau konten vulgar lainnya.</li>
            <li>Melakukan pelecehan seksual, kekerasan verbal, intimidasi, pemerasan, atau ancaman keselamatan fisik.</li>
            <li>Menyebarkan tautan berbahaya (phishing, malware, shorten URL scam) atau promosi perjudian/slot online.</li>
            <li>Mencoba bertukar nomor telepon atau kontak luar dalam Stranger Chat demi menghindari sistem proteksi penipuan (anti-scam).</li>
            <li>Melakukan tindakan impersonasi, penipuan finansial, atau meminta transfer uang / kode OTP kepada pengguna lain.</li>
            <li>Menggunakan bot, scraper, atau perangkat lunak otomatis untuk mengakses layanan NIVA tanpa izin tertulis.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/15">
          <h2 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2D8C6A]" />
            <span>4. Sistem Penegakan Tiga Teguran (Three-Strike System)</span>
          </h2>
          <p>
            NIVA menerapkan sistem moderasi server-side otomatis untuk menjaga ruang interaksi tetap aman:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li><strong>Strike 1 (Teguran):</strong> Peringatan sistem dicatat saat pelanggaran terdeteksi, pesan disensor.</li>
            <li><strong>Strike 2 (Pembatasan Sementara):</strong> Akses ke matchmaking dibatasi selama 15 menit.</li>
            <li><strong>Strike 3 (Pemblokiran):</strong> Akses ditutup secara permanen dari matchmaking platform NIVA.</li>
          </ol>
          <p className="text-xs text-[#8A5A9A] font-semibold mt-2">
            *Pelanggaran berkategori kritis (ancaman berat, eksploitasi anak, atau pemerasan) langsung memicu pemblokiran akun seketika tanpa menunggu Strike 3.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">5. Privasi & Kebijakan Nol Rekaman (Zero Recording)</h2>
          <p>
            Layanan video NIVA Stranger Cam diselenggarakan secara peer-to-peer melalui protokol WebRTC. NIVA berkomitmen untuk tidak pernah merekam, menyimpan, atau menyebarkan panggilan video Anda. Aliran video dan audio tidak melewati penyimpanan server kami.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <h2 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>6. Batasan Tanggung Jawab & Keadaan Darurat</span>
          </h2>
          <p>
            NIVA menyediakan kontrol keamanan, moderasi, serta fitur Report dan Block untuk meminimalkan risiko. Namun, NIVA tidak dapat menjamin keselamatan mutlak di luar platform atau menyelesaikan seluruh kasus perselisihan secara hukum pidana/perdata. Pengguna bertanggung jawab penuh atas kehati-hatian pribadi.
          </p>
          <p className="text-xs text-[#68626D]">
            Apabila Anda menghadapi ancaman keselamatan jiwa, pemerasan fisik, atau kekerasan, segera hubungi pihak kepolisian melalui <strong>110</strong> atau layanan darurat Kota Semarang di <strong>112</strong>.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">7. Pernyataan Non-Afiliasi Kampus</h2>
          <p>
            {SITE_CONFIG.independentNotice} Seluruh penyebutan nama perguruan tinggi di Semarang hanya berfungsi sebagai identifikasi almamater komunitas mahasiswa.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">8. Kontak & Pelaporan Penyalahgunaan</h2>
          <p>
            Untuk mengajukan sanggahan sanksi, pelaporan insiden darurat, atau pertanyaan legalitas, silakan hubungi tim kami melalui email resmi atau Telegram support NIVA.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-[#5B3A6D]/10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5B3A6D] hover:text-[#8A5A9A]"
        >
          <span>Kembali ke Beranda NIVA</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="flex gap-4 text-xs text-[#8A5A9A]">
          <Link href="/privacy" className="hover:underline">Kebijakan Privasi</Link>
          <Link href="/safety" className="hover:underline">Pusat Keamanan</Link>
          <Link href="/community-guidelines" className="hover:underline">Pedoman Komunitas</Link>
        </div>
      </div>
    </div>
  );
}
