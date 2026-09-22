'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  SkipForward,
  Flag,
  ShieldBan,
  PhoneOff,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Lock,
  Eye,
  CheckCircle2,
  X,
  UserCheck,
  UserX,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';
import { StrangerChatMessage, RestrictionType, ModerationCategory } from '@/src/types/index';

type ChatStep =
  | 'IDLE'
  | 'AGE_GATE'
  | 'LOCATION_CHECK'
  | 'QUEUEING'
  | 'CONNECTED'
  | 'SKIPPING'
  | 'RESTRICTED'
  | 'ENDED'
  | 'ERROR';

const REPORT_CATEGORIES: { value: ModerationCategory; label: string; desc: string }[] = [
  { value: 'FINANCIAL_SCAM', label: 'Penipuan / Permintaan Uang (Scam)', desc: 'Minta transfer dana, pinjam uang, investasi cuan, atau slot gacor.' },
  { value: 'PHONE_NUMBER', label: 'Pertukaran Nomor Kontak', desc: 'Mencoba membagikan nomor telepon atau WhatsApp secara terlarang.' },
  { value: 'EXTERNAL_CONTACT', label: 'Pindah Kontak Luar', desc: 'Memaksa pindah ke Instagram, Telegram, Line, atau Discord.' },
  { value: 'CREDENTIAL_THEFT', label: 'Pencurian Akun / OTP', desc: 'Meminta password, PIN ATM, atau kode verifikasi WhatsApp/SMS.' },
  { value: 'DANGEROUS_CONTENT', label: 'Ancaman / Pelecehan / Pemerasan', desc: 'Mengancam menyebar data pribadi (doxxing), pemerasan foto, atau pelecehan berat.' },
  { value: 'PHISHING_URL', label: 'Tautan / Link Berbahaya', desc: 'Mengirimkan tautan eksternal atau link login palsu.' },
  { value: 'SPAM_FLOODING', label: 'Spam / Pesan Berulang', desc: 'Mengirimkan pesan terus menerus atau flood obrolan.' },
  { value: 'OTHER', label: 'Lainnya', desc: 'Pelanggaran etika dan kenyamanan komunitas NIVA lainnya.' },
];

export default function StrangerChatApp() {
  const [step, setStep] = useState<ChatStep>('IDLE');
  const [userId, setUserId] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('Stranger');
  const [is18Plus, setIs18Plus] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StrangerChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeStrikes, setActiveStrikes] = useState<number>(0);
  const [restrictionType, setRestrictionType] = useState<RestrictionType>('NONE');
  const [restrictionReason, setRestrictionReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>('');

  // Report modal state
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [selectedReportCategory, setSelectedReportCategory] = useState<ModerationCategory>('FINANCIAL_SCAM');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isReporting, setIsReporting] = useState<boolean>(false);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        let storedId = localStorage.getItem('niva_stranger_user_id');
        if (!storedId) {
          storedId = `user_${Math.random().toString(36).substring(2, 11)}`;
          localStorage.setItem('niva_stranger_user_id', storedId);
        }

        const res = await fetch(`/api/stranger-chat/auth?userId=${encodeURIComponent(storedId)}`);
        const data = await res.json();

        if (data.authenticated && data.user) {
          setUserId(data.user.id);
          setDisplayName(data.user.displayName || 'Stranger');
          setIs18Plus(Boolean(data.user.is18Plus));

          if (data.restriction) {
            setActiveStrikes(data.restriction.active_strikes || 0);
            setRestrictionType(data.restriction.restriction_type || 'NONE');
            if (data.restriction.isRestricted) {
              setRestrictionReason(data.restriction.reason);
              setStep('RESTRICTED');
              return;
            }
          }

          if (!data.user.is18Plus) {
            setStep('AGE_GATE');
          } else if (data.eligibility && !data.eligibility.eligible && data.eligibility.requiresLocation) {
            setStep('LOCATION_CHECK');
          } else {
            setStep('IDLE');
          }
        } else {
          setUserId(storedId);
          setStep('AGE_GATE');
        }
      } catch (err: any) {
        console.warn('Initial auth check notice:', err);
        setStep('IDLE');
      }
    };

    checkAuth();
  }, []);

  // Poll for messages and session updates when CONNECTED
  useEffect(() => {
    if (step !== 'CONNECTED' || !sessionId || !userId) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/stranger-chat/messages?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch (err) {
        // Silent poll error
      }
    };

    const checkSessionStatus = async () => {
      try {
        const res = await fetch(`/api/stranger-chat/session/status?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (data.restriction) {
          setActiveStrikes(data.restriction.active_strikes || 0);
          setRestrictionType(data.restriction.restriction_type || 'NONE');
          if (data.restriction.isRestricted) {
            setRestrictionReason(data.restriction.reason);
            setStep('RESTRICTED');
            return;
          }
        }

        if (!data.hasActiveSession || data.session?.status !== 'CONNECTED') {
          // Partner left or skipped
          setStatusNotice('Partner telah meninggalkan percakapan.');
          setStep('ENDED');
        }
      } catch (err) {
        // Silent status error
      }
    };

    // Initial fetch
    fetchMessages();

    pollIntervalRef.current = setInterval(() => {
      fetchMessages();
      checkSessionStatus();
    }, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [step, sessionId, userId]);

  // Handle Age Confirmation (18+)
  const handleConfirmAge = async () => {
    try {
      setErrorMessage('');
      const res = await fetch('/api/stranger-chat/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, confirmAge: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengonfirmasi usia.');

      setIs18Plus(true);
      if (data.eligibility && !data.eligibility.eligible && data.eligibility.requiresLocation) {
        setStep('LOCATION_CHECK');
      } else {
        setStep('IDLE');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Handle Semarang Location Confirmation
  const handleConfirmLocation = async () => {
    try {
      setErrorMessage('');
      const res = await fetch('/api/stranger-cam/location-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method: 'USER_CONFIRMATION' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengonfirmasi lokasi.');

      setStep('IDLE');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Enter Queue
  const handleStartChat = async () => {
    try {
      setErrorMessage('');
      setStatusNotice('');
      setStep('QUEUEING');

      const res = await fetch('/api/stranger-chat/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ENTER', userId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal masuk ke antrean obrolan.');
      }

      if (data.matched && data.sessionId) {
        setSessionId(data.sessionId);
        setMessages([]);
        setStep('CONNECTED');
      } else {
        // Start polling queue
        pollQueueUntilMatched();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setStep('ERROR');
    }
  };

  // Poll Queue
  const pollQueueUntilMatched = () => {
    const queueInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/stranger-chat/session/status?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();

        if (data.hasActiveSession && data.session && data.session.status === 'CONNECTED') {
          clearInterval(queueInterval);
          setSessionId(data.session.id);
          setMessages([]);
          setStep('CONNECTED');
        }
      } catch (err) {
        // Keep waiting
      }
    }, 2000);

    // Timeout after 45 seconds if no match
    setTimeout(() => {
      clearInterval(queueInterval);
      if (step === 'QUEUEING') {
        fetch('/api/stranger-chat/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'LEAVE', userId }),
        });
        setStatusNotice('Belum ada partner yang online saat ini. Coba lagi dalam beberapa detik.');
        setStep('IDLE');
      }
    }, 45000);
  };

  // Send Message with server moderation
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !sessionId || !userId || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/stranger-chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, senderId: userId, content }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim pesan.');
      }

      if (data.moderationResult && data.moderationResult.action === 'WARN') {
        setStatusNotice(data.moderationResult.warningMessage || 'Peringatan moderasi keamanan NIVA.');
      } else if (data.enforcementNotice) {
        setStatusNotice(data.enforcementNotice);
      }

      // Append locally for immediate feedback
      const localMsg: StrangerChatMessage = {
        id: data.messageId || `temp_${Date.now()}`,
        sessionId,
        senderId: userId,
        content: data.deliveredContent || content,
        isRedacted: Boolean(data.isRedacted),
        timestamp: new Date().toISOString(),
        systemWarning: data.moderationResult?.warningMessage,
      };
      setMessages((prev) => [...prev, localMsg]);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Skip Partner
  const handleSkip = async () => {
    if (!sessionId) return;
    setStep('SKIPPING');
    try {
      await fetch('/api/stranger-chat/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId, action: 'SKIP' }),
      });
      setSessionId(null);
      setMessages([]);
      handleStartChat(); // Re-enter queue automatically
    } catch (err: any) {
      setErrorMessage(err.message);
      setStep('IDLE');
    }
  };

  // Block Partner
  const handleBlock = async () => {
    if (!sessionId) return;
    if (!confirm('Apakah Anda yakin ingin memblokir partner ini secara permanen? Anda tidak akan pernah dipasangkan lagi.')) {
      return;
    }

    try {
      await fetch('/api/stranger-chat/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId, action: 'BLOCK' }),
      });
      setSessionId(null);
      setMessages([]);
      setStatusNotice('Partner telah diblokir secara permanen.');
      setStep('ENDED');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Submit Report
  const handleSubmitReport = async () => {
    if (!sessionId || isReporting) return;
    setIsReporting(true);
    try {
      const res = await fetch('/api/stranger-chat/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          action: 'REPORT',
          category: selectedReportCategory,
          details: reportDetails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengirim laporan.');

      setIsReportOpen(false);
      setSessionId(null);
      setMessages([]);
      setStatusNotice('Laporan keamanan Anda telah diterima. Partner otomatis diblokir dan obrolan dihentikan.');
      setStep('ENDED');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsReporting(false);
    }
  };

  // End Chat Gracefully
  const handleEndChat = async () => {
    if (sessionId) {
      await fetch('/api/stranger-chat/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId, action: 'END' }),
      });
    }
    setSessionId(null);
    setMessages([]);
    setStep('IDLE');
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-[#5B3A6D]/20 bg-gradient-to-b from-[#1E1B24] to-[#121016] text-white shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#5B3A6D]/20 bg-[#17141D]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8A5A9A] to-[#5B3A6D] flex items-center justify-center shadow-lg shadow-[#5B3A6D]/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">NIVA Stranger Chat</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#8A5A9A]/20 text-[#D8B4E2] border border-[#8A5A9A]/30">
                100% Anonymous
              </span>
            </div>
            <p className="text-xs text-[#A89EB0] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C48ED6]" /> Komunitas Semarang • Obrolan Teks Acak 1-on-1
            </p>
          </div>
        </div>

        {/* Safety & Strike Badge */}
        <div className="flex items-center gap-2">
          {activeStrikes === 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Status Aman</span>
            </div>
          ) : activeStrikes === 1 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Strike 1/3 (Peringatan)</span>
            </div>
          ) : activeStrikes === 2 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Strike 2/3 (Cooldown Aktif)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Akun Diblokir</span>
            </div>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="min-h-[480px] sm:min-h-[540px] flex flex-col justify-between">
        {/* State 1: AGE GATE */}
        {step === 'AGE_GATE' && (
          <div className="p-8 sm:p-12 text-center max-w-lg mx-auto space-y-6 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#5B3A6D]/20 border border-[#8A5A9A]/30 flex items-center justify-center mx-auto text-[#D8B4E2]">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Konfirmasi Usia (18+)</h3>
              <p className="text-sm text-[#A89EB0] leading-relaxed">
                NIVA Stranger Chat adalah ruang percakapan untuk mahasiswa dan komunitas dewasa di Semarang. Mohon konfirmasi bahwa Anda telah berusia 18 tahun ke atas.
              </p>
            </div>
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}
            <button
              onClick={handleConfirmAge}
              className="w-full py-3.5 px-6 rounded-xl font-semibold bg-gradient-to-r from-[#8A5A9A] to-[#5B3A6D] hover:from-[#9C6BAE] hover:to-[#6C4481] text-white shadow-lg shadow-[#5B3A6D]/25 transition-all transform active:scale-95"
            >
              Saya Berusia 18 Tahun ke Atas
            </button>
          </div>
        )}

        {/* State 2: LOCATION CHECK */}
        {step === 'LOCATION_CHECK' && (
          <div className="p-8 sm:p-12 text-center max-w-lg mx-auto space-y-6 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#5B3A6D]/20 border border-[#8A5A9A]/30 flex items-center justify-center mx-auto text-[#D8B4E2]">
              <MapPin className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Konfirmasi Wilayah Semarang</h3>
              <p className="text-sm text-[#A89EB0] leading-relaxed">
                Fitur ini eksklusif untuk komunitas di kawasan Kota Semarang. Privasi Anda terjaga: koordinat GPS presisi tidak pernah disimpan secara permanen di server kami.
              </p>
            </div>
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}
            <button
              onClick={handleConfirmLocation}
              className="w-full py-3.5 px-6 rounded-xl font-semibold bg-gradient-to-r from-[#8A5A9A] to-[#5B3A6D] hover:from-[#9C6BAE] hover:to-[#6C4481] text-white shadow-lg shadow-[#5B3A6D]/25 transition-all transform active:scale-95"
            >
              Saya Sedang di Wilayah Semarang
            </button>
          </div>
        )}

        {/* State 3: RESTRICTED */}
        {step === 'RESTRICTED' && (
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-6 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-rose-400">Akses Dibatasi</h3>
              <p className="text-sm text-[#A89EB0] leading-relaxed">
                {restrictionReason || 'Akses Anda ke Stranger Chat sedang dibatasi karena pelanggaran kebijakan keamanan NIVA.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-[#C5BDCC] text-left space-y-1.5">
              <div className="font-semibold text-white">Ketentuan Three-Strike:</div>
              <div>• Strike 1: Peringatan sistem</div>
              <div>• Strike 2: Pembatasan sementara 15 menit</div>
              <div>• Strike 3: Pemblokiran permanen dari obrolan anonim</div>
            </div>
          </div>
        )}

        {/* State 4: IDLE / READY TO START */}
        {step === 'IDLE' && (
          <div className="p-8 sm:p-14 text-center max-w-lg mx-auto space-y-6 my-auto">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#5B3A6D]/30 to-[#8A5A9A]/20 border border-[#8A5A9A]/30 flex items-center justify-center mx-auto text-[#D8B4E2] shadow-inner">
              <Sparkles className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Temukan Teman Baru</h3>
              <p className="text-sm sm:text-base text-[#A89EB0] leading-relaxed">
                Terhubung secara acak 1-on-1 dengan mahasiswa atau warga Semarang lainnya. Aman, tanpa akun, dan identitas Anda sepenuhnya dirahasiakan.
              </p>
            </div>

            {statusNotice && (
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-[#D8B4E2] flex items-center gap-2 text-left">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusNotice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleStartChat}
              className="w-full py-4 px-8 rounded-2xl font-bold text-base bg-gradient-to-r from-[#8A5A9A] via-[#704282] to-[#5B3A6D] hover:from-[#9C6BAE] hover:to-[#6C4481] text-white shadow-xl shadow-[#5B3A6D]/30 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Mulai Obrolan Baru</span>
            </button>

            <div className="grid grid-cols-3 gap-3 pt-4 text-left border-t border-white/5">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div className="text-xs font-semibold text-white">Anti-Scam</div>
                <div className="text-[10px] text-[#A89EB0]">Deteksi penipuan finansial & OTP</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <Lock className="w-4 h-4 text-purple-400" />
                <div className="text-xs font-semibold text-white">Privasi Penuh</div>
                <div className="text-[10px] text-[#A89EB0]">Kontak & nomor HP terlindungi</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <SkipForward className="w-4 h-4 text-sky-400" />
                <div className="text-xs font-semibold text-white">Kontrol Penuh</div>
                <div className="text-[10px] text-[#A89EB0]">Skip & Block instan kapan saja</div>
              </div>
            </div>
          </div>
        )}

        {/* State 5: QUEUEING */}
        {step === 'QUEUEING' && (
          <div className="p-8 sm:p-14 text-center max-w-md mx-auto space-y-6 my-auto">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#5B3A6D]/30 border-t-[#8A5A9A] animate-spin"></div>
              <MessageSquare className="w-8 h-8 text-[#D8B4E2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold">Mencari Partner...</h3>
              <p className="text-xs sm:text-sm text-[#A89EB0]">
                Menghubungkan dengan mahasiswa atau pengguna online lainnya di Semarang...
              </p>
            </div>
            <button
              onClick={() => {
                fetch('/api/stranger-chat/queue', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'LEAVE', userId }),
                });
                setStep('IDLE');
              }}
              className="py-2.5 px-6 rounded-xl text-xs font-semibold text-[#C5BDCC] hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Batalkan
            </button>
          </div>
        )}

        {/* State 6: CONNECTED / CHAT VIEW */}
        {step === 'CONNECTED' && (
          <div className="flex-1 flex flex-col h-[560px]">
            {/* Session Action Bar */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-[#141219] border-b border-white/5 text-xs text-[#A89EB0]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Terhubung dengan <strong className="text-white">Stranger</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5 text-[#D8B4E2]" />
                  <span>Skip</span>
                </button>
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-[#A89EB0] hover:text-amber-300 font-medium transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Lapor</span>
                </button>
                <button
                  onClick={handleBlock}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[#A89EB0] hover:text-rose-400 font-medium transition-colors"
                >
                  <ShieldBan className="w-3.5 h-3.5" />
                  <span>Blokir</span>
                </button>
                <button
                  onClick={handleEndChat}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A89EB0] hover:text-white transition-colors"
                  title="Akhiri Percakapan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Chat Safety Banner */}
            {statusNotice && (
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{statusNotice}</span>
                </div>
                <button onClick={() => setStatusNotice('')} className="p-0.5 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="text-center my-2">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] bg-white/5 text-[#A89EB0] border border-white/5">
                  Percakapan dimulai secara aman. Pertukaran nomor HP dan kontak luar dilarang.
                </span>
              </div>

              {messages.length === 0 && (
                <div className="text-center py-12 text-[#686071] text-xs space-y-1">
                  <p>Katakan halo untuk memulai obrolan!</p>
                  <p className="text-[10px]">Contoh: "Halo salam kenal, kuliah di mana?"</p>
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.senderId === userId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMe
                          ? msg.isRedacted
                            ? 'bg-amber-950/40 border border-amber-500/40 text-amber-200'
                            : 'bg-gradient-to-r from-[#8A5A9A] to-[#5B3A6D] text-white shadow-md shadow-[#5B3A6D]/20'
                          : msg.isRedacted
                          ? 'bg-amber-950/30 border border-amber-500/30 text-amber-300 italic'
                          : 'bg-[#27232F] text-white border border-white/5'
                      }`}
                    >
                      {msg.isRedacted ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{msg.content}</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-[#6E6476] mt-1 px-1">
                      {isMe ? 'Anda' : 'Stranger'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 bg-[#141219] border-t border-white/5 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik pesan santai..."
                maxLength={500}
                disabled={isSending}
                className="flex-1 bg-[#1F1C25] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-[#686071] focus:outline-none focus:border-[#8A5A9A] transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="p-3 rounded-xl bg-[#8A5A9A] hover:bg-[#9C6BAE] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center shadow-lg shadow-[#8A5A9A]/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* State 7: ENDED */}
        {step === 'ENDED' && (
          <div className="p-8 sm:p-14 text-center max-w-md mx-auto space-y-6 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#A89EB0]">
              <PhoneOff className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold">Percakapan Selesai</h3>
              <p className="text-sm text-[#A89EB0]">
                {statusNotice || 'Sesi obrolan telah berakhir.'}
              </p>
            </div>
            <button
              onClick={handleStartChat}
              className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-[#8A5A9A] to-[#5B3A6D] hover:from-[#9C6BAE] hover:to-[#6C4481] text-white transition-all transform active:scale-95"
            >
              Cari Partner Lain
            </button>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1824] border border-[#5B3A6D]/30 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-rose-400">
                <Flag className="w-5 h-5" />
                <h3 className="font-bold text-lg text-white">Laporkan Pelanggaran</h3>
              </div>
              <button
                onClick={() => setIsReportOpen(false)}
                className="p-1 rounded-lg text-[#A89EB0] hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#A89EB0]">
              Laporan Anda akan ditinjau langsung oleh tim moderasi NIVA. Partner akan otomatis diblokir dari akun Anda.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {REPORT_CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedReportCategory === cat.value
                      ? 'bg-[#5B3A6D]/20 border-[#8A5A9A] text-white'
                      : 'bg-white/[0.02] border-white/5 text-[#A89EB0] hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportCategory"
                    value={cat.value}
                    checked={selectedReportCategory === cat.value}
                    onChange={() => setSelectedReportCategory(cat.value)}
                    className="mt-1 text-[#8A5A9A] focus:ring-0"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">{cat.label}</div>
                    <div className="text-[11px] text-[#8C8494]">{cat.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-[#C5BDCC] mb-1.5 block">
                Keterangan Tambahan (Opsional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Jelaskan secara singkat apa yang terjadi..."
                maxLength={200}
                rows={2}
                className="w-full bg-[#121016] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#686071] focus:outline-none focus:border-[#8A5A9A]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={isReporting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-1.5"
              >
                {isReporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Flag className="w-3.5 h-3.5" />
                    <span>Kirim Laporan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
