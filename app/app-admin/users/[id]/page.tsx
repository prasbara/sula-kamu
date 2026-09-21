'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Camera, 
  CreditCard, 
  Clock, 
  MessageSquare,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminUserDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <div className="py-20 text-center text-xs text-[#9D93A8]">Memuat riwayat pengguna...</div>;
  }

  if (!data?.user) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="text-sm text-rose-400 font-semibold">Pengguna tidak ditemukan.</div>
        <Link href="/app-admin/users" className="text-xs text-[#8A5A9A] hover:underline">
          ← Kembali ke daftar pengguna
        </Link>
      </div>
    );
  }

  const { user, payments, subscriptions, tickets, reports, audits } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/app-admin/users"
          className="p-2 rounded-xl bg-[#171420] border border-[#2B2438] text-[#9D93A8] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <span>{user.display_name || 'Tanpa Profil'}</span>
            <span className="font-mono text-xs font-normal text-[#9D93A8]">({user.user_id})</span>
          </h1>
          <p className="text-xs text-[#9D93A8] mt-0.5">
            {user.institution_name} ({user.institution_short_name}) • Jurusan: {user.study_field || '-'}
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#171420] border border-[#2B2438] space-y-1">
          <span className="text-[10px] text-[#9D93A8] uppercase tracking-wider font-semibold">Status Akun</span>
          <div className="text-sm font-bold text-white">{user.account_status}</div>
          <div className="text-[10px] text-[#6E647D]">Risk score: {user.risk_score}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#171420] border border-[#2B2438] space-y-1">
          <span className="text-[10px] text-[#9D93A8] uppercase tracking-wider font-semibold">Verifikasi</span>
          <div className="text-sm font-bold text-sky-400">{user.verification_status}</div>
          <div className="text-[10px] text-[#6E647D]">{user.is_18_plus ? '18+ Lolos' : 'Belum 18+'}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#171420] border border-[#2B2438] space-y-1">
          <span className="text-[10px] text-[#9D93A8] uppercase tracking-wider font-semibold">Langganan</span>
          <div className="text-sm font-bold text-[#E8B4C8]">{user.subscription_status}</div>
          <div className="text-[10px] text-[#6E647D]">{subscriptions.length} Riwayat Paket</div>
        </div>

        <div className="p-4 rounded-xl bg-[#171420] border border-[#2B2438] space-y-1">
          <span className="text-[10px] text-[#9D93A8] uppercase tracking-wider font-semibold">Tiket & Laporan</span>
          <div className="text-sm font-bold text-white">{tickets.length} Tiket • {reports.length} Laporan</div>
          <div className="text-[10px] text-[#6E647D]">Terdaftar: {new Date(user.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Operational Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment History */}
        <div className="p-6 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#E8B4C8]" />
            <span>Riwayat Pembayaran</span>
          </h2>
          {payments.length === 0 ? (
            <div className="text-xs text-[#6E647D] py-4 text-center">Belum ada tagihan pembayaran.</div>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="p-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-white">{p.id}</div>
                    <div className="text-[10px] text-[#9D93A8]">Rp{p.amount.toLocaleString()} • {p.payment_method}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Tickets */}
        <div className="p-6 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>Tiket Bantuan Support</span>
          </h2>
          {tickets.length === 0 ? (
            <div className="text-xs text-[#6E647D] py-4 text-center">Belum ada tiket support.</div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t: any) => (
                <div key={t.id} className="p-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-white">{t.id}</div>
                    <div className="text-[10px] text-[#9D93A8]">{t.subject}</div>
                  </div>
                  <Link
                    href="/app-admin/support"
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                  >
                    {t.status} →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Trail for this user */}
      <div className="p-6 rounded-2xl bg-[#171420] border border-[#2B2438] space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#8A5A9A]" />
          <span>Audit Trail Terkait Pengguna Ini</span>
        </h2>
        {audits.length === 0 ? (
          <div className="text-xs text-[#6E647D] py-4 text-center">Belum ada catatan audit.</div>
        ) : (
          <div className="space-y-2 text-xs">
            {audits.map((a: any) => (
              <div key={a.id} className="p-2.5 rounded-lg bg-[#0F0D13] border border-[#2B2438] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#E8B4C8]">{a.action}</span>
                  <span className="text-[#9D93A8] ml-2 font-mono text-[10px]">{a.details}</span>
                </div>
                <div className="text-[10px] text-[#6E647D] font-mono">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
