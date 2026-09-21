'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Clock, 
  Send, 
  ShieldCheck, 
  Camera, 
  CreditCard, 
  CheckCircle2, 
  XCircle,
  Lock,
  UserCheck
} from 'lucide-react';

export default function AdminSupportPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchQueue = () => {
    fetch(`/api/admin/support?status=${encodeURIComponent(statusFilter)}`)
      .then((res) => res.json())
      .then((data) => {
        setQueue(data.queue || []);
        setIsLoading(false);
        if (!selectedTicketId && data.queue?.length > 0) {
          setSelectedTicketId(data.queue[0].ticket_id);
        }
      })
      .catch(() => setIsLoading(false));
  };

  const fetchTicket = (id: string) => {
    fetch(`/api/admin/support/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.details) setTicketDetails(data.details);
      });
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicket(selectedTicketId);
    }
  }, [selectedTicketId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyBody.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody.trim(), isInternal }),
      });
      if (res.ok) {
        setReplyBody('');
        fetchTicket(selectedTicketId);
        fetchQueue();
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicketId) return;
    await fetch(`/api/admin/support/${selectedTicketId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTicket(selectedTicketId);
    fetchQueue();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Premium Support Queue (FIFO)
          </h1>
          <p className="text-xs text-[#9D93A8] mt-1">
            Proses tiket secara berurutan sesuai waktu kedatangan pengguna (FIFO).
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          {['ALL', 'OPEN', 'WAITING', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === s
                  ? 'bg-[#5B3A6D] text-white'
                  : 'bg-[#171420] text-[#9D93A8] hover:text-white border border-[#2B2438]'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: FIFO Queue */}
        <div className="lg:col-span-4 bg-[#171420] border border-[#2B2438] rounded-2xl p-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#9D93A8] px-1">
            Antrean Tiket ({queue.length})
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#9D93A8]">Memuat antrean...</div>
          ) : queue.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#9D93A8]">Tidak ada tiket aktif.</div>
          ) : (
            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {queue.map((item, idx) => {
                const isSelected = selectedTicketId === item.ticket_id;
                return (
                  <div
                    key={item.ticket_id}
                    onClick={() => setSelectedTicketId(item.ticket_id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-[#2B2438] border-[#8A5A9A]'
                        : 'bg-[#0F0D13] border-[#2B2438] hover:border-[#8A5A9A]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-[11px]">
                        #{idx + 1} • {item.ticket_id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">
                        {item.status}
                      </span>
                    </div>
                    <div className="font-semibold text-white truncate">
                      {item.display_name || 'Pengguna'} ({item.institution_short_name || 'Kampus'})
                    </div>
                    <div className="text-[11px] text-[#9D93A8] line-clamp-1">
                      {item.last_message || 'Belum ada pesan'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Conversation */}
        <div className="lg:col-span-8 bg-[#171420] border border-[#2B2438] rounded-2xl p-6 space-y-6">
          {!ticketDetails ? (
            <div className="py-24 text-center text-xs text-[#9D93A8]">
              Pilih tiket dari antrean FIFO di samping kiri untuk membaca dan membalas pesan.
            </div>
          ) : (
            <>
              {/* Ticket Meta Header */}
              <div className="pb-4 border-b border-[#2B2438] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white font-mono">
                      {ticketDetails.ticket.id}
                    </h2>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                      {ticketDetails.ticket.status}
                    </span>
                    <span className="text-[10px] font-medium text-[#9D93A8]">
                      Posisi Antrean: #{ticketDetails.queuePosition}
                    </span>
                  </div>
                  <div className="text-xs text-[#C8BED4] mt-1">
                    {ticketDetails.userProfile?.display_name || 'Mahasiswa'} •{' '}
                    {ticketDetails.userProfile?.institution_name || 'Kampus'} •{' '}
                    Status: <span className="font-bold text-sky-400">{ticketDetails.userProfile?.verification_status}</span> •{' '}
                    Paket: <span className="font-bold text-[#E8B4C8]">{ticketDetails.userProfile?.subscription_status}</span>
                  </div>
                </div>

                {/* Status Switcher Buttons */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20"
                  >
                    Tangani
                  </button>
                  <button
                    onClick={() => handleStatusChange('RESOLVED')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                  >
                    Selesai
                  </button>
                  <button
                    onClick={() => handleStatusChange('CLOSED')}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3 min-h-[300px] max-h-[420px] overflow-y-auto pr-2">
                {ticketDetails.messages.map((m: any) => {
                  const isUser = m.sender_type === 'USER';
                  const isSystem = m.sender_type === 'SYSTEM';
                  const isNote = m.is_internal === 1;

                  if (isSystem) {
                    return (
                      <div key={m.id} className="text-center py-2">
                        <span className="text-[10px] text-[#9D93A8] px-3 py-1 rounded-full bg-[#0F0D13]">
                          ℹ️ {m.body}
                        </span>
                      </div>
                    );
                  }

                  if (isNote) {
                    return (
                      <div key={m.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                        <div className="text-[10px] font-bold text-amber-400 mb-1">
                          🔒 Catatan Internal Moderator ({m.sender_name})
                        </div>
                        {m.body}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 text-xs space-y-1 ${
                          isUser
                            ? 'bg-[#0F0D13] text-[#F3EDF7] border border-[#2B2438]'
                            : 'bg-[#5B3A6D] text-white'
                        }`}
                      >
                        <div className="text-[10px] opacity-70 font-semibold">{m.sender_name}</div>
                        <div className="leading-relaxed whitespace-pre-wrap">{m.body}</div>
                        <div className="text-[9px] opacity-50 text-right">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-[#2B2438]">
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-[#C8BED4]">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded accent-[#8A5A9A]"
                    />
                    <span>Tandai sebagai Catatan Internal (Tidak terlihat oleh pengguna)</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={3}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={
                      isInternal
                        ? 'Tulis catatan rahasia internal tim moderator...'
                        : 'Ketik balasan resmi kepada pengguna...'
                    }
                    className="flex-1 p-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A]"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !replyBody.trim()}
                    className="px-5 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 disabled:opacity-50 transition-all"
                  >
                    <span>Kirim</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
