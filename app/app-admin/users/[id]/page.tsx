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
  History,
  FileText,
  UserCheck,
  UserX,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Lock,
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
    return <div className="py-20 text-center text-xs text-[#9D93A8]">Memuat profil 360° pengguna...</div>;
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

  const { 
    user, 
    identityHistory, 
    ktmVerifications, 
    photoVerifications, 
    premiumOrders, 
    subscriptions, 
    tickets, 
    reportsAgainst, 
    reportsFiled, 
    audits 
  } = data;

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              {user.display_name || 'Tanpa Profil'}
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#C8BED4]">
              {user.user_id}
            </span>
          </div>
          <p className="text-xs text-[#9D93A8] mt-0.5">
            {user.institution_name || 'Institusi Umum'} ({user.institution_short_name || '-'}) • Jurusan: {user.study_field || '-'}
          </p>
        </div>
      </div>

      {/* SECTION 1: IDENTITY & OVERVIEW 360 */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Identitas Utama & Snapshot Akun Telegram
          </span>
          <span className="text-[11px] text-[#9D93A8]">
            Terdaftar: {new Date(user.created_at).toLocaleString('id-ID')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] text-[#7A7185] uppercase tracking-wider font-semibold">Internal User ID (Primary)</span>
            <div className="font-mono font-bold text-white truncate">{user.user_id}</div>
            <div className="text-[10px] text-emerald-400">ID Terisolasi Database</div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] text-[#7A7185] uppercase tracking-wider font-semibold">Telegram User ID</span>
            <div className="font-mono font-bold text-sky-400 truncate">{user.telegram_id || '-'}</div>
            <div className="text-[10px] text-[#9D93A8]">Identifier Telegram Statis</div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] text-[#7A7185] uppercase tracking-wider font-semibold">Username Saat Ini</span>
            <div className="font-mono font-bold text-emerald-400 truncate">
              {user.telegram_username ? `@${user.telegram_username}` : 'Tanpa Username'}
            </div>
            <div className="text-[10px] text-[#9D93A8]">Nama: {user.telegram_display_name || user.display_name || '-'}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] text-[#7A7185] uppercase tracking-wider font-semibold">Status & Langganan</span>
            <div className="font-bold text-white flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] ${
                user.account_status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {user.account_status}
              </span>
              <span className="text-[#E8B4C8]">{user.subscription_status}</span>
            </div>
            <div className="text-[10px] text-sky-300">{user.verification_status}</div>
          </div>
        </div>

        {/* Historical Usernames & Identity History */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C8BED4]">
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>Riwayat Perubahan Identitas Telegram ({identityHistory?.length || 0} Snapshot):</span>
          </div>

          {identityHistory && identityHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {identityHistory.map((h: any) => (
                <div key={h.id} className="p-2.5 rounded-lg bg-black/20 border border-white/5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#7A7185]">
                    <span>{h.changeType}</span>
                    <span>{new Date(h.detectedAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="text-white font-mono">
                    <span className="line-through text-[#9D93A8]">@{h.previousUsername || 'none'}</span>
                    {' → '}
                    <span className="text-emerald-400 font-bold">@{h.newUsername || 'none'}</span>
                  </div>
                  {h.previousDisplayName && (
                    <div className="text-[10px] text-[#9D93A8]">
                      Nama: {h.previousDisplayName} → {h.newDisplayName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#7A7185] italic">
              Belum ada riwayat perubahan username tercatat untuk pengguna ini.
            </p>
          )}
        </div>
      </div>

      {/* SECTION 2: VERIFICATION & EVIDENCE */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl p-5 space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Pengajuan Verifikasi Mahasiswa (KTM & Foto)
        </span>

        {ktmVerifications && ktmVerifications.length > 0 ? (
          <div className="space-y-3">
            {ktmVerifications.map((kv: any) => (
              <div key={kv.id} className="p-3.5 rounded-xl bg-black/30 border border-white/5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Verifikasi KTM (ID: {kv.id.substring(0, 8)})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    kv.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {kv.status}
                  </span>
                </div>
                {kv.ocr_extracted_text && (
                  <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-[#C8BED4]">
                    {kv.ocr_extracted_text}
                  </div>
                )}
                <div className="text-[10px] text-[#9D93A8]">
                  Confidence: {kv.ocr_confidence}% • Catatan: {kv.review_notes || '-'} • Ditinjau: {kv.verified_at || kv.created_at}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#7A7185] italic">Tidak ada riwayat pengajuan KTM.</p>
        )}
      </div>

      {/* SECTION 3: REPORTS INVOLVING USER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports Against User */}
        <div className="bg-[#171420] border border-[#2B2438] rounded-2xl p-5 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <UserX className="w-4 h-4" /> Laporan Terhadap Pengguna Ini ({reportsAgainst?.length || 0})
          </span>

          {reportsAgainst && reportsAgainst.length > 0 ? (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {reportsAgainst.map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white">{r.report_code}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      {r.category}
                    </span>
                  </div>
                  <div className="text-[#E8B4C8] line-clamp-2">{r.evidence_text || 'Tanpa keterangan'}</div>
                  <div className="flex items-center justify-between text-[10px] text-[#7A7185] pt-1">
                    <span>Pelapor: {r.reporter_display_name}</span>
                    <span>Status: <strong className="text-white">{r.status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#7A7185] italic">Pengguna ini belum pernah dilaporkan.</p>
          )}
        </div>

        {/* Reports Filed By User */}
        <div className="bg-[#171420] border border-[#2B2438] rounded-2xl p-5 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Laporan yang Dibuat Oleh Pengguna Ini ({reportsFiled?.length || 0})
          </span>

          {reportsFiled && reportsFiled.length > 0 ? (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {reportsFiled.map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white">{r.report_code}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {r.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#7A7185]">
                    <span>Target: {r.reported_display_name}</span>
                    <span>Status: <strong className="text-white">{r.status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#7A7185] italic">Pengguna ini belum pernah membuat laporan.</p>
          )}
        </div>
      </div>

      {/* SECTION 4: PREMIUM & PAYMENTS */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl p-5 space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#E8B4C8] flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Riwayat Pesanan Premium & Pembayaran ({premiumOrders?.length || 0})
        </span>

        {premiumOrders && premiumOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {premiumOrders.map((o: any) => (
              <div key={o.id} className="p-3.5 rounded-xl bg-black/30 border border-white/5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white">{o.public_order_id || o.id}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {o.verification_status || o.order_status}
                  </span>
                </div>
                <div className="text-white font-semibold">{o.plan_name || 'Paket Premium'} • Rp{o.amount?.toLocaleString('id-ID')}</div>
                <div className="text-[10px] text-[#7A7185]">
                  Dibuat: {new Date(o.created_at).toLocaleDateString('id-ID')} • Metode: {o.payment_method || 'QRIS via Chat'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#7A7185] italic">Tidak ada riwayat pembayaran premium.</p>
        )}
      </div>

      {/* SECTION 5: SUPPORT TICKETS */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl p-5 space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Tiket Bantuan Resmi NIVA ({tickets?.length || 0})
        </span>

        {tickets && tickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tickets.map((t: any) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-black/30 border border-white/5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white">{t.id}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    {t.status}
                  </span>
                </div>
                <div className="font-semibold text-white truncate">{t.subject}</div>
                <div className="flex items-center justify-between text-[10px] text-[#7A7185]">
                  <span>Prioritas: {t.priority}</span>
                  <Link
                    href={`/app-admin/support?search=${t.id}`}
                    className="text-[#8A5A9A] hover:text-white flex items-center gap-1 font-semibold"
                  >
                    Buka Tiket →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#7A7185] italic">Tidak ada tiket bantuan yang diajukan pengguna ini.</p>
        )}
      </div>

      {/* SECTION 6: AUDIT TRAIL */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl p-5 space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9D93A8] flex items-center gap-2">
          <Lock className="w-4 h-4" /> Jejak Audit Administratif Terkait Akun Ini ({audits?.length || 0})
        </span>

        {audits && audits.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {audits.map((a: any) => (
              <div key={a.id} className="p-2.5 rounded-lg bg-black/25 border border-white/5 text-xs flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-purple-300 font-mono">
                      {a.action}
                    </span>
                    <span className="text-[#9D93A8] text-[11px] truncate max-w-sm">{a.details}</span>
                  </div>
                  <div className="text-[10px] text-[#7A7185]">
                    Actor: {a.actor_id} ({a.actor_role})
                  </div>
                </div>
                <span className="text-[10px] text-[#7A7185] whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#7A7185] italic">Tidak ada tindakan administratif tercatat untuk pengguna ini.</p>
        )}
      </div>
    </div>
  );
}
