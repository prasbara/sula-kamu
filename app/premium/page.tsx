'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  MessageSquare,
  AlertCircle,
  QrCode,
  Info,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
  durationDays: number;
  description: string;
  features: string;
}

export default function PremiumPage() {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<{ [key: string]: boolean }>({});

  // Checkout form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTelegram, setContactTelegram] = useState('');
  const [userNote, setUserNote] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Active Order State
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [qrisInfo, setQrisInfo] = useState<any>(null);
  const [ticketInfo, setTicketInfo] = useState<any>(null);

  // Payment Confirmation State
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationSuccess, setConfirmationSuccess] = useState(false);

  // Order Tracker State
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Global Alerts
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch plans from backend
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/premium/plans');
        const data = await res.json();
        if (data.success && Array.isArray(data.plans)) {
          setPlans(data.plans);
          if (data.plans.length > 0) {
            setSelectedPlan(data.plans[0]);
          }
        }
      } catch (e) {
        console.error('Failed to load plans:', e);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setErrorMessage('');
    setIsSubmittingOrder(true);

    try {
      const res = await fetch('/api/premium/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactTelegram: contactTelegram.trim() || undefined,
          userNote: userNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membuat pesanan Premium.');
      }

      setActiveOrder(data.order);
      setQrisInfo(data.qris);
      setTicketInfo(data.ticket);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file bukti pembayaran maksimal 5MB.');
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setIsConfirming(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('publicOrderId', activeOrder.publicOrderId);
      if (confirmNote) formData.append('userNote', confirmNote);
      if (ticketInfo?.id) formData.append('ticketId', ticketInfo.id);
      if (ticketInfo?.accessToken) formData.append('ticketAccessToken', ticketInfo.accessToken);
      if (proofFile) formData.append('proofFile', proofFile);

      const res = await fetch('/api/premium/confirm', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirimkan konfirmasi pembayaran.');
      }

      setConfirmationSuccess(true);
      setActiveOrder((prev: any) => ({ ...prev, status: 'UNDER_REVIEW' }));
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kendala saat konfirmasi.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingOrderId.trim()) return;
    setTrackingLoading(true);
    setTrackingError('');
    setTrackedOrder(null);

    try {
      const res = await fetch(`/api/premium/order?orderId=${encodeURIComponent(trackingOrderId.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pesanan tidak ditemukan.');
      }
      setTrackedOrder(data);
    } catch (err: any) {
      setTrackingError(err.message || 'Gagal memeriksa status pesanan.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#17151A] font-sans">
      {/* Decorative Top Accent */}
      <div className="w-full h-1.5 bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#2D8C6A]" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] font-semibold text-xs tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-[#8A5A9A]" />
            <span>NIVA Official Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#17151A] tracking-tight">
            NIVA Premium
          </h1>

          <p className="text-sm sm:text-base text-[#5B3A6D]/80 leading-relaxed font-normal">
            Dapatkan pengalaman NIVA Premium untuk fitur account dan Telegram.
          </p>

          {/* Strict Separation Notice */}
          <div className="mt-4 p-3.5 rounded-2xl bg-[#5B3A6D]/5 border border-[#5B3A6D]/15 text-xs text-[#5B3A6D] flex items-start gap-2.5 text-left max-w-xl mx-auto">
            <Info className="w-4 h-4 shrink-0 text-[#5B3A6D] mt-0.5" />
            <p className="leading-relaxed">
              <strong>Penting:</strong> Stranger Chat dan Stranger Cam tetap dapat diakses secara gratis oleh seluruh pengguna Semarang sesuai ketentuan. Premium adalah layer terpisah khusus untuk fitur akun dan ekosistem Telegram.
            </p>
          </div>

          {/* Like Limit & Verification Ecosystem Comparison */}
          <div className="mt-4 p-4 rounded-2xl bg-white border border-[#5B3A6D]/15 shadow-sm text-left max-w-xl mx-auto space-y-2.5">
            <div className="text-xs font-bold text-[#5B3A6D] flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#8A5A9A]" />
              <span>Ketentuan Limit Like & Interaksi Telegram:</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#5B3A6D]/10 space-y-1">
                <div className="text-[10px] text-[#5B3A6D]/70 font-medium">Verifikasi Foto</div>
                <div className="text-base font-extrabold text-[#17151A]">10 Like</div>
                <div className="text-[9px] text-[#5B3A6D]/60">per hari</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#5B3A6D]/10 space-y-1">
                <div className="text-[10px] text-[#2D8C6A] font-semibold">Foto + KTM</div>
                <div className="text-base font-extrabold text-[#2D8C6A]">30 Like</div>
                <div className="text-[9px] text-[#5B3A6D]/60">per hari</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#5B3A6D]/10 border border-[#5B3A6D]/30 space-y-1 ring-1 ring-[#5B3A6D]/20">
                <div className="text-[10px] text-[#5B3A6D] font-bold">NIVA Premium</div>
                <div className="text-base font-extrabold text-[#5B3A6D]">50 Like</div>
                <div className="text-[9px] text-[#5B3A6D]/70">per hari (Maksimal)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        {loadingPlans ? (
          <div className="py-16 text-center text-sm text-[#5B3A6D]/60 animate-pulse">
            Memuat paket resmi NIVA...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((p) => {
              const isSelected = selectedPlan?.id === p.id;
              const isExpanded = !!expandedDetails[p.id];

              return (
                <div
                  key={p.id}
                  className={`relative rounded-3xl p-6 sm:p-8 transition-all duration-200 border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white border-[#5B3A6D] shadow-lg ring-2 ring-[#5B3A6D]/20'
                      : 'bg-white/80 border-[#5B3A6D]/15 hover:border-[#5B3A6D]/40 shadow-sm'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm tracking-wider uppercase text-[#8A5A9A]">
                        {p.name}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#FAF7F2] text-[#5B3A6D] font-medium border border-[#5B3A6D]/15">
                        {p.durationDays} Hari
                      </span>
                    </div>

                    <div>
                      <div className="text-3xl sm:text-4xl font-black text-[#17151A] tracking-tight">
                        {p.formattedPrice}
                      </div>
                      <p className="text-xs text-[#5B3A6D]/70 mt-1">
                        Pembayaran sekali via QRIS (Manual Verification)
                      </p>
                    </div>

                    <p className="text-xs text-[#17151A]/80 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Accordion Detail Paket */}
                    <div className="pt-2 border-t border-[#5B3A6D]/10">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDetails((prev) => ({
                            ...prev,
                            [p.id]: !prev[p.id],
                          }))
                        }
                        className="text-xs font-semibold text-[#5B3A6D] flex items-center justify-between w-full hover:underline"
                      >
                        <span>[Detail Paket]</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-xl bg-[#FAF7F2] text-[11px] text-[#5B3A6D]/90 space-y-1.5 leading-relaxed">
                          <p>{p.features || 'Benefit Premium akan dikonfirmasi pada halaman paket.'}</p>
                          <p className="text-[10px] text-[#5B3A6D]/60 italic">
                            *Tidak mempengaruhi antrean atau durasi Stranger Chat / Stranger Cam.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan(p);
                        setActiveOrder(null);
                        setConfirmationSuccess(false);
                      }}
                      className={`w-full py-3.5 rounded-full font-bold text-xs tracking-wide transition-all ${
                        isSelected
                          ? 'bg-[#5B3A6D] text-white hover:bg-[#4A2F59] shadow-md'
                          : 'bg-[#FAF7F2] text-[#5B3A6D] hover:bg-[#5B3A6D]/10 border border-[#5B3A6D]/20'
                      }`}
                    >
                      {isSelected ? '✓ Paket Terpilih' : 'Upgrade Premium'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Checkout Flow Section */}
        {selectedPlan && !activeOrder && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#5B3A6D]/15 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#5B3A6D]/10">
              <div className="w-10 h-10 rounded-2xl bg-[#5B3A6D]/10 flex items-center justify-center text-[#5B3A6D]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#17151A]">
                  Langkah 1: Konfirmasi Pesanan Premium
                </h2>
                <p className="text-xs text-[#5B3A6D]/70">
                  Paket: {selectedPlan.name} ({selectedPlan.formattedPrice})
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#17151A]">Nama Pemesan (Opsional)</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nama atau inisial Anda"
                  className="w-full bg-[#FAF7F2] border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#17151A]">Alamat Email (Opsional)</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@anda.com"
                    className="w-full bg-[#FAF7F2] border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#17151A]">Username Telegram (Opsional)</label>
                  <input
                    type="text"
                    value={contactTelegram}
                    onChange={(e) => setContactTelegram(e.target.value)}
                    placeholder="@username_telegram"
                    className="w-full bg-[#FAF7F2] border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#17151A]">Catatan Pembayaran (Opsional)</label>
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Misal: Pembayaran atas nama BCA ..."
                  className="w-full bg-[#FAF7F2] border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full py-4 rounded-full font-bold text-xs tracking-wider uppercase text-white bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-95 shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span>{isSubmittingOrder ? 'Membuat Pesanan...' : 'Lanjutkan & Minta QRIS ke Admin'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Payment & QRIS via Chat Step */}
        {activeOrder && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#5B3A6D]/20 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#5B3A6D]/10 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A5A9A]">
                  Nomor Pesanan Resmi
                </span>
                <div className="font-mono text-xl sm:text-2xl font-black text-[#5B3A6D]">
                  {activeOrder.publicOrderId}
                </div>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#5B3A6D]/60">
                  Total Bayar
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#17151A]">
                  {activeOrder.formattedAmount}
                </div>
              </div>
            </div>

            {/* Admin QRIS Delivery Notice Container */}
            <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#5B3A6D]/15 flex flex-col items-center text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B3A6D]/10 text-xs font-bold text-[#5B3A6D]">
                <MessageSquare className="w-3.5 h-3.5 text-[#8A5A9A]" />
                <span>QRIS Dikirim Langsung oleh Admin via Chat</span>
              </div>

              <div className="max-w-md space-y-2">
                <h3 className="font-bold text-sm text-[#17151A]">
                  Kode Pembayaran QRIS Akan Dikirimkan Admin Melalui Tiket Dukungan
                </h3>
                <p className="text-xs text-[#5B3A6D]/80 leading-relaxed">
                  Untuk memastikan keamanan transaksi dan keaslian verifikasi, admin NIVA akan mengirimkan gambar/kode QRIS resmi secara langsung di ruang percakapan tiket Anda.
                </p>
              </div>

              {ticketInfo?.chatUrl && (
                <Link
                  href={ticketInfo.chatUrl}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#5B3A6D] text-white font-bold text-xs hover:bg-[#4A2F59] transition-all shadow-md group"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>💬 Buka Chat Admin untuk Menerima QRIS</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-[11px] leading-relaxed max-w-md text-left">
                🛡️ <strong>Catatan Keamanan:</strong> Jangan pernah membagikan password, PIN, atau kode OTP perbankan kepada siapa pun. Lakukan pembayaran hanya melalui kode QRIS resmi yang dikirimkan oleh Admin NIVA di dalam tiket resmi.
              </div>
            </div>

            {/* Confirmation & Ticket Section */}
            {!confirmationSuccess ? (
              <form onSubmit={handleConfirmPayment} className="space-y-4 pt-3 border-t border-[#5B3A6D]/10">
                <div className="font-bold text-xs text-[#17151A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2D8C6A]" />
                  <span>Sudah menerima QRIS dari Admin & melakukan transfer?</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-[#17151A] flex items-center justify-between">
                    <span>Unggah Bukti Transfer (Opsional tetapi mempercepat verifikasi)</span>
                    <span className="text-[10px] text-[#5B3A6D]/60">Maks. 5MB</span>
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="w-full text-xs text-[#5B3A6D] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#5B3A6D]/10 file:text-[#5B3A6D] hover:file:bg-[#5B3A6D]/20"
                  />
                  {proofPreview && (
                    <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border">
                      <Image src={proofPreview} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-[#17151A]">Catatan Pembayaran Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={confirmNote}
                    onChange={(e) => setConfirmNote(e.target.value)}
                    placeholder="Nama rekening pengirim atau jam transfer..."
                    className="w-full bg-[#FAF7F2] border border-[#5B3A6D]/20 rounded-xl p-3 focus:outline-none focus:border-[#5B3A6D]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isConfirming}
                  className="w-full py-4 rounded-full font-bold text-xs tracking-wider uppercase text-white bg-gradient-to-r from-[#2D8C6A] to-[#10B981] hover:opacity-95 shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isConfirming ? 'Mengirimkan Verifikasi...' : 'Saya Sudah Membayar'}</span>
                </button>
              </form>
            ) : (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Pembayaran Anda telah dikirim untuk verifikasi admin.</span>
                </div>

                <p className="text-xs leading-relaxed text-emerald-800">
                  Tim NIVA menangani ticket dan verifikasi pembayaran berdasarkan ketersediaan dan antrean prioritas. Tiket bantuan Anda telah otomatis dibuat.
                </p>

                {ticketInfo?.chatUrl && (
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <Link
                      href={ticketInfo.chatUrl}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#5B3A6D] text-white font-bold text-xs hover:bg-[#4A2F59] transition-all shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Buka Chat / Tiket Dukungan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <span className="text-[11px] text-[#5B3A6D]/70 font-mono">
                      Tiket: #{ticketInfo.id}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-[#5B3A6D]/60 text-center leading-relaxed pt-2 border-t border-[#5B3A6D]/10">
              Tim NIVA mungkin tidak selalu tersedia 24/7. Jika belum mendapat respons langsung, tiket tetap tersimpan dan dapat ditindaklanjuti ketika admin tersedia.
            </div>
          </div>
        )}

        {/* Order Status Tracker */}
        <div className="max-w-xl mx-auto pt-6 border-t border-[#5B3A6D]/15">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#5B3A6D]/15 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5B3A6D]">
              <Search className="w-4 h-4 text-[#8A5A9A]" />
              <span>Cek Status Pesanan Premium</span>
            </div>

            <form onSubmit={handleTrackOrder} className="flex gap-2 text-xs">
              <input
                type="text"
                value={trackingOrderId}
                onChange={(e) => setTrackingOrderId(e.target.value)}
                placeholder="NIVA-PREM-XXXXXX"
                className="flex-1 bg-[#FAF7F2] border border-[#5B3A6D]/20 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-[#5B3A6D]"
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-[#5B3A6D] hover:bg-[#4A2F59] transition disabled:opacity-50"
              >
                {trackingLoading ? 'Memeriksa...' : 'Cek'}
              </button>
            </form>

            {trackingError && (
              <div className="text-xs text-rose-600">{trackingError}</div>
            )}

            {trackedOrder && (
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#5B3A6D]/15 text-xs space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#5B3A6D]">
                    {trackedOrder.order.publicOrderId}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    trackedOrder.order.status === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-800'
                      : trackedOrder.order.status === 'UNDER_REVIEW'
                      ? 'bg-amber-500/20 text-amber-800'
                      : trackedOrder.order.status === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-800'
                      : 'bg-[#5B3A6D]/10 text-[#5B3A6D]'
                  }`}>
                    {trackedOrder.order.status}
                  </span>
                </div>

                <div className="text-[11px] text-[#5B3A6D]/80">
                  Paket: {trackedOrder.order.planName} ({trackedOrder.order.formattedAmount})
                </div>

                {trackedOrder.subscription && (
                  <div className="text-[11px] text-emerald-800 font-semibold pt-1 border-t border-[#5B3A6D]/10">
                    ✓ Langganan Aktif hingga: {new Date(trackedOrder.subscription.expiresAt).toLocaleDateString('id-ID')}
                  </div>
                )}

                {trackedOrder.payment?.rejectionReason && (
                  <div className="text-[11px] text-rose-700 pt-1 border-t border-rose-200">
                    Alasan: {trackedOrder.payment.rejectionReason}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
