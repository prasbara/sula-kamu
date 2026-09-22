'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Ticket, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  ArrowRight,
  Lock
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const CATEGORIES = [
  { id: 'GENERAL', label: 'Umum — Pertanyaan & Informasi Penggunaan' },
  { id: 'SAFETY_REPORT', label: '🛡️ Laporan Keamanan — Pelecehan, Penipuan, Ancaman' },
  { id: 'TECHNICAL', label: '🔧 Kendala Teknis — WebRTC, Izin Lokasi, Kamera' },
  { id: 'PAYMENT', label: '💳 Pembayaran & Langganan Premium' },
  { id: 'ADVERTISING', label: '📢 Periklanan & Promosi Brand' },
  { id: 'PARTNERSHIP', label: '🤝 Kemitraan Komunitas & Kampus' },
  { id: 'STUDENT_VERIFICATION', label: '🎓 Verifikasi Mahasiswa & Masalah KTM' },
  { id: 'DATA_DELETION', label: '🔒 Permohonan Penghapusan Data (UU PDP)' },
  { id: 'PRIVACY', label: '📄 Pertanyaan Privasi & Keamanan Data' },
  { id: 'ACCOUNT', label: '👤 Pengaturan Akun & Akses' },
  { id: 'OTHER', label: 'Lainnya' },
];

export default function NewSupportTicketPage() {
  const searchParams = useSearchParams();
  const prefillCategory = searchParams.get('category') || 'GENERAL';

  const [category, setCategory] = useState(prefillCategory);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ ticketId: string; accessToken: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (category === 'SAFETY_REPORT') {
      setPriority('HIGH');
    } else if (category === 'PAYMENT') {
      setPriority('HIGH');
    } else {
      setPriority('NORMAL');
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          subject: subject.trim(),
          message: message.trim(),
          priority,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessData({
          ticketId: data.ticket.id,
          accessToken: data.accessToken,
        });
      } else {
        setError(data.error || 'Gagal membuat tiket bantuan.');
      }
    } catch (err) {
      setError('Terjadi kendala jaringan saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!successData) return;
    navigator.clipboard.writeText(successData.accessToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0F0D13] text-[#F3EDF7] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#9D93A8]">
          <Link href="/support" className="hover:text-white transition-colors">
            Pusat Bantuan
          </Link>
          <span>/</span>
          <span className="text-white">Buat Tiket Bantuan</span>
        </div>

        {!successData ? (
          <div className="bg-[#171420] border border-[#2B2438] rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/30 border border-[#5B3A6D]/60 text-xs font-semibold text-[#E8B4C8]">
                <Ticket className="w-3.5 h-3.5" />
                <span>Formulir Tiket Resmi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                Ajukan Tiket Bantuan NIVA
              </h1>
              <p className="text-xs sm:text-sm text-[#C8BED4] leading-relaxed">
                Pesan Anda akan masuk ke antrean FIFO admin NIVA. Tiket Anda terlindungi secara kriptografis dan dapat dipantau setiap saat.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">
                  Kategori Tiket <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white focus:outline-none focus:border-[#8A5A9A]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#171420] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Identity (Optional / Display) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">
                    Nama / Panggilan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Contoh: Mahasiswa Tembalang"
                    className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white block">
                    Email Kontak (Opsional, untuk notifikasi)
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A]"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">
                  Judul Tiket <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ringkasan kendala atau permohonan Anda..."
                  className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A]"
                />
              </div>

              {/* Message Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white block">
                  Rincian Pesan & Penjelasan <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Jelaskan kendala, kronologi, atau detail permohonan Anda secara rinci. Jangan sertakan password atau PIN rekening Anda."
                  className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A]"
                />
              </div>

              {/* Privacy Microcopy */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-[11px] text-[#9D93A8] space-y-1">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Keamanan & Privasi Data Tiket</span>
                </div>
                <p>
                  Data yang Anda berikan diproses semata-mata untuk penyelesaian tiket sesuai prinsip UU PDP No. 27 Tahun 2022. Ruang percakapan tiket hanya dapat dibuka oleh pemegang token akses resmi Anda dan tim admin NIVA.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 transition-all shadow-xl"
              >
                {loading ? (
                  <span>Mengirim Tiket ke Sistem...</span>
                ) : (
                  <>
                    <span>Kirim Tiket Bantuan</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="bg-[#171420] border border-[#2B2438] rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Tiket Bantuan Berhasil Dibuat!
              </h2>
              <p className="text-xs text-[#C8BED4] max-w-md mx-auto">
                Tiket Anda telah masuk ke antrean sistem. Harap simpan ID Tiket dan Token Akses di bawah untuk memantau balasan dari tim NIVA.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0F0D13] border border-[#2B2438] text-left space-y-4 max-w-lg mx-auto">
              <div>
                <div className="text-[10px] text-[#9D93A8] font-mono uppercase tracking-wider">ID Tiket:</div>
                <div className="text-xl font-bold font-mono text-white tracking-wider">
                  {successData.ticketId}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#9D93A8] font-mono uppercase tracking-wider flex items-center justify-between">
                  <span>Token Akses Rahasia:</span>
                  <button
                    onClick={handleCopyToken}
                    className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 font-sans"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'Tersalin!' : 'Salin Token'}</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-amber-300 break-all bg-black/40 p-2.5 rounded-lg border border-white/5 mt-1 select-all">
                  {successData.accessToken}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/support/ticket/${encodeURIComponent(successData.ticketId)}?token=${encodeURIComponent(successData.accessToken)}`}
                className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white font-bold text-xs hover:opacity-95 transition-all shadow-xl"
              >
                <span>Buka Ruang Obrolan Tiket Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
