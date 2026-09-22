'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Ticket, 
  Send, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Lock, 
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface TicketPayload {
  ticket: {
    id: string;
    category: string;
    type: string;
    subject: string;
    status: string;
    priority: string;
    contact_name: string | null;
    created_at: string;
  };
  messages: Array<{
    id: string;
    sender_type: 'USER' | 'ADMIN' | 'SYSTEM';
    sender_name: string;
    body: string;
    created_at: string;
  }>;
  queuePosition: number;
}

export default function UserTicketChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticketId = params.id as string;
  const token = searchParams.get('token') || '';

  const [data, setData] = useState<TicketPayload | null>(null);
  const [tokenInput, setTokenInput] = useState(token);
  const [activeToken, setActiveToken] = useState(token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    if (!ticketId) return;
    try {
      const url = activeToken 
        ? `/api/support/ticket?ticketId=${encodeURIComponent(ticketId)}&token=${encodeURIComponent(activeToken)}`
        : `/api/support/ticket?ticketId=${encodeURIComponent(ticketId)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        const errJson = await res.json();
        setError(errJson.error || 'Gagal memuat tiket.');
      }
    } catch {
      setError('Kendala koneksi internet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 6000); // Poll updates every 6s
    return () => clearInterval(interval);
  }, [ticketId, activeToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          body: replyText.trim(),
          token: activeToken,
        }),
      });

      if (res.ok) {
        setReplyText('');
        fetchTicket();
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Gagal mengirim balasan.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0D13] text-[#F3EDF7] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Link
            href="/support"
            className="text-xs text-[#9D93A8] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Pusat Bantuan</span>
          </Link>
          <div className="text-[11px] text-[#9D93A8] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sinkronisasi Langsung Aktif</span>
          </div>
        </div>

        {/* Token Gate if unauthorized */}
        {!activeToken && error && (
          <div className="p-6 rounded-3xl bg-[#171420] border border-[#2B2438] space-y-4 max-w-md mx-auto text-center">
            <Lock className="w-8 h-8 text-amber-400 mx-auto" />
            <h2 className="text-base font-bold text-white">Masukkan Token Akses Tiket</h2>
            <p className="text-xs text-[#C8BED4]">
              Tiket ini dilindungi secara privasi. Masukkan token akses yang Anda peroleh saat pertama kali membuat tiket.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveToken(tokenInput.trim());
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Token Akses Tiket (64 karakter)"
                className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A]"
              />
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#5B3A6D] text-white font-semibold text-xs hover:opacity-90 transition-all"
              >
                Buka Tiket
              </button>
            </form>
          </div>
        )}

        {loading && !data ? (
          <div className="py-24 text-center text-xs text-[#9D93A8]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8A5A9A]" />
            <span>Memuat data tiket dan ruang percakapan...</span>
          </div>
        ) : data ? (
          <div className="bg-[#171420] border border-[#2B2438] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[750px]">
            {/* Header Meta */}
            <div className="p-5 sm:p-6 bg-[#1D1929] border-b border-[#2B2438] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-white">{data.ticket.id}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5B3A6D]/40 text-[#E8B4C8] border border-[#5B3A6D]/60">
                    {data.ticket.category || data.ticket.type}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                    Status: {data.ticket.status}
                  </span>
                  {data.queuePosition > 0 && (
                    <span className="text-[10px] text-emerald-400 font-medium">
                      Posisi Antrean: #{data.queuePosition}
                    </span>
                  )}
                </div>
                <h1 className="text-base font-bold text-white tracking-tight">
                  {data.ticket.subject}
                </h1>
                <div className="text-[11px] text-[#9D93A8]">
                  Dibuat pada: {new Date(data.ticket.created_at).toLocaleString('id-ID')}
                </div>
              </div>

              <div className="text-xs text-right hidden sm:block">
                <div className="text-[10px] text-[#9D93A8]">Saluran Resmi</div>
                <div className="font-bold text-white">NIVA Admin Helpdesk</div>
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {data.messages.map((m) => {
                const isUser = m.sender_type === 'USER';
                const isSystem = m.sender_type === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div key={m.id} className="text-center py-2">
                      <span className="text-[11px] text-[#9D93A8] px-3.5 py-1.5 rounded-full bg-[#0F0D13] border border-white/5 inline-block">
                        ℹ️ {m.body}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs space-y-1.5 ${
                        isUser
                          ? 'bg-gradient-to-r from-[#5B3A6D] to-[#73448A] text-white rounded-br-none shadow-md'
                          : 'bg-[#0F0D13] text-[#F3EDF7] border border-[#2B2438] rounded-bl-none shadow-md'
                      }`}
                    >
                      <div className="text-[10px] font-bold opacity-75 flex items-center gap-1">
                        {isUser ? '👤 Anda' : '🛡️ Staf Admin NIVA'}
                      </div>
                      <div className="leading-relaxed whitespace-pre-wrap">{m.body}</div>
                      <div className="text-[9px] opacity-60 text-right">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Box */}
            <div className="p-4 sm:p-5 bg-[#171420] border-t border-[#2B2438]">
              {data.ticket.status === 'CLOSED' ? (
                <div className="text-center py-3 text-xs text-[#9D93A8]">
                  Tiket ini telah ditutup oleh staf admin. Jika Anda masih memerlukan bantuan lanjutan, silakan ajukan tiket baru.
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tulis pesan atau pertanyaan Anda kepada tim admin..."
                    className="flex-1 p-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A]"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className="px-5 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 disabled:opacity-50 transition-all shadow-lg"
                  >
                    <span>Kirim</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
