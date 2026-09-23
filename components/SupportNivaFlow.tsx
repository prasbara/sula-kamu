'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Sparkles, 
  Server, 
  Zap, 
  Video, 
  Bot, 
  ShieldCheck, 
  Database, 
  Rocket, 
  QrCode, 
  Upload, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Copy, 
  Check, 
  ArrowRight, 
  MessageSquare, 
  Building2, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface QrisConfig {
  image_data: string | null;
  account_name: string;
  instructions: string;
}

interface SubmittedSupport {
  support_code: string;
  amount: number;
  status: string;
  created_at: string;
}

interface StatusResult {
  support_code: string;
  amount: number;
  payment_method: string;
  status: string;
  donor_name: string;
  note: string | null;
  created_at: string;
  verified_at: string | null;
  rejection_reason: string | null;
}

const PRESET_AMOUNTS = [
  { value: 5000, label: 'Rp5.000' },
  { value: 10000, label: 'Rp10.000' },
  { value: 25000, label: 'Rp25.000' },
  { value: 50000, label: 'Rp50.000' },
  { value: 100000, label: 'Rp100.000' }
];

export default function SupportNivaFlow() {
  const formRef = useRef<HTMLDivElement>(null);

  // Selected Amount State
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const isCustom = selectedPreset === null;

  // Active Amount
  const activeAmount = isCustom ? (parseInt(customAmount, 10) || 0) : (selectedPreset || 0);

  // Form inputs
  const [donorName, setDonorName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [proofFileBase64, setProofFileBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // QRIS config from API
  const [qrisConfig, setQrisConfig] = useState<QrisConfig | null>(null);
  const [loadingQris, setLoadingQris] = useState<boolean>(true);

  // Post Submission State
  const [submittedContribution, setSubmittedContribution] = useState<SubmittedSupport | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // History / Status Lookup State
  const [lookupCode, setLookupCode] = useState<string>('');
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Load QRIS Config
  useEffect(() => {
    async function loadQris() {
      try {
        const res = await fetch('/api/support-niva/qris');
        if (res.ok) {
          const data = await res.json();
          if (data.qris) {
            setQrisConfig(data.qris);
          }
        }
      } catch (err) {
        console.error('Failed to load QRIS config:', err);
      } finally {
        setLoadingQris(false);
      }
    }
    loadQris();
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File bukti pembayaran harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (activeAmount < 5000) {
      setSubmitError('Nominal dukungan minimal Rp5.000.');
      return;
    }

    if (activeAmount > 50000000) {
      setSubmitError('Nominal dukungan maksimal Rp50.000.000 per transaksi.');
      return;
    }

    if (!proofFileBase64) {
      setSubmitError('Mohon sertakan bukti transfer atau screenshot pembayaran QRIS.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support-niva/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: activeAmount,
          donor_name: donorName.trim() || undefined,
          note: note.trim() || undefined,
          payment_proof: proofFileBase64
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim bukti pembayaran.');
      }

      setSubmittedContribution({
        support_code: data.contribution.support_code,
        amount: data.contribution.amount,
        status: data.contribution.status,
        created_at: data.contribution.created_at
      });

      // Clear input fields
      setProofFileBase64(null);
      setNote('');
      setDonorName('');
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi kesalahan saat memproses submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = lookupCode.trim();
    if (!code) return;

    setCheckingStatus(true);
    setStatusError(null);
    setStatusResult(null);

    try {
      const res = await fetch(`/api/support-niva/status?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Support ID tidak ditemukan.');
      }

      setStatusResult(data.contribution);
    } catch (err: any) {
      setStatusError(err.message || 'Gagal memeriksa status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-16">
      {/* 1. HERO SECTION */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-300">
          <Heart className="w-3.5 h-3.5 fill-rose-300 text-rose-300 animate-pulse" />
          <span>Support NIVA • Community Powered</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
          Help NIVA grow.
        </h1>

        <p className="text-sm sm:text-base text-[#C8BED4] leading-relaxed max-w-2xl mx-auto">
          Dukungan kamu membantu NIVA berkembang ke infrastructure yang lebih kuat, lebih stabil, dan mampu melayani lebih banyak pengguna di Semarang.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={scrollToForm}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg transition-all"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Support NIVA</span>
          </button>

          <Link
            href="/support/new?category=PARTNERSHIP"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1C1726] hover:bg-[#2B2438] text-white border border-[#2B2438] font-semibold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <MessageSquare className="w-4 h-4 text-[#C8BED4]" />
            <span>💬 Hubungi Admin</span>
          </Link>
        </div>

        <p className="text-[11px] text-[#9D93A8]">
          Dukungan bersifat sukarela tanpa paksaan. Seluruh fitur utama NIVA tetap dapat diakses publik.
        </p>
      </section>

      {/* 2. WHAT YOUR SUPPORT HELPS (TRANSPARENCY GRID) */}
      <section className="bg-[#171420] border border-[#2B2438] rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
            What Your Support Helps
          </h2>
          <p className="text-xs text-[#C8BED4] leading-relaxed">
            Dukungan digunakan untuk membantu biaya operasional dan pengembangan layanan NIVA, termasuk infrastructure, storage, monitoring, moderation, dan pengembangan fitur.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#0F0D13]/60 border border-[#2B2438] space-y-2 hover:border-purple-500/40 transition-all">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Server className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">🖥️ Infrastructure & Server</div>
            <p className="text-[11px] text-[#9D93A8] leading-relaxed">
              Migrasi kapasitas serverless ke dedicated nodes untuk menangani lonjakan koneksi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0D13]/60 border border-[#2B2438] space-y-2 hover:border-purple-500/40 transition-all">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">⚡ Performance & Reliability</div>
            <p className="text-[11px] text-[#9D93A8] leading-relaxed">
              Latensi minimal, uptime tinggi, dan kehandalan respon API di seluruh wilayah Semarang.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0D13]/60 border border-[#2B2438] space-y-2 hover:border-purple-500/40 transition-all">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Video className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">🎥 Stranger Cam</div>
            <p className="text-[11px] text-[#9D93A8] leading-relaxed">
              Infrastruktur TURN/STUN WebRTC real-time dan koneksi video peer-to-peer tanpa kendala.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0D13]/60 border border-[#2B2438] space-y-2 hover:border-purple-500/40 transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">🤖 Telegram Bot & Matchmaking</div>
            <p className="text-[11px] text-[#9D93A8] leading-relaxed">
              Kapasitas matchmaking interaktif, webhook relay bot Telegram, dan pengantaran pesan.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0D13]/60 border border-[#2B2438] space-y-2 hover:border-purple-500/40 transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">🛡️ Safety & Moderation</div>
            <p className="text-[11px] text-[#9D93A8] leading-relaxed">
              Penyaringan konten, deteksi pelecehan otomatis, dan antrean review moderator NIVA.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0D13]/60 border border-[#2B2438] space-y-2 hover:border-purple-500/40 transition-all">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">💾 Storage & Monitoring</div>
            <p className="text-[11px] text-[#9D93A8] leading-relaxed">
              Sistem pencatatan audit log, monitoring server, dan backup basis data berkala.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0D13]/60 border border-[#2B2438] space-y-2 sm:col-span-2 hover:border-purple-500/40 transition-all">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
              <Rocket className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">🚀 Future Development</div>
            <p className="text-[11px] text-[#9D93A8] leading-relaxed">
              Riset fitur baru, integrasi komunitas kampus Semarang, dan peningkatan pengalaman pengguna.
            </p>
          </div>
        </div>
      </section>

      {/* 3. SUPPORT VIA QRIS FLOW */}
      <section ref={formRef} id="support-niva" className="space-y-8 scroll-mt-24">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300">
            <QrCode className="w-3.5 h-3.5" />
            <span>Option A — Support via QRIS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dukung NIVA Melalui QRIS
          </h2>
          <p className="text-xs text-[#C8BED4] max-w-lg mx-auto">
            Pilih nominal dukungan, scan kode QRIS menggunakan e-wallet atau mobile banking apa pun, dan kirimkan bukti pembayaran.
          </p>
        </div>

        {/* Post-submission pending verification banner */}
        {submittedContribution && (
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  Bukti Pembayaran Berhasil Dikirim
                </h3>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Bukti pembayaran berhasil dikirim dan sedang menunggu verifikasi admin. Tim kami akan memverifikasi mutasi rekening Anda secara manual.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F0D13] border border-[#2B2438] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[#9D93A8]">Support ID: </span>
                <span className="font-mono font-bold text-white">{submittedContribution.support_code}</span>
              </div>
              <div>
                <span className="text-[#9D93A8]">Nominal: </span>
                <span className="font-bold text-emerald-400">{formatRupiah(submittedContribution.amount)}</span>
              </div>
              <div>
                <span className="text-[#9D93A8]">Status: </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PENDING_VERIFICATION
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(submittedContribution.support_code)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-1.5 transition-all text-[11px]"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Disalin' : 'Salin Support ID'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#9D93A8]">
              Simpan Support ID di atas untuk memeriksa status verifikasi pada form pelacak di bawah kapan saja.
            </p>
          </div>
        )}

        {/* The Donation Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#171420] border border-[#2B2438] rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* Left Column: Nominal Selection & Submission Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Nominal Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#E8B4C8] uppercase tracking-wider block">
                1. Pilih Nominal Dukungan
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {PRESET_AMOUNTS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(item.value);
                      setCustomAmount('');
                    }}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all border ${
                      selectedPreset === item.value
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md scale-[1.02]'
                        : 'bg-[#0F0D13] text-[#C8BED4] border-[#2B2438] hover:border-purple-500/50 hover:bg-[#1C1726]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreset(null);
                  }}
                  className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all border ${
                    isCustom
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md scale-[1.02]'
                      : 'bg-[#0F0D13] text-[#C8BED4] border-[#2B2438] hover:border-purple-500/50 hover:bg-[#1C1726]'
                  }`}
                >
                  Nominal lainnya
                </button>
              </div>

              {/* Custom Amount Input */}
              {isCustom && (
                <div className="pt-2 animate-fadeIn">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9D93A8]">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={5000}
                      max={50000000}
                      step={1000}
                      placeholder="Masukkan nominal (min Rp5.000)"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0F0D13] border border-purple-500/40 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <span className="text-[10px] text-[#9D93A8] block mt-1">
                    Bebas menentukan nominal sesuai kemampuan (Min Rp5.000, Max Rp50.000.000).
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Form Submission */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <label className="text-xs font-bold text-[#E8B4C8] uppercase tracking-wider block">
                2. Detail Dukungan & Bukti Transfer
              </label>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#C8BED4] mb-1">
                  Nama Anda / Inisial (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Contoh: Teman NIVA / Anonim"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C8BED4] mb-1">
                  Pesan / Catatan Semangat (Opsional)
                </label>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Pesan untuk pengembang NIVA..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C8BED4] mb-1">
                  Upload Bukti Pembayaran / Screenshot QRIS <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="w-full text-xs text-[#9D93A8] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600/30 file:text-purple-200 hover:file:bg-purple-600/50"
                />
                <p className="text-[10px] text-[#9D93A8] mt-1">
                  Format gambar JPG, PNG, atau WebP (Maksimal 5MB).
                </p>

                {proofFileBase64 && (
                  <div className="mt-2 p-2 bg-[#0F0D13] rounded-xl border border-[#2B2438] flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Bukti berhasil dipilih
                    </span>
                    <button
                      type="button"
                      onClick={() => setProofFileBase64(null)}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || activeAmount < 5000 || !proofFileBase64}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>
                    {submitting 
                      ? 'Mengirim Bukti Pembayaran...' 
                      : `Kirim Dukungan (${formatRupiah(activeAmount)})`}
                  </span>
                </button>
              </div>

              <p className="text-[10px] text-[#9D93A8] text-center">
                🔒 Pembayaran akan melalui verifikasi admin sebelum status berubah menjadi Verified.
              </p>
            </form>
          </div>

          {/* Right Column: Dynamic QRIS Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-[#0F0D13] rounded-2xl border border-[#2B2438] space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9D93A8]">
                QRIS Resmi NIVA
              </span>
              <div className="text-sm font-bold text-white">
                {qrisConfig?.account_name || 'NIVA Official'}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold">
                Nominal Terpilih: {formatRupiah(activeAmount)}
              </div>
            </div>

            {/* QR Image Box */}
            <div className="p-4 bg-white rounded-2xl shadow-xl flex flex-col items-center max-w-[240px] w-full">
              {qrisConfig?.image_data ? (
                <img
                  src={qrisConfig.image_data}
                  alt="QRIS NIVA"
                  className="w-full aspect-square object-contain rounded-lg"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center p-3 text-center">
                  <QrCode className="w-16 h-16 text-gray-700 mb-2" />
                  <span className="text-[10px] text-gray-600 font-bold">
                    Scan via QRIS e-Wallet / M-Banking
                  </span>
                  <span className="text-[9px] text-gray-500 mt-1">
                    GOPAY • OVO • DANA • BCA • MANDIRI • BRI
                  </span>
                </div>
              )}
              <div className="text-[10px] text-gray-800 font-bold mt-2 text-center">
                NMID: ID1020021192931
              </div>
            </div>

            {/* QR Instructions */}
            <div className="text-[11px] text-[#9D93A8] space-y-1.5 text-center leading-relaxed">
              <p>
                {qrisConfig?.instructions || 'Buka aplikasi e-Wallet atau Mobile Banking Anda, scan QRIS di atas, masukkan nominal yang sesuai, dan simpan tangkapan layar bukti transfer.'}
              </p>
              <p className="text-[10px] text-purple-300">
                ✅ Mendukung seluruh aplikasi pembayaran berlogo QRIS.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SUPPORT STATUS & HISTORY TRACKER */}
      <section className="bg-[#171420] border border-[#2B2438] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-300">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Cek Status Dukungan Anda
            </h3>
            <p className="text-xs text-[#9D93A8]">
              Masukkan Support ID yang Anda terima setelah mengirimkan bukti pembayaran (contoh: SUPPORT-N123456).
            </p>
          </div>
        </div>

        <form onSubmit={handleCheckStatus} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Masukkan Support ID (SUPPORT-NXXXXXX)"
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs font-mono text-white focus:outline-none focus:border-purple-400 uppercase"
            required
          />
          <button
            type="submit"
            disabled={checkingStatus || !lookupCode.trim()}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all disabled:opacity-50"
          >
            {checkingStatus ? 'Memeriksa...' : 'Cek Status'}
          </button>
        </form>

        {statusError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{statusError}</span>
          </div>
        )}

        {statusResult && (
          <div className="p-5 rounded-2xl bg-[#0F0D13] border border-[#2B2438] space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B2438] pb-3">
              <div>
                <span className="text-[10px] text-[#9D93A8] uppercase tracking-wider block">Support Code</span>
                <span className="text-sm font-mono font-bold text-white">{statusResult.support_code}</span>
              </div>

              <div>
                {statusResult.status === 'PENDING_VERIFICATION' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Menunggu Verifikasi Admin
                  </span>
                )}
                {statusResult.status === 'VERIFIED' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terverifikasi (Verified)
                  </span>
                )}
                {statusResult.status === 'REJECTED' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    Ditolak (Rejected)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-[#9D93A8] block">Nominal</span>
                <span className="font-bold text-emerald-400">{formatRupiah(statusResult.amount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#9D93A8] block">Nama Pendonor</span>
                <span className="text-white font-medium">{statusResult.donor_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#9D93A8] block">Waktu Pengajuan</span>
                <span className="text-[#C8BED4]">
                  {new Date(statusResult.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#9D93A8] block">Waktu Verifikasi</span>
                <span className="text-[#C8BED4]">
                  {statusResult.verified_at 
                    ? new Date(statusResult.verified_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '—'}
                </span>
              </div>
            </div>

            {statusResult.status === 'REJECTED' && statusResult.rejection_reason && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <span className="font-bold">Alasan Penolakan: </span>
                <span>{statusResult.rejection_reason}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. SPONSOR / PARTNERSHIP SECTION */}
      <section className="bg-gradient-to-br from-[#1C1726] to-[#14111C] border border-[#2B2438] rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-300">
              <Building2 className="w-3.5 h-3.5" />
              <span>Sponsor & Infrastructure Partnership</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Sponsor NIVA
            </h2>
            <p className="text-xs sm:text-sm text-[#C8BED4] leading-relaxed max-w-xl">
              Ingin membantu NIVA berkembang lebih jauh atau ingin mendukung infrastructure dalam skala yang lebih besar?
              <br /><br />
              Hubungi tim NIVA untuk membahas sponsorship, infrastructure support, partnership, atau bentuk dukungan lainnya.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link
              href="/support/new?category=PARTNERSHIP"
              className="px-6 py-3.5 rounded-xl bg-white text-black hover:bg-slate-200 font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <span>Talk to NIVA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/support/new?category=PARTNERSHIP"
              className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-2 border border-white/10 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>💬 Chat Admin</span>
            </Link>
          </div>
        </div>

        {/* Cross Link with Beriklan distinction */}
        <div className="pt-4 border-t border-[#2B2438] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9D93A8]">
          <div>
            📢 <strong>Membutuhkan exposure promosi untuk brand atau bisnis Anda?</strong> Kunjungi{' '}
            <Link href="/advertise" className="text-purple-300 font-semibold underline hover:text-white">
              Halaman Beriklan di NIVA
            </Link>.
          </div>
          <span className="text-[11px] text-[#9D93A8]">
            Support NIVA murni kontribusi operasional & teknologi komunitas.
          </span>
        </div>
      </section>
    </div>
  );
}
