'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  ShieldAlert,
  AlertTriangle,
  UserX,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  RefreshCw,
  EyeOff,
  Search,
  Filter,
} from 'lucide-react';

interface Stats {
  waitlistCount: number;
  activeSessions: number;
  totalReports: number;
  pendingReports: number;
  bannedOrBlockedCount: number;
}

interface LiveSession {
  id: string;
  startedAt: string;
  durationSeconds: number;
  userAAnonId: string;
  userBAnonId: string;
  region: string;
}

interface ReportItem {
  id: string;
  sessionId: string;
  reporterAnonId: string;
  reportedAnonId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
}

interface SafetyEvent {
  id: string;
  sessionId: string;
  userAnonId: string;
  eventType: string;
  riskScore: number;
  payload: any;
  createdAt: string;
}

export default function AdminStrangerCamPage() {
  const [tab, setTab] = useState<'LIVE' | 'REPORTS' | 'EVENTS' | 'HEALTH'>('LIVE');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterReason, setFilterReason] = useState<string>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stranger-cam');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setLiveSessions(data.liveSessions || []);
        setReports(data.reports || []);
        setSafetyEvents(data.safetyEvents || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleResolveReport = async (reportId: string, action: 'RESOLVED' | 'DISMISSED' | 'BAN_USER') => {
    if (action === 'BAN_USER' && !confirm('Apakah Anda yakin ingin MEMBLOKIR / BAN pengguna ini secara permanen dari NIVA?')) {
      return;
    }

    setActionLoading(reportId);
    try {
      const res = await fetch('/api/admin/stranger-cam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action, adminNotes: 'Tindakan dari konsol Stranger Cam' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Laporan berhasil diperbarui.');
        fetchData();
      } else {
        alert('Gagal: ' + data.message);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = filterReason === 'ALL'
    ? reports
    : reports.filter((r) => r.reason === filterReason);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>Stranger Cam Operations</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#5B3A6D]/40 text-[#E8B4C8] border border-[#5B3A6D]/50">
              Live Module
            </span>
          </h1>
          <p className="text-xs text-[#9D93A8] mt-1">
            Pantau sesi aktif, antrean moderasi, peristiwa keamanan otomatis, dan metrik kesehatan.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white border border-[#2B2438] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Zero Surveillance Notice (Requirement 17) */}
      <div className="p-4 rounded-2xl bg-[#171420] border border-[#5B3A6D]/30 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#5B3A6D]/20 text-[#E8B4C8] shrink-0 mt-0.5">
          <EyeOff className="w-4 h-4" />
        </div>
        <div className="text-xs text-gray-300 space-y-1">
          <div className="font-semibold text-white">Prinsip Zero Surveillance & Privacy First</div>
          <p className="leading-relaxed text-[#9D93A8]">
            Konsol ini menyajikan telemetri operasional metadata sesi murni (ID acak, durasi, region).
            Panggilan video berlangsung peer-to-peer terenkripsi langsung antar-browser pengguna. Administrator tidak memiliki akses rekaman atau pengawasan video langsung.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-1">
          <div className="text-[11px] text-[#9D93A8]">Live Calls Now</div>
          <div className="text-2xl font-display font-extrabold text-emerald-400">
            {stats?.activeSessions ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-1">
          <div className="text-[11px] text-[#9D93A8]">Pending Reports</div>
          <div className="text-2xl font-display font-extrabold text-amber-400">
            {stats?.pendingReports ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-1">
          <div className="text-[11px] text-[#9D93A8]">Total Reports</div>
          <div className="text-2xl font-display font-extrabold text-white">
            {stats?.totalReports ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-1">
          <div className="text-[11px] text-[#9D93A8]">Blocked Users</div>
          <div className="text-2xl font-display font-extrabold text-rose-400">
            {stats?.bannedOrBlockedCount ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-1 col-span-2 md:col-span-1">
          <div className="text-[11px] text-[#9D93A8]">Waitlist Signups</div>
          <div className="text-2xl font-display font-extrabold text-[#E8B4C8]">
            {stats?.waitlistCount ?? 0}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#2B2438] pb-2 text-xs font-semibold">
        <button
          onClick={() => setTab('LIVE')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'LIVE'
              ? 'bg-[#5B3A6D] text-white'
              : 'text-[#9D93A8] hover:text-white hover:bg-white/5'
          }`}
        >
          Sesi Aktif ({liveSessions.length})
        </button>
        <button
          onClick={() => setTab('REPORTS')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'REPORTS'
              ? 'bg-[#5B3A6D] text-white'
              : 'text-[#9D93A8] hover:text-white hover:bg-white/5'
          }`}
        >
          Antrean Laporan ({reports.length})
        </button>
        <button
          onClick={() => setTab('EVENTS')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'EVENTS'
              ? 'bg-[#5B3A6D] text-white'
              : 'text-[#9D93A8] hover:text-white hover:bg-white/5'
          }`}
        >
          Safety Events ({safetyEvents.length})
        </button>
        <button
          onClick={() => setTab('HEALTH')}
          className={`px-4 py-2 rounded-xl transition-all ${
            tab === 'HEALTH'
              ? 'bg-[#5B3A6D] text-white'
              : 'text-[#9D93A8] hover:text-white hover:bg-white/5'
          }`}
        >
          System Health & Config
        </button>
      </div>

      {/* ── TAB 1: LIVE SESSIONS ────────────────────────────────────────── */}
      {tab === 'LIVE' && (
        <div className="space-y-4">
          {liveSessions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#171420] border border-[#2B2438] text-xs text-[#9D93A8] space-y-2">
              <Video className="w-8 h-8 mx-auto opacity-40 text-[#8A5A9A]" />
              <div>Tidak ada sesi video aktif saat ini.</div>
              <div className="text-[11px] text-[#68626D]">Sesi akan muncul secara real-time saat pengguna terhubung.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveSessions.map((s) => (
                <div key={s.id} className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-mono text-white font-semibold">{s.id.substring(0, 12)}...</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      CONNECTED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-black/30 border border-white/5">
                    <div>
                      <span className="text-[10px] text-[#9D93A8] block">Participant A</span>
                      <span className="font-mono text-white">{s.userAAnonId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9D93A8] block">Participant B</span>
                      <span className="font-mono text-white">{s.userBAnonId}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#9D93A8] pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                      <span>{s.region}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Durasi: {formatDuration(s.durationSeconds)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: REPORTS QUEUE ────────────────────────────────────────── */}
      {tab === 'REPORTS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#9D93A8]" />
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#171420] border border-[#2B2438] text-xs text-white focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="NUDITY">NUDITY</option>
              <option value="HARASSMENT">HARASSMENT</option>
              <option value="SCAM">SCAM</option>
              <option value="THREAT">THREAT</option>
              <option value="UNDERAGE_CONCERN">UNDERAGE_CONCERN</option>
              <option value="PHISHING">PHISHING</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          {filteredReports.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#171420] border border-[#2B2438] text-xs text-[#9D93A8]">
              Antrean moderasi bersih! Belum ada laporan pengguna baru.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-[10px]">
                        {r.reason}
                      </span>
                      <span className="text-[#9D93A8]">
                        Dilaporkan oleh <strong className="text-white font-mono">{r.reporterAnonId}</strong> terhadap <strong className="text-rose-400 font-mono">{r.reportedAnonId}</strong>
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  {r.details && (
                    <div className="p-3 rounded-xl bg-black/30 text-xs text-gray-300 border border-white/5">
                      &quot;{r.details}&quot;
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                    <span className="text-[10px] text-[#9D93A8]">
                      Waktu Lapor: {new Date(r.createdAt).toLocaleString('id-ID')}
                    </span>

                    {r.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport(r.id, 'DISMISSED')}
                          disabled={actionLoading === r.id}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 border border-white/10 transition-colors"
                        >
                          Abaikan (Dismiss)
                        </button>
                        <button
                          onClick={() => handleResolveReport(r.id, 'RESOLVED')}
                          disabled={actionLoading === r.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                        >
                          Selesaikan (Resolve)
                        </button>
                        <button
                          onClick={() => handleResolveReport(r.id, 'BAN_USER')}
                          disabled={actionLoading === r.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                        >
                          Ban Terlapor
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SAFETY EVENTS ────────────────────────────────────────── */}
      {tab === 'EVENTS' && (
        <div className="space-y-4">
          {safetyEvents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#171420] border border-[#2B2438] text-xs text-[#9D93A8]">
              Tidak ada safety event yang tercatat.
            </div>
          ) : (
            <div className="space-y-2">
              {safetyEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl bg-[#171420] border border-[#2B2438] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white font-semibold">{evt.eventType}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                        Risk Score: {evt.riskScore}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9D93A8]">
                      Subject: <span className="font-mono text-gray-300">{evt.userAnonId}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#9D93A8]">
                    {new Date(evt.createdAt).toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SYSTEM HEALTH & CONFIG ───────────────────────────────── */}
      {tab === 'HEALTH' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Infrastruktur Stranger Cam</span>
            </h3>
            <div className="text-xs space-y-2 text-[#9D93A8]">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Signaling Engine:</span>
                <span className="font-semibold text-white">REST Short-Lived Poll (WSS-Ready)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Public STUN Servers:</span>
                <span className="font-semibold text-emerald-400">3 Google Nodes Active</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Media Capture Retention:</span>
                <span className="font-semibold text-emerald-400">Strict 0 (Zero Recording)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Geolocation Enforcement:</span>
                <span className="font-semibold text-purple-300">Semarang Bounding Box & Region Scope</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#E8B4C8]" />
              <span>Anti-Abuse & Moderation Policy</span>
            </h3>
            <div className="text-xs space-y-2 text-[#9D93A8]">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Age Gate Policy:</span>
                <span className="font-semibold text-white">18+ Server-Side Enforced</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Mutual Block Enforcement:</span>
                <span className="font-semibold text-emerald-400">Permanent Database Reclusion</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Content Filter:</span>
                <span className="font-semibold text-white">Anti-Scam & Credential Phishing Regex</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>KTM Required:</span>
                <span className="font-semibold text-gray-400">No (Inclusive for Semarang Students)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
