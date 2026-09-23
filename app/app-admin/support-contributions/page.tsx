'use client';

import { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  DollarSign, 
  QrCode, 
  Upload, 
  AlertCircle,
  FileText,
  Search,
  Check,
  X
} from 'lucide-react';

interface SupportContribution {
  id: string;
  support_code: string;
  user_id: string | null;
  amount: number;
  payment_method: string;
  payment_proof: string | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  donor_name: string | null;
  note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface SupportStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  total_verified_amount: number;
}

interface QrisConfig {
  image_data: string | null;
  account_name: string;
  instructions: string;
  updated_at: string;
}

export default function AdminSupportContributionsPage() {
  const [contributions, setContributions] = useState<SupportContribution[]>([]);
  const [stats, setStats] = useState<SupportStats>({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    total_verified_amount: 0
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Evidence Modal
  const [viewingContribution, setViewingContribution] = useState<SupportContribution | null>(null);

  // Rejection Dialog
  const [rejectingItem, setRejectingItem] = useState<SupportContribution | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // QRIS Settings Tab/Modal
  const [showQrisSettings, setShowQrisSettings] = useState<boolean>(false);
  const [qrisConfig, setQrisConfig] = useState<QrisConfig | null>(null);
  const [qrisAccountName, setQrisAccountName] = useState<string>('');
  const [qrisInstructions, setQrisInstructions] = useState<string>('');
  const [qrisImageBase64, setQrisImageBase64] = useState<string | null>(null);
  const [savingQris, setSavingQris] = useState<boolean>(false);
  const [qrisSuccessMsg, setQrisSuccessMsg] = useState<string | null>(null);

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' 
        ? '/api/admin/support-contributions' 
        : `/api/admin/support-contributions?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setContributions(data.contributions || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching contributions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQrisConfig = async () => {
    try {
      const res = await fetch('/api/admin/support-contributions/qris');
      if (res.ok) {
        const data = await res.json();
        if (data.qris) {
          setQrisConfig(data.qris);
          setQrisAccountName(data.qris.account_name || 'NIVA Official');
          setQrisInstructions(data.qris.instructions || '');
          setQrisImageBase64(data.qris.image_data || null);
        }
      }
    } catch (err) {
      console.error('Error fetching QRIS config:', err);
    }
  };

  useEffect(() => {
    fetchContributions();
    fetchQrisConfig();
  }, [statusFilter]);

  const handleVerify = async (id: string) => {
    if (!confirm('Verifikasi dukungan ini sebagai pembayaran valid?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/support-contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY',
          contributionId: id
        })
      });
      const data = await res.json();
      if (data.success) {
        if (viewingContribution?.id === id) {
          setViewingContribution(null);
        }
        await fetchContributions();
      } else {
        alert(data.error || 'Gagal memverifikasi');
      }
    } catch (err: any) {
      alert(err.message || 'Kendala jaringan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      alert('Alasan penolakan wajib diisi');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/support-contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          contributionId: rejectingItem.id,
          reason: rejectionReason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setRejectingItem(null);
        setRejectionReason('');
        if (viewingContribution?.id === rejectingItem.id) {
          setViewingContribution(null);
        }
        await fetchContributions();
      } else {
        alert(data.error || 'Gagal menolak dukungan');
      }
    } catch (err: any) {
      alert(err.message || 'Kendala jaringan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran file QRIS maksimal 4MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setQrisImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQris = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQris(true);
    setQrisSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/support-contributions/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: qrisAccountName,
          instructions: qrisInstructions,
          image_data: qrisImageBase64
        })
      });
      const data = await res.json();
      if (data.success) {
        setQrisConfig(data.qris);
        setQrisSuccessMsg('Konfigurasi QRIS berhasil diperbarui tanpa deploy ulang.');
        setTimeout(() => setQrisSuccessMsg(null), 4000);
      } else {
        alert(data.error || 'Gagal menyimpan QRIS');
      }
    } catch (err: any) {
      alert(err.message || 'Kendala jaringan');
    } finally {
      setSavingQris(false);
    }
  };

  const filteredContributions = contributions.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.support_code.toLowerCase().includes(query) ||
      (c.donor_name && c.donor_name.toLowerCase().includes(query)) ||
      (c.note && c.note.toLowerCase().includes(query))
    );
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              NIVA Support Management
            </h1>
          </div>
          <p className="text-xs text-[#9D93A8] mt-1">
            Verifikasi antrean dukungan sukarela pengguna untuk infrastruktur, serverless migration, dan kehandalan platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrisSettings(!showQrisSettings)}
            className="px-3.5 py-2 rounded-xl bg-[#2B2438] hover:bg-[#3B324D] text-xs font-semibold text-white flex items-center gap-2 border border-white/10 transition-all"
          >
            <QrCode className="w-3.5 h-3.5 text-purple-300" />
            <span>{showQrisSettings ? 'Tutup Pengaturan QRIS' : 'Kelola QRIS'}</span>
          </button>

          <button
            onClick={() => fetchContributions()}
            disabled={loading}
            className="p-2 rounded-xl bg-[#1C1726] hover:bg-[#2B2438] text-white border border-[#2B2438] transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* QRIS Management Section */}
      {showQrisSettings && (
        <div className="bg-[#171420] border border-purple-500/30 rounded-2xl p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#2B2438] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <QrCode className="w-4 h-4 text-purple-400" />
              <span>Konfigurasi QRIS Resmi NIVA</span>
            </div>
            <span className="text-[10px] text-[#9D93A8]">
              Tersimpan di Database (system_settings) — Berlaku seketika tanpa redeploy
            </span>
          </div>

          {qrisSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{qrisSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveQris} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C8BED4] mb-1">
                  Nama Akun QRIS (Merchant Name)
                </label>
                <input
                  type="text"
                  value={qrisAccountName}
                  onChange={(e) => setQrisAccountName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white focus:outline-none focus:border-purple-400"
                  placeholder="Contoh: NIVA Official / PT Inovasi Semarang"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8BED4] mb-1">
                  Instruksi Pembayaran QRIS
                </label>
                <textarea
                  rows={3}
                  value={qrisInstructions}
                  onChange={(e) => setQrisInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white focus:outline-none focus:border-purple-400"
                  placeholder="Instruksi untuk ditampilkan ke pendonor"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8BED4] mb-1">
                  Upload Gambar QRIS Baru
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrisFileChange}
                  className="text-xs text-[#9D93A8] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600/30 file:text-purple-200 hover:file:bg-purple-600/50"
                />
                <p className="text-[10px] text-[#9D93A8] mt-1">
                  Format PNG/JPG/WebP, maksimal 4MB.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingQris}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{savingQris ? 'Menyimpan...' : 'Simpan Konfigurasi QRIS'}</span>
              </button>
            </div>

            {/* QRIS Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#0F0D13] rounded-xl border border-[#2B2438]">
              <span className="text-[11px] font-semibold text-[#9D93A8] mb-2">Pratinjau QRIS Aktif:</span>
              {qrisImageBase64 ? (
                <div className="p-3 bg-white rounded-xl shadow-md flex flex-col items-center">
                  <img
                    src={qrisImageBase64}
                    alt="Active QRIS"
                    className="max-h-48 object-contain"
                  />
                  <div className="text-[10px] text-gray-800 font-bold mt-1 text-center">
                    {qrisAccountName}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#9D93A8] text-center p-6 border border-dashed border-[#2B2438] rounded-xl">
                  Belum ada gambar QRIS. Upload gambar resmi di sebelah kiri.
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Real Metrics Cards (Production DB Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-[#171420] border border-[#2B2438] rounded-2xl p-4 space-y-1">
          <div className="text-[11px] text-[#9D93A8] font-medium">Total Support</div>
          <div className="text-xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="bg-[#171420] border border-amber-500/20 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Menunggu Verifikasi</span>
          </div>
          <div className="text-xl font-bold text-amber-300">{stats.pending}</div>
        </div>

        <div className="bg-[#171420] border border-emerald-500/20 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
          </div>
          <div className="text-xl font-bold text-emerald-300">{stats.verified}</div>
        </div>

        <div className="bg-[#171420] border border-rose-500/20 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] text-rose-300 font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </div>
          <div className="text-xl font-bold text-rose-300">{stats.rejected}</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-purple-950/40 to-[#171420] border border-purple-500/30 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] text-purple-300 font-medium flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>Dana Terverifikasi</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-white truncate">
            {formatRupiah(stats.total_verified_amount)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#171420] border border-[#2B2438] p-3 rounded-2xl">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-[#9D93A8] hover:text-white hover:bg-white/5'
              }`}
            >
              {st === 'ALL' && 'Semua'}
              {st === 'PENDING_VERIFICATION' && 'Antrean Verifikasi'}
              {st === 'VERIFIED' && 'Verified'}
              {st === 'REJECTED' && 'Rejected'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#9D93A8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ID / Nama / Catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white focus:outline-none focus:border-purple-400"
          />
        </div>
      </div>

      {/* Contributions Table */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#14111C] border-b border-[#2B2438] text-[#9D93A8]">
              <tr>
                <th className="py-3 px-4 font-semibold">Support Code</th>
                <th className="py-3 px-4 font-semibold">Pendonor</th>
                <th className="py-3 px-4 font-semibold">Nominal</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Bukti</th>
                <th className="py-3 px-4 font-semibold">Waktu Pengajuan</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B2438]/50 text-[#C8BED4]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9D93A8]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Memuat data antrean support...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredContributions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9D93A8]">
                    Tidak ada kontribusi support yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredContributions.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {item.support_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{item.donor_name || 'Teman NIVA'}</div>
                      {item.note && (
                        <div className="text-[11px] text-[#9D93A8] italic max-w-xs truncate">
                          "{item.note}"
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {formatRupiah(item.amount)}
                    </td>
                    <td className="py-3 px-4">
                      {item.status === 'PENDING_VERIFICATION' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PENDING
                        </span>
                      )}
                      {item.status === 'VERIFIED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          VERIFIED
                        </span>
                      )}
                      {item.status === 'REJECTED' && (
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            REJECTED
                          </span>
                          {item.rejection_reason && (
                            <div className="text-[10px] text-rose-300/80 mt-0.5 max-w-xs truncate" title={item.rejection_reason}>
                              {item.rejection_reason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.payment_proof ? (
                        <button
                          onClick={() => setViewingContribution(item)}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Lihat Bukti</span>
                        </button>
                      ) : (
                        <span className="text-[#9D93A8] italic">Tanpa bukti</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#9D93A8]">
                      {new Date(item.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === 'PENDING_VERIFICATION' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleVerify(item.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                            title="Verify Support"
                          >
                            <Check className="w-3 h-3" />
                            <span>Verify</span>
                          </button>
                          <button
                            onClick={() => setRejectingItem(item)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white font-semibold flex items-center gap-1 border border-rose-500/30 transition-all disabled:opacity-50"
                            title="Reject Support"
                          >
                            <X className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#9D93A8]">
                          {item.verified_at ? new Date(item.verified_at).toLocaleDateString('id-ID') : 'Selesai'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Viewer Modal */}
      {viewingContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#171420] border border-[#2B2438] rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2B2438] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Bukti Pembayaran: {viewingContribution.support_code}
                </h3>
                <p className="text-xs text-[#9D93A8]">
                  {viewingContribution.donor_name || 'Teman NIVA'} • {formatRupiah(viewingContribution.amount)}
                </p>
              </div>
              <button
                onClick={() => setViewingContribution(null)}
                className="p-1 rounded-lg text-[#9D93A8] hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingContribution.note && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[#C8BED4]">
                <span className="font-semibold text-purple-300">Catatan Pendonor: </span>
                {viewingContribution.note}
              </div>
            )}

            <div className="flex justify-center p-2 bg-[#0F0D13] rounded-2xl border border-[#2B2438]">
              {viewingContribution.payment_proof ? (
                <img
                  src={viewingContribution.payment_proof}
                  alt="Bukti Transfer / QRIS"
                  className="max-h-96 w-auto object-contain rounded-xl"
                />
              ) : (
                <div className="py-12 text-xs text-[#9D93A8]">Tidak ada gambar bukti</div>
              )}
            </div>

            {viewingContribution.status === 'PENDING_VERIFICATION' && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2B2438]">
                <button
                  onClick={() => {
                    setRejectingItem(viewingContribution);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-semibold transition-all"
                >
                  Tolak (Reject)
                </button>
                <button
                  onClick={() => handleVerify(viewingContribution.id)}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  Verifikasi Pembayaran Valid
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#171420] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Tolak Dukungan</h3>
            </div>
            <p className="text-xs text-[#C8BED4]">
              Masukkan alasan penolakan untuk <strong>{rejectingItem.support_code}</strong> ({formatRupiah(rejectingItem.amount)}). Alasan ini akan tersimpan dalam audit log dan dapat dilihat oleh pengguna yang bersangkutan saat memeriksa status.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Bukti transfer tidak terbaca / Nominal tidak sesuai mutasi QRIS / Gambar buram..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white focus:outline-none focus:border-rose-400"
                required
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingItem(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#C8BED4]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Memproses...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
