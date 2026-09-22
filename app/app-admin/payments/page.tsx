'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  ExternalLink,
  RefreshCw,
  Eye,
  AlertCircle,
  ShieldCheck,
  Search
} from 'lucide-react';

interface PremiumOrderItem {
  publicOrderId: string;
  userId: string;
  amount: number;
  formattedAmount: string;
  planName: string;
  durationDays: number;
  orderStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  paymentStatus: string;
  paymentMethod: string;
  paidAt: string | null;
  proofData: string | null;
  userNote: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<PremiumOrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection modal
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/premium/verify?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleApprove = async (publicOrderId: string) => {
    if (!confirm(`Konfirmasi untuk MENYETUJUI pesanan ${publicOrderId}? Langganan Premium akan otomatis diaktifkan di server.`)) {
      return;
    }

    setActionLoading(publicOrderId);
    try {
      const res = await fetch('/api/admin/premium/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          publicOrderId,
          adminNotes: 'Pembayaran QRIS diverifikasi dan disetujui.',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchOrders();
      } else {
        alert(data.error || 'Gagal menyetujui pembayaran.');
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectOrderId || !rejectReason.trim()) {
      alert('Alasan penolakan wajib dicantumkan.');
      return;
    }

    setActionLoading(rejectOrderId);
    try {
      const res = await fetch('/api/admin/premium/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          publicOrderId: rejectOrderId,
          rejectionReason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRejectOrderId(null);
        setRejectReason('');
        fetchOrders();
      } else {
        alert(data.error || 'Gagal menolak pembayaran.');
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.publicOrderId.toLowerCase().includes(q) ||
      o.planName.toLowerCase().includes(q) ||
      (o.userNote && o.userNote.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#2B2438] gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-[#E8B4C8]" />
            <span>Verifikasi Pembayaran Premium QRIS</span>
          </h1>
          <p className="text-xs text-[#9D93A8] mt-1">
            Antrean verifikasi manual pesanan NIVA Premium (Rp5.000 & Rp8.000). Aktivasi diproses di sisi server.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrders()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
          {['ALL', 'UNDER_REVIEW', 'PENDING', 'VERIFIED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#5B3A6D] text-white'
                  : 'bg-white/5 text-[#C8BED4] hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Order ID..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#5B3A6D]"
          />
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#9D93A8] animate-pulse">
            Memuat antrean verifikasi pembayaran...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#9D93A8]">
            Tidak ada pesanan pada filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/30 border-b border-[#2B2438] text-[#9D93A8] uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order ID & Waktu</th>
                  <th className="py-3 px-4">Paket & Nominal</th>
                  <th className="py-3 px-4">Bukti & Catatan</th>
                  <th className="py-3 px-4">Status Verifikasi</th>
                  <th className="py-3 px-4 text-right">Aksi & Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B2438]">
                {filteredOrders.map((ord) => {
                  return (
                    <tr key={ord.publicOrderId} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white text-xs">
                          {ord.publicOrderId}
                        </div>
                        <div className="text-[10px] text-[#9D93A8] mt-0.5">
                          {new Date(ord.createdAt).toLocaleString('id-ID')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{ord.planName}</div>
                        <div className="text-emerald-400 font-bold mt-0.5">
                          {ord.formattedAmount}
                        </div>
                        <div className="text-[10px] text-[#9D93A8]">
                          {ord.durationDays} hari akses
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {ord.proofData ? (
                            <button
                              type="button"
                              onClick={() => setSelectedProof(ord.proofData)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5B3A6D]/30 border border-[#5B3A6D]/50 text-[#E8B4C8] hover:bg-[#5B3A6D]/50 font-semibold text-[11px] transition"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat Bukti QRIS</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-300/80 italic">
                              Belum ada unggahan gambar
                            </span>
                          )}

                          {ord.userNote && (
                            <div className="text-[10px] text-[#C8BED4] max-w-xs truncate" title={ord.userNote}>
                              Catatan: {ord.userNote}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.orderStatus === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : ord.orderStatus === 'UNDER_REVIEW'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : ord.orderStatus === 'REJECTED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {ord.orderStatus}
                        </span>

                        {ord.rejectionReason && (
                          <div className="text-[10px] text-rose-300/80 mt-1 max-w-xs">
                            Alasan: {ord.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Chat directly with user via Support Ticket */}
                          <Link
                            href={`/app-admin/support`}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 transition inline-flex items-center gap-1 text-[11px]"
                            title="Chat / Buka Tiket Pengguna"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#E8B4C8]" />
                            <span className="hidden sm:inline">Tiket Chat</span>
                          </Link>

                          {ord.orderStatus !== 'VERIFIED' && (
                            <button
                              type="button"
                              disabled={actionLoading === ord.publicOrderId}
                              onClick={() => handleApprove(ord.publicOrderId)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-sm disabled:opacity-50 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Setujui</span>
                            </button>
                          )}

                          {ord.orderStatus !== 'REJECTED' && (
                            <button
                              type="button"
                              disabled={actionLoading === ord.publicOrderId}
                              onClick={() => {
                                setRejectOrderId(ord.publicOrderId);
                                setRejectReason('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/30 font-bold text-[11px] transition disabled:opacity-50 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Tolak</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Preview Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171420] border border-[#2B2438] rounded-2xl max-w-lg w-full p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2B2438]">
              <span className="font-bold text-sm text-white">Bukti Pembayaran QRIS</span>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="text-white/60 hover:text-white text-xs font-semibold"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
              <Image
                src={selectedProof}
                alt="Bukti Transfer"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleReject}
            className="bg-[#171420] border border-[#2B2438] rounded-2xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#2B2438]">
              <span className="font-bold text-sm text-rose-400">
                Tolak Pembayaran — {rejectOrderId}
              </span>
              <button
                type="button"
                onClick={() => setRejectOrderId(null)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-[#9D93A8] leading-relaxed">
              Cantumkan alasan penolakan yang jelas. Alasan ini akan otomatis dikirimkan ke pengguna melalui balasan tiket dukungan.
            </p>

            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Nominal transfer kurang dari Rp5.000 / Bukti transfer tidak terbaca..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectOrderId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading === rejectOrderId}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
              >
                {actionLoading === rejectOrderId ? 'Memproses...' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
