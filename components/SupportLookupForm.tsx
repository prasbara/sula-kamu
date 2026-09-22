'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SupportLookupForm() {
  const router = useRouter();
  const [ticketId, setTicketId] = useState('');
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = ticketId.trim();
    const cleanToken = token.trim();

    if (cleanId && cleanToken) {
      router.push(`/support/ticket/${encodeURIComponent(cleanId)}?token=${encodeURIComponent(cleanToken)}`);
    } else if (cleanId) {
      router.push(`/support/ticket/${encodeURIComponent(cleanId)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
      <div className="sm:col-span-5">
        <input
          type="text"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="ID Tiket (misal: NIVA-741920)"
          required
          className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A]"
        />
      </div>
      <div className="sm:col-span-5">
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Token Akses 64-karakter (opsional jika login)"
          className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A] font-mono"
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="w-full h-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-90 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Buka</span>
        </button>
      </div>
    </form>
  );
}
