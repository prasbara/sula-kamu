'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Star, 
  Check, 
  X, 
  MessageSquare, 
  ShieldCheck, 
  AlertCircle, 
  Send, 
  RefreshCw 
} from 'lucide-react';

interface ReviewQueueItem {
  id: string;
  user_id: string;
  display_name: string;
  rating: number;
  review_text: string;
  recommend: number;
  improvement_category: string | null;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  admin_response?: string | null;
  admin_response_at?: string | null;
  created_at: string;
  study_field?: string;
  institution_short_name?: string;
  verification_status?: string;
}

export default function AdminReviewsPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Response inputs
  const [rejectReasons, setRejectReasons] = useState<{ [key: string]: string }>({});
  const [adminResponses, setAdminResponses] = useState<{ [key: string]: string }>({});
  const [openResponseId, setOpenResponseId] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const handleAction = async (reviewId: string, action: 'APPROVE' | 'REJECT' | 'RESPOND' | 'HIDE' | 'FLAG') => {
    const reason = rejectReasons[reviewId] || '';
    const adminResponse = adminResponses[reviewId] || '';

    if (action === 'REJECT' && !reason.trim()) {
      alert('Mohon masukkan alasan penolakan ulasan.');
      return;
    }

    if (action === 'RESPOND' && !adminResponse.trim()) {
      alert('Tanggapan resmi tim NIVA tidak boleh kosong.');
      return;
    }

    setActionLoading(reviewId);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: reviewId,
          action,
          reason,
          admin_response: adminResponse,
        }),
      });

      if (res.ok) {
        setOpenResponseId(null);
        fetchQueue();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal memproses ulasan.');
      }
    } catch {
      alert('Kendala jaringan saat memproses.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            ⭐ Moderasi & Tata Kelola Ulasan Mahasiswa
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tinjau ulasan nyata dari pengguna. Admin dapat menyetujui, menolak, menyembunyikan (hide), atau menandai ulang (flag) ulasan secara transparan dengan audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'HIDDEN', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {st === 'PENDING_REVIEW' ? 'PENDING' : st}
            </button>
          ))}
          <button
            onClick={fetchQueue}
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white border border-white/5"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Review Queue List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Memuat antrean moderasi ulasan...</div>
      ) : queue.length === 0 ? (
        <div className="py-20 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
          Tidak ada ulasan dalam status {statusFilter}.
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/60 border border-white/10 rounded-xl p-5 hover:border-white/20 transition space-y-4 shadow-lg"
            >
              {/* Header: User & Rating */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-xs font-bold text-white">{item.rating}/5</span>
                  </div>

                  <span className="text-slate-500">•</span>

                  <Link href={`/app-admin/users/${item.user_id}`} className="text-xs font-semibold text-rose-300 hover:underline">
                    {item.display_name}
                  </Link>
                  <span className="text-xs text-slate-400">
                    ({item.institution_short_name || 'Kampus -'})
                  </span>

                  {item.improvement_category && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                      {item.improvement_category}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                      item.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : item.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(item.created_at).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3.5 rounded-lg border border-white/5">
                "{item.review_text}"
              </div>

              {/* Admin official response if any */}
              {item.admin_response && (
                <div className="bg-rose-950/20 border-l-2 border-rose-500 p-3 rounded-r-lg text-xs space-y-1">
                  <span className="font-semibold text-rose-300 text-[11px] block">
                    Tanggapan Resmi Tim NIVA ({new Date(item.admin_response_at || '').toLocaleDateString('id-ID')}):
                  </span>
                  <p className="text-slate-300">{item.admin_response}</p>
                </div>
              )}

              {/* Rejection reason if any */}
              {item.rejection_reason && (
                <div className="text-[11px] text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <strong>Alasan Penolakan:</strong> {item.rejection_reason}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpenResponseId(openResponseId === item.id ? null : item.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {item.admin_response ? 'Ubah Tanggapan Resmi' : 'Beri Tanggapan Resmi'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {item.status !== 'REJECTED' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Alasan tolak..."
                        value={rejectReasons[item.id] || ''}
                        onChange={(e) => setRejectReasons({ ...rejectReasons, [item.id]: e.target.value })}
                        className="px-2.5 py-1 text-xs bg-slate-950 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 w-36"
                      />
                      <button
                        disabled={actionLoading === item.id}
                        onClick={() => handleAction(item.id, 'REJECT')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition disabled:opacity-50 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Tolak
                      </button>
                    </div>
                  )}

                  {item.status !== 'APPROVED' && (
                    <button
                      disabled={actionLoading === item.id}
                      onClick={() => handleAction(item.id, 'APPROVE')}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Setujui Ulasan
                    </button>
                  )}
                </div>
              </div>

              {/* Form Input Tanggapan Resmi */}
              {openResponseId === item.id && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-2 mt-2">
                  <span className="text-[11px] font-semibold text-rose-300 block">
                    Tuliskan Tanggapan Resmi NIVA Team (Akan Tampil Publik):
                  </span>
                  <textarea
                    rows={2}
                    value={adminResponses[item.id] !== undefined ? adminResponses[item.id] : (item.admin_response || '')}
                    onChange={(e) => setAdminResponses({ ...adminResponses, [item.id]: e.target.value })}
                    placeholder="Contoh: Terima kasih atas masukannya. Kami sedang menyempurnakan fitur ini..."
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setOpenResponseId(null)}
                      className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                    >
                      Tutup
                    </button>
                    <button
                      disabled={actionLoading === item.id}
                      onClick={() => handleAction(item.id, 'RESPOND')}
                      className="px-3.5 py-1 rounded bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-50"
                    >
                      Publikasikan Tanggapan
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
