'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, ShieldCheck, Camera, CreditCard, ChevronRight } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = (q = '', filter = 'ALL') => {
    setIsLoading(true);
    fetch(`/api/admin/users?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchUsers(searchQuery, selectedFilter);
  }, [selectedFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery, selectedFilter);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            All Active Users
          </h1>
          <p className="text-xs text-[#9D93A8] mt-1">
            Central operational user directory with privacy protection.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none text-xs">
          {['ALL', 'FREE', 'PREMIUM', 'PHOTO_ONLY', 'KTM_VERIFIED', 'PAYMENT_PENDING', 'VERIFICATION_PENDING', 'SUSPENDED'].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                selectedFilter === f
                  ? 'bg-[#5B3A6D] text-white'
                  : 'bg-[#171420] text-[#9D93A8] hover:text-white border border-[#2B2438]'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#685F75] absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan User ID, nama display, atau nama kampus..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171420] border border-[#2B2438] text-sm text-white placeholder-[#685F75] focus:outline-none focus:border-[#8A5A9A]"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[#2B2438] hover:bg-[#3B324D] text-xs font-semibold text-white transition-colors"
        >
          Cari
        </button>
      </form>

      {/* Users Table */}
      <div className="bg-[#171420] border border-[#2B2438] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#9D93A8]">Memuat daftar pengguna...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#9D93A8]">Tidak ada pengguna yang sesuai filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F0D13]/60 border-b border-[#2B2438] text-[#9D93A8] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Kampus</th>
                  <th className="py-3 px-4">Verifikasi</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Daily Likes</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B2438]/50">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{u.display_name || 'Tanpa Profil'}</span>
                        <span className={`inline-block w-2 h-2 rounded-full ${u.online_status === 'ONLINE' ? 'bg-emerald-400' : 'bg-zinc-600'}`} title={u.online_status || 'OFFLINE'} />
                      </div>
                      <div className="text-[11px] text-sky-400 font-medium">
                        {u.telegram_username ? `@${u.telegram_username}` : (u.telegram_id ? `TG ID: ${u.telegram_id}` : '-')}
                      </div>
                      <div className="font-mono text-[10px] text-[#6E647D]">{u.user_id.slice(0, 13)}...</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#C8BED4]">
                      {u.institution_short_name || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.verification_status === 'KTM_VERIFIED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" /> Student (KTM)
                        </span>
                      )}
                      {u.verification_status === 'PHOTO_VERIFIED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <Camera className="w-3 h-3" /> Photo Only
                        </span>
                      )}
                      {u.verification_status === 'UNVERIFIED' && (
                        <span className="text-[10px] text-[#6E647D] font-medium">Unverified</span>
                      )}
                      {(u.verification_status === 'PHOTO_PENDING' || u.verification_status === 'KTM_PENDING') && (
                        <span className="text-[10px] font-bold text-amber-400">PENDING</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.subscription_status === 'PREMIUM_ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8B4C8]/10 text-[#E8B4C8] border border-[#E8B4C8]/30">
                          <CreditCard className="w-3 h-3" /> Premium (50 likes)
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#6E647D]">
                          Free ({u.verification_status === 'KTM_VERIFIED' ? '30' : '10'} likes)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#C8BED4]">
                      {u.daily_likes_used} likes
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.account_status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {u.account_status}
                        </span>
                        {u.bot_state && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            u.bot_state === 'CHATTING'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : u.bot_state === 'SEARCHING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {u.bot_state}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/app-admin/users/${u.user_id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A5A9A] hover:text-[#E8B4C8]"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
