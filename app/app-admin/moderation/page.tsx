'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  UserCheck,
  History,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { ModerationEvent, ModerationSeverity } from '@/src/types/index';

interface UserReportItem {
  id: string;
  report_code: string;
  category: string;
  evidence_text: string | null;
  evidence_media_id: string | null;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';
  assigned_moderator_id: string | null;
  moderator_notes: string | null;
  resolution_action: string | null;
  created_at: string;
  updated_at: string;
  reported_username_at_time: string | null;
  reporter_id: string;
  reporter_display_name: string | null;
  reporter_telegram_id: string | null;
  reported_user_id: string;
  reported_telegram_id: string | null;
  reported_current_username: string | null;
  reported_current_display_name: string | null;
  reported_account_status: string;
  reported_verification_status: string;
  reported_subscription_status: string;
  reported_profile_name: string | null;
  reported_total_reports_count: number;
  historical_usernames: string[];
}

export default function AdminModerationQueuePage() {
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'AUTOMATED'>('REPORTS');

  // Reports state
  const [reports, setReports] = useState<UserReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('ALL');
  const [reportSearch, setReportSearch] = useState('');
  const [reportCounts, setReportCounts] = useState({ all: 0, open: 0, underInvestigation: 0, resolved: 0, dismissed: 0 });

  // Automated strikes state
  const [eventsLoading, setEventsLoading] = useState(true);
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [eventCounts, setEventCounts] = useState({ critical: 0, high: 0, medium: 0, low: 0, total: 0 });
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Fetch Reports
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportStatusFilter !== 'ALL') params.set('status', reportStatusFilter);
      if (reportCategoryFilter !== 'ALL') params.set('category', reportCategoryFilter);
      if (reportSearch.trim()) params.set('q', reportSearch.trim());

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        if (data.counts) setReportCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  // Fetch Automated Events
  const fetchEvents = async (severity?: string) => {
    setEventsLoading(true);
    try {
      const url =
        severity && severity !== 'ALL'
          ? `/api/admin/moderation/queue?severity=${encodeURIComponent(severity)}`
          : '/api/admin/moderation/queue';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.counts) setEventCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch automated queue:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'REPORTS') {
      fetchReports();
    } else {
      fetchEvents(severityFilter);
    }
  }, [activeTab, reportStatusFilter, reportCategoryFilter, severityFilter]);

  // Handle Action on User Report
  const handleReportAction = async (reportId: string, action: 'WARN' | 'SUSPEND' | 'BAN' | 'DISMISS') => {
    const reason = prompt(`Masukkan catatan alasan untuk tindakan [${action}]:`);
    if (reason === null) return; // User cancelled

    setActionLoading(reportId);
    setStatusMessage('');
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: reason.trim() || `Tindakan ${action} disetujui moderator` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses laporan.');

      setStatusMessage(`Laporan berhasil ditindaklanjuti dengan status ${action}.`);
      fetchReports();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Action on Automated Event
  const handleEventAction = async (eventId: string, action: 'DISMISS' | 'RESOLVE' | 'BAN_USER') => {
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
      fetchEvents(severityFilter);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'SCAM':
      case 'FRAUD':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'SEXUAL_HARASSMENT':
      case 'THREAT':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-bold';
      case 'HARASSMENT':
      case 'ABUSE':
        return 'bg-red-500/10 text-red-300 border-red-500/30';
      case 'IMPERSONATION':
      case 'FAKE_IDENTITY':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      default:
        return 'bg-white/5 text-[#C8BED4] border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#2B2438]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
            <span>Moderation & Safety Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#9D93A8] mt-1">
            Peninjauan laporan insiden pengguna (Scam, Pelecehan, Abuse) & sistem deteksi otomatis three-strike.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (activeTab === 'REPORTS' ? fetchReports() : fetchEvents(severityFilter))}
            disabled={reportsLoading || eventsLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading || eventsLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Main Subtabs: User Reports vs Automated Safety */}
      <div className="flex items-center gap-3 border-b border-[#2B2438] pb-3">
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'REPORTS'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-[#181421] text-[#9D93A8] hover:text-white border border-[#2B2438]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Laporan Pengguna ({reportCounts.open} Perlu Tindakan)</span>
        </button>

        <button
          onClick={() => setActiveTab('AUTOMATED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'AUTOMATED'
              ? 'bg-[#5B3A6D] text-white shadow-lg shadow-[#5B3A6D]/20'
              : 'bg-[#181421] text-[#9D93A8] hover:text-white border border-[#2B2438]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Deteksi Otomatis ({eventCounts.critical + eventCounts.high} High/Critical)</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* TAB 1: USER INCIDENT REPORTS */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
              {[
                { key: 'ALL', label: 'Semua Status' },
                { key: 'OPEN', label: `🔴 Open (${reportCounts.open})` },
                { key: 'UNDER_INVESTIGATION', label: '🟡 Investigasi' },
                { key: 'RESOLVED', label: '🟢 Selesai' },
                { key: 'DISMISSED', label: 'Abaikan' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setReportStatusFilter(s.key)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                    reportStatusFilter === s.key
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50'
                      : 'bg-[#181421] text-[#9D93A8] hover:text-white border border-[#2B2438]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchReports();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9D93A8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari ID, @username, atau nama..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#181421] border border-[#2B2438] rounded-xl text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-rose-500 w-64"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
              >
                Cari
              </button>
            </form>
          </div>

          {/* Reports List */}
          {reportsLoading ? (
            <div className="py-20 text-center text-[#9D93A8] space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-400" />
              <p className="text-xs">Memuat antrean laporan pengguna...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-20 text-center bg-[#181421] rounded-3xl border border-[#2B2438] space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-base text-white">Tidak Ada Laporan</h3>
              <p className="text-xs text-[#9D93A8] max-w-sm mx-auto">
                Antrean bersih. Tidak ada laporan insiden dengan kriteria filter saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 rounded-2xl bg-[#181421] border border-[#2B2438] hover:border-white/20 transition-all space-y-4"
                >
                  {/* Top Bar: Case ID & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
                        {report.report_code}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryColor(report.category)}`}>
                        {report.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          report.status === 'OPEN'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : report.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#9D93A8] flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(report.created_at).toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Identity Resolution Section (Historical vs Current) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/25 p-4 rounded-xl border border-white/5 text-xs">
                    {/* Reported User 360 Box */}
                    <div className="space-y-2 border-b md:border-b-0 md:border-r border-white/5 pb-3 md:pb-0 md:pr-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <UserX className="w-3.5 h-3.5" /> Pengguna Dilaporkan
                        </span>
                        <Link
                          href={`/app-admin/users/${report.reported_user_id}`}
                          className="text-[11px] text-[#8A5A9A] hover:text-white flex items-center gap-1 font-semibold"
                        >
                          User 360° <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="space-y-1">
                        <div className="font-bold text-white text-sm">
                          {report.reported_profile_name || report.reported_current_display_name || 'Tanpa Profil'}
                        </div>
                        <div className="text-[#9D93A8] space-y-0.5 font-mono text-[11px]">
                          <div>Internal ID: <span className="text-white">{report.reported_user_id}</span></div>
                          <div>Telegram ID: <span className="text-white">{report.reported_telegram_id || '-'}</span></div>
                          <div>
                            Username Saat Ini:{' '}
                            <span className="text-emerald-400 font-semibold">
                              {report.reported_current_username ? `@${report.reported_current_username}` : 'Tanpa username'}
                            </span>
                          </div>
                          {report.reported_username_at_time && (
                            <div>
                              Username Saat Dilaporkan:{' '}
                              <span className="text-amber-300 font-semibold">
                                @{report.reported_username_at_time}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Historical Usernames Badge List */}
                        {report.historical_usernames && report.historical_usernames.length > 0 && (
                          <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-[#7A7185] flex items-center gap-1">
                              <History className="w-3 h-3" /> Riwayat Username:
                            </span>
                            {report.historical_usernames.map((oldName) => (
                              <span
                                key={oldName}
                                className="px-1.5 py-0.5 rounded bg-white/5 text-[#9D93A8] text-[10px] font-mono border border-white/5 line-through"
                              >
                                @{oldName}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 text-[10px] text-[#9D93A8]">
                          Status: <strong className="text-white">{report.reported_account_status}</strong> • Verifikasi: <strong className="text-sky-300">{report.reported_verification_status}</strong> • Total Laporan: <strong className="text-rose-400">{report.reported_total_reports_count}x</strong>
                        </div>
                      </div>
                    </div>

                    {/* Reporter Box */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" /> Pelapor (Reporter)
                      </span>
                      <div className="space-y-1">
                        <div className="font-bold text-white text-sm">
                          {report.reporter_display_name || 'Pelapor Mahasiswa'}
                        </div>
                        <div className="text-[#9D93A8] font-mono text-[11px]">
                          <div>User ID: <span className="text-white">{report.reporter_id}</span></div>
                          <div>Telegram ID: <span className="text-white">{report.reporter_telegram_id || '-'}</span></div>
                        </div>
                      </div>

                      {/* Evidence / Description */}
                      <div className="pt-2 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D93A8]">Bukti & Deskripsi Pelapor:</span>
                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs text-[#E8B4C8] whitespace-pre-wrap leading-relaxed">
                          {report.evidence_text || 'Tidak ada deskripsi teks.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Resolution Note */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    {report.resolution_action ? (
                      <div className="text-xs text-[#9D93A8] bg-white/5 p-2 rounded-lg border border-white/5">
                        Tindakan:{' '}
                        <strong className="text-white">{report.resolution_action}</strong>
                        {report.moderator_notes && (
                          <span> • Catatan: "{report.moderator_notes}"</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-rose-300 flex items-center gap-1.5 font-medium">
                        <AlertOctagon className="w-3.5 h-3.5" /> Memerlukan keputusan tindakan moderator
                      </div>
                    )}

                    {report.status !== 'RESOLVED' && report.status !== 'DISMISSED' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleReportAction(report.id, 'WARN')}
                          disabled={actionLoading === report.id}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-all"
                        >
                          Beri Teguran (WARN)
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'SUSPEND')}
                          disabled={actionLoading === report.id}
                          className="px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 font-semibold text-xs border border-orange-500/30 transition-all"
                        >
                          Tangguhkan (SUSPEND)
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'BAN')}
                          disabled={actionLoading === report.id}
                          className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 font-bold text-xs border border-rose-500/50 transition-all"
                        >
                          Blokir Akun (BAN)
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'DISMISS')}
                          disabled={actionLoading === report.id}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9D93A8] text-xs border border-white/10 transition-all"
                        >
                          Abaikan (DISMISS)
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

      {/* TAB 2: AUTOMATED THREE-STRIKE EVENTS */}
      {activeTab === 'AUTOMATED' && (
        <div className="space-y-6">
          {/* Severity Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              onClick={() => setSeverityFilter('CRITICAL')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                severityFilter === 'CRITICAL'
                  ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
                  : 'bg-[#181421] border-[#2B2438] hover:border-rose-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-rose-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">🔴 Critical</span>
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white">{eventCounts.critical}</div>
              <p className="text-[10px] text-[#9D93A8] mt-0.5">Sextortion & eksploitasi</p>
            </div>

            <div
              onClick={() => setSeverityFilter('HIGH')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                severityFilter === 'HIGH'
                  ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/20'
                  : 'bg-[#181421] border-[#2B2438] hover:border-orange-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-orange-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">🟠 High</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white">{eventCounts.high}</div>
              <p className="text-[10px] text-[#9D93A8] mt-0.5">Scam finansial & nomor HP</p>
            </div>

            <div
              onClick={() => setSeverityFilter('MEDIUM')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                severityFilter === 'MEDIUM'
                  ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-[#181421] border-[#2B2438] hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">🟡 Medium</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white">{eventCounts.medium}</div>
              <p className="text-[10px] text-[#9D93A8] mt-0.5">Spam & kontak luar</p>
            </div>

            <div
              onClick={() => setSeverityFilter('LOW')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                severityFilter === 'LOW'
                  ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-[#181421] border-[#2B2438] hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">🟢 Low</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white">{eventCounts.low}</div>
              <p className="text-[10px] text-[#9D93A8] mt-0.5">Peringatan awal</p>
            </div>
          </div>

          {eventsLoading ? (
            <div className="py-20 text-center text-[#9D93A8] space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#8A5A9A]" />
              <p className="text-xs">Memuat antrean otomatis...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-20 text-center bg-[#181421] rounded-3xl border border-[#2B2438] space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-base text-white">Antrean Bersih</h3>
              <p className="text-xs text-[#9D93A8] max-w-sm mx-auto">
                Tidak ada insiden deteksi otomatis dengan kriteria filter saat ini.
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
                        <span>Strike #{evt.strike_count}</span>
                        <span>{new Date(evt.created_at).toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#7A7185] uppercase tracking-wider font-semibold">
                          Target Pengguna (User ID)
                        </span>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-black/40 rounded border border-white/5 font-mono text-[#E8B4C8]">
                            {evt.user_id}
                          </code>
                          <Link
                            href={`/app-admin/users/${evt.user_id}`}
                            className="text-[11px] text-[#8A5A9A] hover:underline"
                          >
                            Buka User 360° →
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-[#7A7185] uppercase tracking-wider font-semibold">
                          Tindakan Sistem Awal
                        </span>
                        <div className="font-semibold text-white">{evt.action}</div>
                      </div>
                    </div>

                    {evt.evidence_snippet && (
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] text-[#7A7185] uppercase tracking-wider font-semibold">
                          Cuplikan Bukti (Data Sanitized)
                        </span>
                        <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-[11px] text-[#F3EDF7] overflow-x-auto">
                          {evt.evidence_snippet}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleEventAction(evt.id, 'DISMISS')}
                        disabled={actionLoading === evt.id}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#C8BED4] border border-white/10"
                      >
                        Abaikan (False Positive)
                      </button>
                      <button
                        onClick={() => handleEventAction(evt.id, 'RESOLVE')}
                        disabled={actionLoading === evt.id}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-semibold text-emerald-300 border border-emerald-500/30"
                      >
                        Tandai Selesai (Resolve)
                      </button>
                      <button
                        onClick={() => handleEventAction(evt.id, 'BAN_USER')}
                        disabled={actionLoading === evt.id}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-rose-300 border border-rose-500/30"
                      >
                        Blokir Pengguna (Ban)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
