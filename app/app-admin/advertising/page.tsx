'use client';

import { useState, useEffect } from 'react';
import { 
  Megaphone, 
  RefreshCw, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Edit3,
  Search,
  Filter
} from 'lucide-react';

interface AdvertisingLead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  campaign_type: string;
  budget_range: string | null;
  target_audience: string | null;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';
  internal_notes: string | null;
  created_at: string;
}

export default function AdminAdvertisingPage() {
  const [inquiries, setInquiries] = useState<AdvertisingLead[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<AdvertisingLead | null>(null);
  const [newStatus, setNewStatus] = useState<string>('NEW');
  const [internalNotes, setInternalNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/advertising?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/advertising', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: selectedLead.id,
          status: newStatus,
          internalNotes,
        }),
      });

      if (res.ok) {
        setSelectedLead(null);
        fetchLeads();
      } else {
        alert('Gagal memperbarui status permohonan.');
      }
    } catch {
      alert('Kendala jaringan.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'NEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">BARU (NEW)</span>;
      case 'CONTACTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">DIHUBUNGI</span>;
      case 'QUALIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">MEMENUHI SYARAT</span>;
      case 'PROPOSAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">PROPOSAL DIKIRIM</span>;
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">AKTIF TAYANG</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">SELESAI</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">DITOLAK</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-purple-400" />
            <span>Manajemen Kemitraan & Permohonan Iklan</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola prospek periklanan, promosi event kampus, dan kemitraan brand lokal Semarang secara transparan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'NEW', 'CONTACTED', 'ACTIVE', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            onClick={fetchLeads}
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white border border-white/5"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Memuat data permohonan...</div>
      ) : inquiries.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-slate-900/30 p-8 space-y-2">
          <p className="text-sm font-semibold text-slate-300">Tidak ada permohonan kemitraan ditemukan.</p>
          <p className="text-xs text-slate-500">Permohonan yang masuk melalui formulir /advertise akan tampil di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {inquiries.map((lead) => (
            <div
              key={lead.id}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition space-y-3 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{lead.company_name}</span>
                    {getStatusBadge(lead.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      PIC: <strong className="text-slate-200">{lead.contact_name}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {lead.contact_email}
                    </span>
                    {lead.contact_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {lead.contact_phone}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedLead(lead);
                    setNewStatus(lead.status);
                    setInternalNotes(lead.internal_notes || '');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Kelola Status</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Format Promosi</span>
                  <span className="font-mono font-semibold text-purple-300">{lead.campaign_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Anggaran</span>
                  <span className="font-mono">{lead.budget_range || 'Tidak ditentukan'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Tanggal Pengajuan</span>
                  <span>{new Date(lead.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-950/30 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Rincian Pesan / Kebutuhan:</span>
                <p className="leading-relaxed whitespace-pre-wrap">{lead.message}</p>
              </div>

              {lead.internal_notes && (
                <div className="text-xs text-amber-300 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg">
                  <strong>Catatan Internal Admin:</strong> {lead.internal_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status Update Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white">
                Kelola Prospek: {selectedLead.company_name}
              </h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Ubah Status Prospek:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="NEW">NEW (Baru Masuk)</option>
                  <option value="CONTACTED">CONTACTED (Sudah Dihubungi)</option>
                  <option value="QUALIFIED">QUALIFIED (Memenuhi Syarat)</option>
                  <option value="PROPOSAL">PROPOSAL (Penawaran Terkirim)</option>
                  <option value="ACTIVE">ACTIVE (Sedang Tayang)</option>
                  <option value="COMPLETED">COMPLETED (Selesai)</option>
                  <option value="REJECTED">REJECTED (Ditolak / Melanggar Kebijakan)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Catatan Internal Tim NIVA:</label>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Tambahkan catatan tindak lanjut, kesepakatan harga, jadwal tayang, atau alasan penolakan..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-white transition disabled:opacity-50"
                >
                  {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
