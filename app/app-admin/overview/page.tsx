'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  ShieldCheck, 
  Camera, 
  CreditCard, 
  MessageSquare, 
  AlertTriangle, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) setMetrics(data.metrics);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-[#9D93A8]">
        Memuat metrik operasional NIVA...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">
          Operational Overview
        </h1>
        <p className="text-xs text-[#9D93A8] mt-1">
          Real-time aggregate data sourced directly from production database.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9D93A8]">
            <span>Total Joined (All Time)</span>
            <Users className="w-4 h-4 text-[#8A5A9A]" />
          </div>
          <div className="text-3xl font-display font-extrabold text-white">
            {metrics?.studentsJoinedTotal ?? 0}
          </div>
          <div className="text-[10px] text-[#2D8C6A] flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> Cumulative Onboarded
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9D93A8]">
            <span>Active Users</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-display font-extrabold text-white">
            {metrics?.totalActiveUsers ?? 0}
          </div>
          <div className="text-[10px] text-[#9D93A8]">
            {metrics?.freeUsers ?? 0} Free • {metrics?.premiumUsers ?? 0} Premium
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9D93A8]">
            <span>Verified Profiles</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-display font-extrabold text-white">
            {(metrics?.photoVerified ?? 0) + (metrics?.ktmVerified ?? 0)}
          </div>
          <div className="text-[10px] text-[#9D93A8]">
            {metrics?.ktmVerified ?? 0} KTM • {metrics?.photoVerified ?? 0} Photo
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9D93A8]">
            <span>Active Premium</span>
            <CreditCard className="w-4 h-4 text-[#E8B4C8]" />
          </div>
          <div className="text-3xl font-display font-extrabold text-white">
            {metrics?.premiumUsers ?? 0}
          </div>
          <div className="text-[10px] text-[#E8B4C8] font-medium">
            30-Day Subscriptions
          </div>
        </div>
      </div>

      {/* Real-time Matchmaking & Presence Observability */}
      <div className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-[#D0C4DC] uppercase flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Bot Matchmaking & Presence
            </h2>
            <p className="text-[11px] text-[#9D93A8] mt-0.5">
              Sinkronisasi data langsung dari Telegram Bot dan database SQLite (Zero Fake Data).
            </p>
          </div>
          <div className="text-[10px] text-[#9D93A8] font-mono">
            Heartbeat Window: 15 Menit
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[#0F0D13]/60 border border-[#2B2438]">
            <div className="text-[11px] text-[#9D93A8]">Currently Online</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {metrics?.currentlyOnline ?? 0}
            </div>
            <div className="text-[10px] text-[#6E647D]">Active in last 15 min</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0F0D13]/60 border border-[#2B2438]">
            <div className="text-[11px] text-[#9D93A8]">Searching Queue</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {metrics?.searchingCount ?? 0}
            </div>
            <div className="text-[10px] text-[#6E647D]">Waiting for match</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0F0D13]/60 border border-[#2B2438]">
            <div className="text-[11px] text-[#9D93A8]">Active 20-Min Chats</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">
              {metrics?.activeChats ?? 0}
            </div>
            <div className="text-[10px] text-[#6E647D]">Live isolated sessions</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0F0D13]/60 border border-[#2B2438]">
            <div className="text-[11px] text-[#9D93A8]">Completed Sessions</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">
              {metrics?.completedSessions ?? 0}
            </div>
            <div className="text-[10px] text-[#6E647D]">Server timer expired/ended</div>
          </div>
        </div>
      </div>

      {/* Operational Queues Action Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wider text-[#D0C4DC] uppercase">
          Operational Queues & Modul Admin (Live Data)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/app-admin/payments"
            className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] hover:border-[#8A5A9A]/50 transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="text-xs text-[#9D93A8]">Pending Payments</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <span>{metrics?.pendingPayments ?? 0}</span>
                {metrics?.pendingPayments > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Aksi Diperlukan
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#6E647D]">Antrean bukti transfer & QRIS</div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A5A9A] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/app-admin/verification"
            className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] hover:border-[#8A5A9A]/50 transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="text-xs text-[#9D93A8]">Pending Verifications</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <span>{metrics?.pendingVerifications ?? 0}</span>
                {metrics?.pendingVerifications > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Aksi Diperlukan
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#6E647D]">
                {metrics?.pendingKtm ?? 0} KTM • {metrics?.pendingPhoto ?? 0} Selfie
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A5A9A] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/app-admin/support"
            className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] hover:border-[#8A5A9A]/50 transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="text-xs text-[#9D93A8]">Open Support Tickets</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <span>{metrics?.openTickets ?? 0}</span>
                {metrics?.openTickets > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    FIFO Queue
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#6E647D]">Pusat Bantuan Resmi NIVA</div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A5A9A] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/app-admin/reviews"
            className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] hover:border-[#8A5A9A]/50 transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="text-xs text-[#9D93A8]">User Reviews Queue</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <span>{metrics?.pendingReviews ?? 0}</span>
                {metrics?.pendingReviews > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Moderasi
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#6E647D]">Ulasan mahasiswa & rating</div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A5A9A] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/app-admin/advertising"
            className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] hover:border-[#8A5A9A]/50 transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="text-xs text-[#9D93A8]">Iklan & Kemitraan</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <span>{metrics?.pendingAdInquiries ?? 0}</span>
                {metrics?.pendingAdInquiries > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Inquiry Baru
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#6E647D]">Lead advertiser & sponsor</div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A5A9A] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/app-admin/moderation"
            className="p-5 rounded-2xl bg-[#171420] border border-[#2B2438] hover:border-[#8A5A9A]/50 transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="text-xs text-[#9D93A8]">Moderation & Strikes</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <span>{metrics?.pendingModeration ?? 0}</span>
                {metrics?.pendingModeration > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Incident
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#6E647D]">Safety pipeline & violations</div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A5A9A] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
