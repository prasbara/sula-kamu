'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Send, 
  Ticket, 
  ShieldCheck, 
  ArrowLeft, 
  AlertCircle, 
  RefreshCw,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  escalationSuggested?: boolean;
  suggestedCategory?: string;
}

const QUICK_PROMPTS = [
  'Bagaimana cara kerja Stranger Chat?',
  'Kenapa NIVA mewajibkan lokasi di Semarang?',
  'Apa yang harus dilakukan jika ada yang meminta uang?',
  'Apakah video Stranger Cam direkam?',
  'Bagaimana hak privasi saya menurut UU PDP?',
];

export default function AISupportPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Halo! Saya NIVA AI Assistant. Ada yang bisa saya bantu seputar cara penggunaan Stranger Chat, Stranger Cam, persyaratan lokasi Semarang, pedoman keselamatan, atau kebijakan privasi NIVA?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    const newHistory = [...messages, { role: 'user' as const, content: textToSend }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const res = await fetch('/api/support/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: newHistory.slice(-4),
        }),
      });

      const data = await res.json();
      if (res.ok && data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            escalationSuggested: data.escalationSuggested,
            suggestedCategory: data.suggestedCategory,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.error || 'NIVA AI Assistant sedang tidak dapat memproses pertanyaan saat ini. Anda dapat langsung membuat tiket bantuan resmi di Pusat Bantuan kami.',
            escalationSuggested: true,
            suggestedCategory: 'GENERAL',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Terjadi kendala koneksi ke server AI. Anda dapat langsung mengajukan tiket bantuan kepada tim NIVA melalui Pusat Bantuan.',
          escalationSuggested: true,
          suggestedCategory: 'GENERAL',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0D13] text-[#F3EDF7] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/support"
            className="text-xs text-[#9D93A8] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Pusat Bantuan</span>
          </Link>
          <div className="text-[11px] px-2.5 py-1 rounded-full bg-[#5B3A6D]/30 border border-[#5B3A6D]/60 text-[#E8B4C8] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>AI First-Line Assistant</span>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-[#171420] border border-[#2B2438] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#1D1929] border-b border-[#2B2438] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5B3A6D] to-[#8A5A9A] flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>NIVA AI Assistant</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Online
                  </span>
                </h1>
                <p className="text-[10px] text-[#9D93A8]">
                  Kecerdasan buatan lini pertama untuk panduan fitur, keselamatan, dan privasi NIVA Semarang.
                </p>
              </div>
            </div>

            <Link
              href="/support/new"
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5 text-purple-300" />
              <span>Buat Tiket Admin</span>
            </Link>
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-3 bg-[#14111C] border-b border-[#2B2438] flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
            <span className="text-[10px] text-[#9D93A8] font-bold uppercase tracking-wider whitespace-nowrap pl-1">
              Topik Populer:
            </span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-3 py-1 rounded-full bg-[#0F0D13] hover:bg-[#2B2438] text-[#C8BED4] hover:text-white border border-[#2B2438] text-[11px] whitespace-nowrap transition-all disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Thread */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs space-y-2 shadow-md ${
                      isUser
                        ? 'bg-gradient-to-r from-[#5B3A6D] to-[#73448A] text-white rounded-br-none'
                        : 'bg-[#0F0D13] text-[#F3EDF7] border border-[#2B2438] rounded-bl-none'
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-75 flex items-center gap-1">
                      {isUser ? '👤 Anda' : '🤖 NIVA AI Assistant'}
                    </div>
                    <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>

                    {/* Human Escalation Suggestion Banner */}
                    {m.escalationSuggested && (
                      <div className="mt-3 p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-200 space-y-2">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-amber-300" />
                          <span>Butuh penanganan langsung oleh tim manusia NIVA?</span>
                        </div>
                        <p className="text-[10px] text-[#C8BED4]">
                          Permasalahan ini membutuhkan verifikasi atau tindakan staf admin NIVA.
                        </p>
                        <Link
                          href={`/support/new?category=${encodeURIComponent(m.suggestedCategory || 'GENERAL')}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white font-semibold text-[10px] hover:opacity-95 transition-all shadow"
                        >
                          <span>Buat Tiket {m.suggestedCategory || 'Bantuan'}</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#9D93A8] p-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#8A5A9A]" />
                <span>NIVA AI Assistant sedang mengetik jawaban...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 sm:p-4 bg-[#171420] border-t border-[#2B2438] space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanyakan sesuatu tentang NIVA, Stranger Chat, panduan keamanan..."
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-xs text-white placeholder-[#6E647D] focus:outline-none focus:border-[#8A5A9A] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-5 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 disabled:opacity-50 transition-all shadow-lg"
              >
                <span>Kirim</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="text-[10px] text-center text-[#6E647D]">
              Jawaban AI dihasilkan secara otomatis berdasarkan dokumen panduan resmi NIVA. Untuk masalah akun atau laporan mendesak, gunakan Pusat Tiket.
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
