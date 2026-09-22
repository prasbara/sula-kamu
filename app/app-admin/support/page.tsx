'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Clock, 
  Send, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Search, 
  ShieldAlert,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export default function AdminSupportPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchQueue = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());

    fetch(`/api/admin/support?${params.toString()}`)
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
  }, [statusFilter, categoryFilter]);

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

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedTicketId) return;
    await fetch(`/api/admin/support/${selectedTicketId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: newPriority }),
    });
    fetchTicket(selectedTicketId);
    fetchQueue();
  };

  const handleAssignToMe = async () => {
    if (!selectedTicketId) return;
    await fetch(`/api/admin/support/${selectedTicketId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    fetchTicket(selectedTicketId);
    fetchQueue();
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'PREMIUM':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'SAFETY_REPORT':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'PAYMENT':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'ADVERTISING':
      case 'PARTNERSHIP':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'STUDENT_VERIFICATION':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
      case 'DATA_DELETION':
      case 'PRIVACY':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
      default:
        return 'bg-white/5 text-slate-300 border-white/10';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/20 text-red-300 font-black border-red-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/30';
      case 'NORMAL':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const isClosed = ticketDetails?.ticket?.status === 'CLOSED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <span>Pusat Bantuan & Tiket (FIFO + Keamanan)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#5B3A6D]/40 text-[#E8B4C8] border border-[#5B3A6D]/60 font-mono">
              Production Support
            </span>
          </h1>
          <p className="text-xs text-[#9D93A8] mt-1">
            Layanan live chat support resmi antara pengguna dan tim Admin NIVA secara terisolasi per tiket (FIFO berprioritas).
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-[#5B3A6D] text-white'
                  : 'bg-[#171420] text-[#9D93A8] hover:text-white border border-[#2B2438]'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills & Search Form */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-[#9D93A8] uppercase tracking-wider mr-1">Kategori:</span>
          {[
            { key: 'ALL', label: 'Semua Kategori' },
            { key: 'PREMIUM', label: '⭐ Premium' },
            { key: 'SAFETY_REPORT', label: '🛡️ Keamanan' },
            { key: 'PAYMENT', label: '💳 Pembayaran' },
            { key: 'ADVERTISING', label: '📢 Kemitraan' },
            { key: 'STUDENT_VERIFICATION', label: '🎓 KTM' },
            { key: 'TECHNICAL', label: '🔧 Teknis' },
            { key: 'GENERAL', label: 'Umum' },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap border ${
                categoryFilter === c.key
                  ? 'bg-white/15 text-white border-white/30'
                  : 'bg-[#171420] text-[#9D93A8] hover:text-white border-[#2B2438]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchQueue();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9D93A8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Ticket ID atau subjek..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#171420] border border-[#2B2438] rounded-xl text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A] w-56"
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: FIFO Queue */}
        <div className="lg:col-span-4 bg-[#171420] border border-[#2B2438] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9D93A8]">
              Antrean Tiket ({queue.length})
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">FIFO Server-Side</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#9D93A8]">Memuat antrean tiket...</div>
          ) : queue.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#9D93A8]">Tidak ada tiket pada kriteria ini.</div>
          ) : (
            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {queue.map((item, idx) => {
                const isSelected = selectedTicketId === item.ticket_id;
                return (
                  <div
                    key={item.ticket_id}
                    onClick={() => setSelectedTicketId(item.ticket_id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                      isSelected
                        ? 'bg-[#2B2438] border-[#8A5A9A]'
                        : 'bg-[#0F0D13] border-[#2B2438] hover:border-[#8A5A9A]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-white text-[11px] truncate">
                        #{idx + 1} • {item.ticket_id}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getPriorityBadge(item.priority)}`}>
                          {item.priority}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadge(item.category || item.type)}`}>
                        {item.category || item.type}
                      </span>
                      <span className="text-[11px] font-semibold text-white truncate max-w-[150px]">
                        {item.display_name}
                      </span>
                      <span className="text-[10px] text-[#7A7185] ml-auto">
                        {item.message_count || 1} pesan
                      </span>
                    </div>

                    <div className="text-white font-medium text-[11px] truncate">
                      {item.subject}
                    </div>

                    <div className="text-[11px] text-[#9D93A8] line-clamp-1 bg-black/20 p-1.5 rounded-lg border border-white/5">
                      {item.last_message || 'Belum ada percakapan'}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#7A7185] pt-0.5">
                      <span>Masuk: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {item.assigned_admin_id && (
                        <span className="text-purple-300 font-mono">Assigned: {item.assigned_admin_id}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Conversation Thread */}
        <div className="lg:col-span-8 bg-[#171420] border border-[#2B2438] rounded-2xl p-6 space-y-6">
          {!ticketDetails ? (
            <div className="py-24 text-center text-xs text-[#9D93A8]">
              Pilih tiket dari antrean di samping kiri untuk membuka percakapan dan membalas satu per satu.
            </div>
          ) : (
            <>
              {/* Ticket Meta Header */}
              <div className="pb-4 border-b border-[#2B2438] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-white font-mono">
                        {ticketDetails.ticket.id}
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBadge(ticketDetails.ticket.category || ticketDetails.ticket.type)}`}>
                        {ticketDetails.ticket.category || ticketDetails.ticket.type}
                      </span>

                      {/* Priority Selector Dropdown */}
                      <select
                        value={ticketDetails.ticket.priority}
                        onChange={(e) => handlePriorityChange(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-[10px] font-bold text-white focus:outline-none"
                      >
                        <option value="LOW">Prioritas: LOW</option>
                        <option value="NORMAL">Prioritas: NORMAL</option>
                        <option value="HIGH">Prioritas: HIGH</option>
                        <option value="URGENT">Prioritas: URGENT</option>
                      </select>

                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        {ticketDetails.ticket.status}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-white mt-1">
                      {ticketDetails.ticket.subject}
                    </div>

                    <div className="text-xs text-[#C8BED4] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>
                        Kontak: <strong className="text-white">{ticketDetails.ticket.contact_name || ticketDetails.userProfile?.display_name || 'Pengguna NIVA'}</strong>
                      </span>
                      {ticketDetails.ticket.contact_email && (
                        <span className="text-[#9D93A8]">({ticketDetails.ticket.contact_email})</span>
                      )}
                      {ticketDetails.ticket.assigned_admin_id ? (
                        <span className="text-purple-300 font-mono">
                          • Assigned: {ticketDetails.ticket.assigned_admin_id}
                        </span>
                      ) : (
                        <button
                          onClick={handleAssignToMe}
                          className="text-[10px] text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3" /> Tangani Tiket Ini
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Switcher Buttons */}
                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                    <button
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 text-xs font-semibold"
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange('WAITING_FOR_USER')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-semibold"
                    >
                      Menunggu User
                    </button>
                    <button
                      onClick={() => handleStatusChange('RESOLVED')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-semibold"
                    >
                      Resolved
                    </button>
                    <button
                      onClick={() => handleStatusChange('CLOSED')}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold"
                    >
                      Tutup Tiket
                    </button>
                  </div>
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
                        <span className="text-[10px] text-[#9D93A8] px-3 py-1 rounded-full bg-[#0F0D13] border border-white/5">
                          ℹ️ {m.body}
                        </span>
                      </div>
                    );
                  }

                  if (isNote) {
                    return (
                      <div key={m.id} className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                        <div className="text-[10px] font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                          <Lock className="w-3 h-3" />
                          <span>Catatan Internal Admin ({m.sender_name}) — Rahasia</span>
                        </div>
                        <div className="whitespace-pre-wrap">{m.body}</div>
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
                        <div className="text-[10px] opacity-75 font-bold flex items-center gap-1">
                          {isUser ? '👤 ' : '🛡️ Tim Admin: '}
                          {m.sender_name}
                        </div>
                        <div className="leading-relaxed whitespace-pre-wrap">{m.body}</div>
                        <div className="text-[9px] opacity-50 text-right">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box or Closed Banner */}
              {isClosed ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
                  <span>Tiket ini telah ditutup (CLOSED) dan tidak menerima pesan baru.</span>
                  <button
                    onClick={() => handleStatusChange('OPEN')}
                    className="text-xs font-semibold text-white underline hover:no-underline"
                  >
                    Buka Kembali Tiket
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-[#2B2438]">
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-[#C8BED4]">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded accent-[#8A5A9A]"
                      />
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Catatan Internal (Hanya terlihat oleh staf admin)</span>
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      rows={3}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={
                        isInternal
                          ? 'Tulis catatan rahasia internal tim admin mengenai tiket ini...'
                          : 'Ketik balasan resmi kepada pengguna tiket ini...'
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
