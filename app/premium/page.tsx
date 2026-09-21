'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  UploadCloud, 
  Clock, 
  Search, 
  ArrowRight,
  Send,
  Zap,
  Heart,
  RotateCcw
} from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  badge_label: string;
}

export default function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState<'early_access' | 'early_launch'>('early_access');
  const [userIdInput, setUserIdInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'BANK_TRANSFER'>('QRIS');
  const [activePayment, setActivePayment] = useState<any>(null);
  const [proofBase64, setProofBase64] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchPaymentId, setSearchPaymentId] = useState('');
  const [searchedPayment, setSearchedPayment] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const plans: Plan[] = [
    {
      id: 'early_access',
      name: 'Early Access',
      price: 5000,
      duration_days: 30,
      badge_label: 'EARLY ACCESS',
    },
    {
      id: 'early_launch',
      name: 'Early Launch',
      price: 8000,
      duration_days: 30,
      badge_label: 'EARLY LAUNCH',
    },
  ];

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!userIdInput.trim()) {
      setErrorMessage('Silakan masukkan ID Pengguna atau Username Telegram Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdInput.trim(),
          planId: selectedPlan,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat tagihan.');

      setActivePayment(data.payment);
      setSuccessMessage(`Tagihan #${data.payment.id} berhasil dibuat. Silakan lakukan pembayaran.`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 5MB.');
      return;
    }

    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayment || !proofBase64) {
      setErrorMessage('Pilih file bukti pembayaran (struk/screenshot) terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/payments/${activePayment.id}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: proofBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah bukti.');

      setActivePayment({
        ...activePayment,
        status: 'UNDER_REVIEW',
        proof_submitted_at: new Date().toISOString(),
      });
      setSuccessMessage('Bukti pembayaran berhasil diunggah! Permintaan Anda telah masuk ke antrean FIFO admin.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPaymentId.trim()) return;

    try {
      const res = await fetch(`/api/payments/${encodeURIComponent(searchPaymentId.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setSearchedPayment(data.payment);
      } else {
        setSearchedPayment(null);
        alert(data.error || 'Tagihan tidak ditemukan.');
      }
    } catch {
      alert('Kendala koneksi saat melacak tagihan.');
    }
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16">
      {/* Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-[#8A5A9A]" />
          <span>NIVA Premium Membership</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#17151A] tracking-tight">
          Unlock More Ways to Connect.
        </h1>
        <p className="text-base sm:text-lg text-[#68626D]">
          Tingkatkan pengalaman pertemanan Anda di Semarang dengan fitur eksplorasi ekstra, boost profil, dan kuota interaksi prioritas.
        </p>
      </div>

      {/* Feature Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan Card */}
        <div className="bg-white p-8 rounded-3xl border border-[#5B3A6D]/10 shadow-soft space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#68626D]">Paket Standar</span>
            <h2 className="text-2xl font-display font-bold text-[#17151A]">NIVA Free</h2>
            <p className="text-3xl font-display font-extrabold text-[#17151A]">Rp0 <span className="text-sm font-normal text-[#68626D]">/ selamanya</span></p>
            <p className="text-xs text-[#68626D]">Akses dasar untuk seluruh mahasiswa terdaftar di Semarang.</p>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#68626D] pt-2 border-t border-[#5B3A6D]/10">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" /> 10 like / hari (Pengguna belum terverifikasi)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" /> 50 like / hari (Setelah Verifikasi Foto/KTM)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" /> Eksplorasi kampus dan mutual matching
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" /> Obrolan internal aman via bot
              </li>
            </ul>
          </div>
          <a
            href={SITE_CONFIG.telegramBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[#17151A] bg-[#FAF8F6] hover:bg-[#5B3A6D]/10 border border-[#5B3A6D]/15 transition-all"
          >
            <span>Gunakan Versi Free di Telegram</span>
            <Send className="w-4 h-4" />
          </a>
        </div>

        {/* Premium Plan Card */}
        <div className="bg-gradient-to-br from-[#5B3A6D] via-[#734882] to-[#8A5A9A] text-white p-8 rounded-3xl shadow-hover space-y-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wider">
            RECOMMENDED
          </div>
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E8B4C8]">Paket Eksklusif</span>
            <h2 className="text-2xl font-display font-bold">NIVA Premium</h2>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-display font-extrabold">Rp5.000</p>
              <span className="text-sm text-white/80">/ 1 bulan (Early Access)</span>
            </div>
            <p className="text-xs text-white/80">Solusi terbaik bagi mahasiswa aktif yang ingin memperluas circle secara optimal.</p>
            <ul className="space-y-2.5 text-xs sm:text-sm text-white/90 pt-2 border-t border-white/20">
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#E8B4C8]" /> 100 like / hari prioritas
              </li>
              <li className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E8B4C8]" /> Extended campus discovery & filter minat
              </li>
              <li className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#E8B4C8]" /> Rewind: kesempatan meninjau kembali profil yang terlewat
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8B4C8]" /> Lencana Premium eksklusif pada kartu profil
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#E8B4C8]" /> Jalur antrean verifikasi prioritas
              </li>
            </ul>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('payment-form-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-[#17151A] bg-white hover:bg-[#FAF8F6] shadow-md transition-all"
          >
            <span>Pilih Paket & Bayar Sekarang</span>
            <ArrowRight className="w-4 h-4 text-[#5B3A6D]" />
          </button>
        </div>
      </div>

      {/* Payment Workflow Form */}
      <div id="payment-form-section" className="bg-white p-8 sm:p-12 rounded-3xl border border-[#5B3A6D]/15 shadow-soft space-y-8">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#17151A]">
            Formulir Pembelian Langganan NIVA Premium
          </h2>
          <p className="text-xs sm:text-sm text-[#68626D]">
            Proses manual yang transparan: buat tagihan, lakukan transfer/QRIS, unggah bukti pembayaran, dan admin kami akan memverifikasi sesuai antrean FIFO.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        {!activePayment ? (
          <form onSubmit={handleCreatePayment} className="space-y-6">
            {/* Step 1: Select Plan */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17151A]">
                1. Pilih Paket Langganan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id as any)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      selectedPlan === p.id
                        ? 'border-[#5B3A6D] bg-[#5B3A6D]/5 shadow-sm'
                        : 'border-[#5B3A6D]/15 hover:border-[#5B3A6D]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#17151A]">{p.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-[10px] font-bold">
                        {p.badge_label}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-[#5B3A6D]">
                      Rp{p.price.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-[#68626D] mt-1">Durasi: {p.duration_days} hari (1 bulan)</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: User Identification */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17151A]">
                2. Identitas Akun NIVA Anda
              </label>
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="Masukkan User ID NIVA atau Username Telegram Anda (contoh: @username / user-uuid)"
                className="w-full px-4 py-3 rounded-xl border border-[#5B3A6D]/20 focus:outline-none focus:ring-2 focus:ring-[#5B3A6D] text-sm"
                required
              />
              <p className="text-[11px] text-[#68626D]">
                *Tip: Anda dapat menemukan ID akun Anda dengan mengetik <code>/profile</code> di bot Telegram NIVA.
              </p>
            </div>

            {/* Step 3: Payment Method */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17151A]">
                3. Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`p-4 rounded-xl border text-center font-semibold text-xs sm:text-sm transition-all ${
                    paymentMethod === 'QRIS'
                      ? 'border-[#5B3A6D] bg-[#5B3A6D] text-white'
                      : 'border-[#5B3A6D]/20 text-[#17151A]'
                  }`}
                >
                  QRIS (Gopay/OVO/Dana/BCA/ShopeePay)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-4 rounded-xl border text-center font-semibold text-xs sm:text-sm transition-all ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'border-[#5B3A6D] bg-[#5B3A6D] text-white'
                      : 'border-[#5B3A6D]/20 text-[#17151A]'
                  }`}
                >
                  Transfer Bank (BCA / Mandiri / BRI)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] shadow-md hover:opacity-95 transition-all text-sm sm:text-base disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Lanjutkan ke Pembayaran'}
            </button>
          </form>
        ) : (
          /* Payment Instructions & Proof Upload */
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/15 space-y-4">
              <div className="flex items-center justify-between border-b border-[#5B3A6D]/10 pb-3">
                <span className="font-bold text-sm text-[#17151A]">Nomor Tagihan:</span>
                <span className="font-mono font-bold text-base text-[#5B3A6D]">{activePayment.id}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#5B3A6D]/10 pb-3 text-xs sm:text-sm">
                <span>Total Nominal yang Harus Dibayar:</span>
                <strong className="text-xl text-[#17151A]">Rp{Number(activePayment.amount).toLocaleString('id-ID')}</strong>
              </div>
              <div className="space-y-2 text-xs text-[#68626D]">
                <p><strong>Instruksi Pembayaran:</strong></p>
                <p>1. Transfer sesuai nominal tepat ke Rekening Resmi NIVA: <strong>BCA 1234-5678-90</strong> (a.n. NIVA Platform) atau scan kode QRIS resmi.</p>
                <p>2. Simpan struk bukti transfer atau screenshot bukti transaksi yang jelas.</p>
                <p>3. Unggah bukti pembayaran melalui form di bawah ini.</p>
              </div>
            </div>

            {activePayment.status === 'PENDING' ? (
              <form onSubmit={handleUploadProof} className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#17151A]">
                  Unggah Bukti Pembayaran (Screenshot / Foto Struk)
                </label>
                <div className="border-2 border-dashed border-[#5B3A6D]/30 rounded-2xl p-6 text-center hover:border-[#5B3A6D] transition-colors">
                  <UploadCloud className="w-10 h-10 text-[#5B3A6D] mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-[#68626D] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#5B3A6D]/10 file:text-[#5B3A6D] hover:file:bg-[#5B3A6D]/20 cursor-pointer"
                    required
                  />
                  {proofFileName && <p className="text-xs font-semibold text-[#2D8C6A] mt-2">File dipilih: {proofFileName}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-full font-bold text-white bg-gradient-to-r from-[#2D8C6A] to-[#34d399] shadow-md hover:opacity-95 transition-all text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Mengunggah...' : 'Kirim Bukti Pembayaran'}
                </button>
              </form>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                <Clock className="w-8 h-8 text-amber-600 mx-auto" />
                <h3 className="font-bold text-base text-amber-900">
                  Status: {activePayment.status} (Dalam Antrean Verifikasi FIFO)
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
                  Bukti pembayaran Anda telah tercatat dengan aman. Tim verifikator admin kami akan memeriksa bukti transfer Anda sesuai urutan antrean kedatangan (First-In, First-Out). Langganan Premium akan otomatis aktif setelah disetujui.
                </p>
                <div className="pt-2">
                  <span className="font-mono text-xs font-semibold px-3 py-1 rounded-full bg-white text-amber-900 border">
                    ID: {activePayment.id}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Track Existing Payment */}
      <div className="p-8 rounded-3xl bg-[#FAF8F6] border border-[#5B3A6D]/15 space-y-6">
        <h3 className="text-xl font-display font-bold text-[#17151A] flex items-center gap-2">
          <Search className="w-5 h-5 text-[#5B3A6D]" />
          <span>Lacak Status Tagihan Pembayaran Anda</span>
        </h3>
        <form onSubmit={handleSearchPayment} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchPaymentId}
            onChange={(e) => setSearchPaymentId(e.target.value)}
            placeholder="Masukkan Payment ID (contoh: PAY-NIVA-000124)"
            className="flex-1 px-4 py-3 rounded-xl border border-[#5B3A6D]/20 focus:outline-none focus:ring-2 focus:ring-[#5B3A6D] text-sm bg-white"
            required
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-semibold text-white bg-[#5B3A6D] hover:bg-[#4A2F59] transition-all text-sm"
          >
            Cek Status
          </button>
        </form>

        {searchedPayment && (
          <div className="p-5 rounded-2xl bg-white border border-[#5B3A6D]/15 space-y-2 text-xs sm:text-sm">
            <p><strong>Payment ID:</strong> {searchedPayment.id}</p>
            <p><strong>Paket:</strong> {searchedPayment.plan_name} (Rp{Number(searchedPayment.amount).toLocaleString('id-ID')})</p>
            <p><strong>Status:</strong> <span className="font-bold text-[#5B3A6D]">{searchedPayment.status}</span></p>
            <p><strong>Dibuat:</strong> {searchedPayment.created_at}</p>
            {searchedPayment.review_notes && <p><strong>Catatan Reviewer:</strong> {searchedPayment.review_notes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
