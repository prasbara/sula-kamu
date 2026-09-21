'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PaymentItem {
  id: string;
  user_id: string;
  user_name: string;
  institution_name: string;
  plan_tier: string;
  amount: number;
  payment_method: string;
  proof_file_path: string;
  status: string;
  created_at: string;
  notes?: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const reason = rejectReason[id] || '';
    if (action === 'reject' && !reason.trim()) {
      alert('Mohon cantumkan alasan penolakan.');
      return;
    }

    if (!confirm(`Konfirmasi untuk ${action === 'approve' ? 'MENYETUJUI' : 'MENOLAK'} pembayaran ini?`)) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: id,
          action,
          rejection_reason: reason
        })
      });

      if (res.ok) {
        fetchPayments();
      } else {
        const err = await res.json();
        alert(`Gagal memproses pembayaran: ${err.error || 'Server error'}`);
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            💳 Antrean Verifikasi Pembayaran (FIFO)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Daftar bukti transfer langganan Premium yang menunggu tinjauan manual dan aktivasi akun.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Memuat antrean pembayaran...</div>
      ) : payments.length === 0 ? (
        <div className="py-20 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl mt-6">
          Tidak ada antrean pembayaran dengan status {statusFilter}.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {payments.map((p, index) => (
            <div
              key={p.id}
              className="bg-slate-900/60 border border-white/10 rounded-xl p-5 hover:border-white/20 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300">
                    Queue #{index + 1}
                  </span>
                  <span className="font-mono text-xs text-rose-400 font-semibold">{p.id}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      p.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : p.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="text-white font-medium flex items-center gap-2">
                  <Link href={`/app-admin/users/${p.user_id}`} className="hover:underline text-rose-300">
                    {p.user_name || 'User Tanpa Nama'}
                  </Link>
                  <span className="text-slate-500">•</span>
                  <span className="text-sm text-slate-400">{p.institution_name || 'Kampus -'}</span>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-4">
                  <span>Paket: <strong className="text-white">{p.plan_tier}</strong></span>
                  <span>Nominal: <strong className="text-emerald-400">Rp {p.amount?.toLocaleString('id-ID')}</strong></span>
                  <span>Metode: <strong className="text-slate-300">{p.payment_method}</strong></span>
                  <span>Waktu: <strong className="text-slate-400">{new Date(p.created_at).toLocaleString('id-ID')}</strong></span>
                </div>
              </div>

              {/* Actions & Proof */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
                {p.proof_file_path && (
                  <button
                    onClick={() => setSelectedProof(p.proof_file_path)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  >
                    🔍 Lihat Bukti TF
                  </button>
                )}

                {p.status === 'PENDING' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Alasan tolak..."
                      value={rejectReason[p.id] || ''}
                      onChange={(e) => setRejectReason({ ...rejectReason, [p.id]: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-slate-950 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 w-32"
                    />
                    <button
                      disabled={actionLoading === p.id}
                      onClick={() => handleAction(p.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button
                      disabled={actionLoading === p.id}
                      onClick={() => handleAction(p.id, 'approve')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition disabled:opacity-50"
                    >
                      Setujui
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Bukti TF */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold text-white">Bukti Transfer Pembayaran</h3>
            <div className="max-h-[60vh] overflow-auto rounded-lg bg-black/40 p-2 flex items-center justify-center border border-white/5">
              <img
                src={selectedProof}
                alt="Bukti Transfer"
                className="max-h-[50vh] object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <p className="text-xs text-slate-500 italic block py-4">
                File: {selectedProof}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedProof(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
