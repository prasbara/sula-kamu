import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, ShieldCheck, Trash2, ArrowRight, EyeOff, Video, MessageSquare, Database } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi & Matriks Retensi Data — NIVA Semarang',
  description: 'Kebijakan privasi resmi NIVA: perlindungan data, zero recording WebRTC, ephemeral chat transport, matriks retensi data, dan hak penghapusan akun mandiri.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  const retentionMatrix = [
    {
      category: 'Stranger Cam Media',
      storage: 'Browser WebRTC Peer-to-Peer',
      retention: 'Never Stored (0s)',
      deletion: 'Stream langsung antar-peramban; zero server recording pipeline.',
    },
    {
      category: 'Stranger Chat Messages',
      storage: 'Memory SignalBus (In-Memory)',
      retention: 'Ephemeral (Sesi Aktif)',
      deletion: 'Dihapus otomatis seketika saat sesi berakhir atau di-skip.',
    },
    {
      category: 'Stranger Location Confirmation',
      storage: 'SQLite location_confirmations',
      retention: '24 Jam (TTL)',
      deletion: 'Hanya menyimpan status kelayakan Semarang; koordinat GPS mentah tidak pernah disimpan.',
    },
    {
      category: 'Foto Fisik KTM (Review)',
      storage: 'Local Isolated Storage',
      retention: 'Maks. 72 Jam',
      deletion: 'Dihapus permanen seketika setelah verifikator menyelesaikan review.',
    },
    {
      category: 'Moderation Violations',
      storage: 'SQLite moderation_events',
      retention: '7 Hari (Low/Med) / Permanen (High/Crit)',
      deletion: 'Hanya menyimpan cuplikan bukti audit terpotong (<75 karakter).',
    },
    {
      category: 'Telegram Account Linkage',
      storage: 'SQLite users',
      retention: 'Selama Akun Terhubung',
      deletion: 'Dihapus seketika saat user menjalankan perintah /delete_account.',
    },
    {
      category: 'Admin Audit Logs',
      storage: 'SQLite audit_logs',
      retention: '90 Hari',
      deletion: 'Append-only audit trail untuk akuntabilitas akses admin.',
    },
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <Lock className="w-4 h-4" />
          <span>Privasi & Perlindungan Data</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-[#17151A] tracking-tight">
          Kebijakan Privasi & Matriks Retensi Data
        </h1>
        <p className="text-sm text-[#68626D]">
          Terakhir diperbarui: September 2026 • Mengacu pada prinsip Privacy-by-Design & UU Perlindungan Data Pribadi (UU PDP) RI
        </p>
      </div>

      <div className="prose prose-purple max-w-none text-sm text-[#68626D] space-y-8 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">1. Prinsip Utama: Data Minimization</h2>
          <p>
            NIVA (selanjutnya disebut &ldquo;Platform&rdquo;, &ldquo;Kami&rdquo;) beroperasi dengan prinsip <em>Privacy-by-Design</em>: kami hanya mengumpulkan data yang benar-benar esensial untuk memfasilitasi interaksi sosial yang aman dan memverifikasi kelayakan akses.
          </p>
          <p>
            Untuk fitur <strong>Stranger Chat</strong> dan <strong>Stranger Cam</strong>, kami <strong>tidak mewajibkan pendaftaran akun</strong>. Kami tidak meminta nama lengkap, email, nomor telepon, maupun kata sandi. Pengguna cukup mengonfirmasi usia 18+ dan domisili Semarang.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">2. Privasi Stranger Chat & Stranger Cam</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose pt-2">
            <div className="p-5 rounded-2xl bg-white border border-[#5B3A6D]/15 shadow-soft space-y-2">
              <div className="flex items-center gap-2 text-[#5B3A6D] font-bold text-sm">
                <Video className="w-4 h-4" />
                <span>Stranger Cam (WebRTC)</span>
              </div>
              <p className="text-xs text-[#68626D] leading-relaxed">
                Panggilan video dilakukan secara langsung peer-to-peer antar-browser. Server kami hanya menangani proses pertukaran sinyal (signaling). NIVA <strong>tidak pernah merekam audio, video, atau tangkapan layar panggilan Anda</strong>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#5B3A6D]/15 shadow-soft space-y-2">
              <div className="flex items-center gap-2 text-[#8A5A9A] font-bold text-sm">
                <MessageSquare className="w-4 h-4" />
                <span>Stranger Chat (Ephemeral)</span>
              </div>
              <p className="text-xs text-[#68626D] leading-relaxed">
                Pesan teks dikirimkan secara sementara melalui memori aktif (in-memory transport). Pesan tidak disimpan dalam database. Admin panel <strong>tidak dapat membaca percakapan stranger secara bebas</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Data Retention Matrix */}
        <section id="retention" className="space-y-4">
          <h2 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#5B3A6D]" />
            <span>3. Matriks Retensi & Jadwal Pemusnahan Data</span>
          </h2>
          <p>
            Kami tidak menyimpan data hanya &ldquo;karena mungkin nanti berguna&rdquo;. Setiap jenis data memiliki batas waktu penyimpanan yang terdefinisi secara ketat:
          </p>

          <div className="overflow-x-auto not-prose rounded-2xl border border-[#5B3A6D]/15 shadow-soft">
            <table className="w-full text-left text-xs bg-white">
              <thead className="bg-[#FAF8F6] border-b border-[#5B3A6D]/10 text-[#17151A] font-bold">
                <tr>
                  <th className="p-3.5">Kategori Data</th>
                  <th className="p-3.5">Lokasi Penyimpanan</th>
                  <th className="p-3.5">Masa Retensi</th>
                  <th className="p-3.5">Kebijakan Pemusnahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#5B3A6D]/10 text-[#68626D]">
                {retentionMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF8F6]/50 transition-colors">
                    <td className="p-3.5 font-bold text-[#17151A]">{item.category}</td>
                    <td className="p-3.5">{item.storage}</td>
                    <td className="p-3.5 font-semibold text-[#5B3A6D]">{item.retention}</td>
                    <td className="p-3.5 leading-relaxed">{item.deletion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/15">
          <h2 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2D8C6A]" />
            <span>4. Batasan Akses Admin Dashboard (Least Privilege)</span>
          </h2>
          <p>
            Admin Dashboard NIVA dirancang dengan prinsip least-privilege. Admin <strong>TIDAK</strong> memiliki akses terhadap percakapan teks stranger, video/audio mentah, maupun koordinat GPS pengguna. Data yang dapat diakses admin terbatas pada metadata verifikasi KTM, tiket bantuan, dan log audit keamanan sistem.
          </p>
        </section>

        {/* Section 5 */}
        <section id="deletion" className="space-y-3 p-6 rounded-2xl bg-white border border-[#5B3A6D]/15 shadow-soft">
          <h2 className="text-xl font-bold text-[#17151A] flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-[#C94B5B]" />
            <span>5. Hak Penghapusan Akun & Data (Right to be Forgotten)</span>
          </h2>
          <p>
            Untuk akun terdaftar pada ekosistem Telegram NIVA, Anda memiliki hak mutlak untuk menghapus data Anda kapan saja melalui perintah <code>/delete_account</code> pada bot resmi. Seluruh profil, riwayat like, dan preferensi akan dihapus permanen dari basis data aktif.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#17151A]">6. Hubungi Tim Privasi</h2>
          <p>
            Jika Anda memiliki pertanyaan mengenai tata kelola privasi kami, silakan hubungi tim keamanan dan privasi NIVA melalui kontak resmi di Telegram bot atau kanal bantuan kami.
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
          <Link href="/terms" className="hover:underline">Syarat & Ketentuan</Link>
          <Link href="/safety" className="hover:underline">Pusat Keamanan</Link>
          <Link href="/community-guidelines" className="hover:underline">Pedoman Komunitas</Link>
        </div>
      </div>
    </div>
  );
}
