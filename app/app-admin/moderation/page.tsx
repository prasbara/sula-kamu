'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserX,
  Filter,
  Clock,
  Search,
  Lock,
} from 'lucide-react';
import { ModerationEvent, ModerationSeverity } from '@/src/types/index';

export default function AdminModerationQueuePage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [counts, setCounts] = useState<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>({ critical: 0, high: 0, medium: 0, low: 0, total: 0 });

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const fetchQueue = async (severity?: string) => {
    setLoading(true);
    try {
      const url =
        severity && severity !== 'ALL'
          ? `/api/admin/moderation/queue?severity=${encodeURIComponent(severity)}`
          : '/api/admin/moderation/queue';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch moderation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(severityFilter);
  }, [severityFilter]);

  const handleAction = async (eventId: string, action: 'DISMISS' | 'RESOLVE' | 'BAN_USER') => {
    setActionLoading(eventId);
    setStatusMessage('');
    try {
      const res = await fetch('/api/admin/moderation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action, notes: `Reviewed via Admin Dashboard` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memproses moderasi.');

      setStatusMessage(`Event berhasil ditandai sebagai ${action}.`);
      fetchQueue(severityFilter);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#2B2438]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
            <span>Moderation & Safety Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#9D93A8] mt-1">
            Antrean moderasi produksi: peninjauan otomatis pelanggaran anti-scam, nomor telepon, dan three-strike.
          </p>
        </div>

        <button
          onClick={() => fetchQueue(severityFilter)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Antrean</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Severity Counter Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setSeverityFilter('CRITICAL')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            severityFilter === 'CRITICAL'
              ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-[#181421] border-[#2B2438] hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">🔴 Critical</span>
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{counts.critical}</div>
          <p className="text-[11px] text-[#9D93A8] mt-1">Ancaman, sextortion & eksploitasi</p>
        </div>

        <div
          onClick={() => setSeverityFilter('HIGH')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            severityFilter === 'HIGH'
              ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/20'
              : 'bg-[#181421] border-[#2B2438] hover:border-orange-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-orange-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">🟠 High</span>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{counts.high}</div>
          <p className="text-[11px] text-[#9D93A8] mt-1">Scam finansial, OTP & nomor HP</p>
        </div>

        <div
          onClick={() => setSeverityFilter('MEDIUM')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            severityFilter === 'MEDIUM'
              ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-[#181421] border-[#2B2438] hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">🟡 Medium</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{counts.medium}</div>
          <p className="text-[11px] text-[#9D93A8] mt-1">Spam rate limit & kontak luar</p>
        </div>

        <div
          onClick={() => setSeverityFilter('LOW')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            severityFilter === 'LOW'
              ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-[#181421] border-[#2B2438] hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">🟢 Low</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{counts.low}</div>
          <p className="text-[11px] text-[#9D93A8] mt-1">Peringatan awal & filter kecil</p>
        </div>
      </div>

      {/* Filter Selector Tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSeverityFilter(filter)}
              className={`px-3.5 py-2 rounded-xl transition-colors ${
                severityFilter === filter
                  ? 'bg-[#5B3A6D] text-white'
                  : 'bg-white/5 text-[#A89EB0] hover:text-white hover:bg-white/10'
              }`}
            >
              {filter === 'ALL' ? 'Semua Severity' : filter}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#9D93A8]">
          Total: <strong>{events.length}</strong> pelanggaran
        </span>
      </div>

      {/* Events Table / List */}
      {loading ? (
        <div className="py-20 text-center text-[#9D93A8] space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#8A5A9A]" />
          <p className="text-xs">Memuat antrean moderasi...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="py-20 text-center bg-[#181421] rounded-3xl border border-[#2B2438] space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="font-bold text-base text-white">Antrean Bersih</h3>
          <p className="text-xs text-[#9D93A8] max-w-sm mx-auto">
            Tidak ada laporan atau insiden pelanggaran keamanan dengan kriteria ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((evt) => {
            const isCritical = evt.severity === 'CRITICAL';
            const isHigh = evt.severity === 'HIGH';
            const isMedium = evt.severity === 'MEDIUM';

            return (
              <div
                key={evt.id}
                className="p-5 rounded-2xl bg-[#181421] border border-[#2B2438] space-y-4 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isHigh
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : isMedium
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {evt.severity}
                    </span>
                    <span className="font-semibold text-sm text-white">{evt.category}</span>
                    <span className="text-xs text-[#7A7185]">• ID: {evt.id.substring(0, 8)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#9D93A8]">
                    <span>
                      Strike #{evt.strike_count}
                    </span>
                    <span>•</span>
                    <span>Risk Score: {evt.risk_score}</span>
                    <span>•</span>
                    <span className="text-[11px]">
                      {new Date(evt.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[#7A7185] block mb-0.5">User ID (Pelaku)</span>
                    <code className="text-white bg-white/5 px-2 py-1 rounded">
                      {evt.user_id.substring(0, 16)}...
                    </code>
                  </div>
                  <div>
                    <span className="text-[#7A7185] block mb-0.5">Aksi Sistem Otomatis</span>
                    <span className="font-semibold text-[#D8B4E2]">{evt.action}</span>
                  </div>
                  <div>
                    <span className="text-[#7A7185] block mb-0.5">Status Peninjauan</span>
                    <span
                      className={`font-semibold ${
                        evt.review_status === 'RESOLVED'
                          ? 'text-emerald-400'
                          : evt.review_status === 'DISMISSED'
                          ? 'text-slate-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {evt.review_status}
                    </span>
                  </div>
                </div>

                {evt.evidence_snippet && (
                  <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-xs space-y-1">
                    <span className="text-[11px] text-[#7A7185] font-semibold uppercase tracking-wider block">
                      Cuplikan Bukti (Data Minimization - Snippet Only)
                    </span>
                    <p className="font-mono text-amber-200/90 break-words">
                      "{evt.evidence_snippet}"
                    </p>
                  </div>
                )}

                {/* Moderator Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleAction(evt.id, 'DISMISS')}
                    disabled={actionLoading === evt.id || evt.review_status === 'DISMISSED'}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#C5BDCC] hover:text-white transition-colors"
                  >
                    Batalkan Sanksi (False Positive)
                  </button>
                  <button
                    onClick={() => handleAction(evt.id, 'RESOLVE')}
                    disabled={actionLoading === evt.id || evt.review_status === 'RESOLVED'}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  >
                    Konfirmasi Pelanggaran (Resolve)
                  </button>
                  <button
                    onClick={() => handleAction(evt.id, 'BAN_USER')}
                    disabled={actionLoading === evt.id}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Blokir Akun Total</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
