'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Send, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface TicketData {
  ticket: {
    id: string;
    user_id: string;
    type: string;
    status: string;
    priority: string;
    queue_position: number;
    created_at: string;
  };
  user: {
    display_name: string;
    institution_name: string;
    verification_status: string;
    subscription_status: string;
    discovery_count: number;
    discovery_limit: number;
    premium_expires_at: string | null;
  };
  messages: Array<{
    id: string;
    sender_type: 'USER' | 'ADMIN' | 'SYSTEM';
    body: string;
    created_at: string;
  }>;
}

export default function UserPremiumSupportPage() {
  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const res = await fetch('/api/support/ticket');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else if (res.status === 401) {
        setError('Sesi dukungan tidak ditemukan atau sudah berakhir. Silakan gunakan perintah /premium di Telegram NIVA untuk tautan akses baru.');
      } else {
        const err = await res.json();
        setError(err.error || 'Gagal memuat tiket bantuan.');
      }
    } catch (e) {
      setError('Terjadi kendala jaringan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 10000); // Polling update every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });

      if (res.ok) {
        setMessageText('');
        fetchTicket();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal mengirim pesan.');
      }
    } catch (e) {
      alert('Kendala jaringan saat mengirim pesan.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Menyiapkan sesi bantuan NIVA Premium...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold">Akses Dukungan Terbatas</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <div className="pt-4">
            <a
              href="https://t.me/nivasocialmakingbot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium text-sm hover:opacity-90 transition"
            >
              Buka Telegram NIVA Bot
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { ticket, user, messages } = data;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'OPEN':
      case 'WAITING':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">MENUNGGU ADMIN</span>;
      case 'IN_PROGRESS':
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">SEDANG DILAYANI</span>;
      case 'WAITING_FOR_USER':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">MENUNGGU RESPON ANDA</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">SELESAI</span>;
      default:
        return <span className="bg-slate-500/20 text-slate-300 border border-slate-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">{st}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-500/20">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">NIVA Premium Support</h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-rose-300 font-semibold">
                  #{ticket.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pusat konsultasi & bantuan langganan resmi mahasiswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/premium"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold hover:opacity-90 shadow-lg shadow-rose-500/20 transition"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Buka Pembayaran
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Status & Account Overview */}
        <aside className="space-y-4">
          {/* Queue & Status Card */}
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-xs text-slate-400 font-medium">Status Tiket</span>
              {getStatusBadge(ticket.status)}
            </div>

            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">
                Posisi Antrean FIFO
              </span>
              <span className="text-2xl font-black text-rose-400 tracking-tight mt-0.5 block">
                {ticket.queue_position > 0 ? `#${ticket.queue_position}` : 'Aktif Dilayani'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Admin merespon berdasarkan urutan tiket tertua
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Status Akun:</span>
                <span className="font-semibold text-white">{user.subscription_status}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Verifikasi:</span>
                <span className="font-semibold text-white">{user.verification_status}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Discovery Hari Ini:</span>
                <span className="font-mono text-slate-200">
                  {user.discovery_count} / {user.discovery_limit}
                </span>
              </div>
              {user.premium_expires_at && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Masa Aktif Premium:</span>
                  <span className="text-emerald-400 font-medium">
                    {new Date(user.premium_expires_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Notice */}
          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 text-xs text-rose-200/90 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-300">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              Keamanan Terjamin
            </div>
            <p className="leading-relaxed text-slate-400">
              Sesi ini aman dan terisolasi. Admin resmi NIVA tidak akan pernah meminta kata sandi akun atau kode rahasia perbankan Anda.
            </p>
          </div>
        </aside>

        {/* Right Side: Chat & Messaging Interface */}
        <section className="lg:col-span-2 bg-slate-900/70 border border-white/10 rounded-2xl flex flex-col h-[75vh] shadow-xl overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-200">Percakapan Layanan Pengguna</span>
            </div>
            <button
              onClick={fetchTicket}
              className="text-slate-400 hover:text-white transition p-1"
              title="Perbarui percakapan"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950/20 to-slate-950/50">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                Tiket berhasil dibuka. Silakan tuliskan pertanyaan atau kendala Anda di bawah.
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.sender_type === 'USER';
                const isSystem = m.sender_type === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div key={m.id} className="text-center my-2">
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[11px] text-slate-400 font-mono">
                        {m.body}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {isUser ? 'Anda' : 'Admin Support NIVA'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-tr-none shadow-md shadow-rose-950/40'
                          : 'bg-slate-800 border border-white/10 text-slate-200 rounded-tl-none shadow-md'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Tulis pesan atau pertanyaan untuk Admin..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                maxLength={500}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
              />
              <button
                type="submit"
                disabled={sending || !messageText.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1">
              <span>Maksimal 500 karakter. Dukungan anti-spam aktif.</span>
              <span>{messageText.length} / 500</span>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
