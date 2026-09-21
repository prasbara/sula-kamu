'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SkipForward,
  Flag,
  ShieldBan,
  PhoneOff,
  MapPin,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Send,
  UserCheck,
  CheckCircle2,
  Lock,
  MessageSquare,
  AlertOctagon,
  X,
} from 'lucide-react';

type Step = 'AGE_GATE' | 'LOCATION_CHECK' | 'DEVICE_SETUP' | 'QUEUED' | 'CALL' | 'ERROR';

interface PeerInfo {
  id: string;
  displayName: string;
  isKtmVerified: boolean;
  region: string;
  isOnline: boolean;
}

const REPORT_REASONS = [
  { value: 'NUDITY', label: 'Nudity / Sexual Content (Konten Asusila)' },
  { value: 'HARASSMENT', label: 'Harassment (Pelecehan / Perilaku Kasar)' },
  { value: 'SCAM', label: 'Scam (Indikasi Penipuan Keuangan)' },
  { value: 'THREAT', label: 'Threat (Ancaman / Pemerasan)' },
  { value: 'FAKE_IDENTITY', label: 'Fake Identity (Identitas Palsu)' },
  { value: 'PHISHING', label: 'Phishing (Minta OTP / Password)' },
  { value: 'UNDERAGE_CONCERN', label: 'Underage Concern (Kekhawatiran Di Bawah Umur)' },
  { value: 'INAPPROPRIATE_BEHAVIOR', label: 'Inappropriate Behavior (Perilaku Tidak Pantas)' },
  { value: 'OTHER', label: 'Other (Lainnya)' },
];

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function StrangerCamApp() {
  // Navigation & session state
  const [step, setStep] = useState<Step>('AGE_GATE');
  const [userId, setUserId] = useState<string>('');
  const [alias, setAlias] = useState<string>('Mahasiswa Semarang');
  const [is18Plus, setIs18Plus] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [locationVerified, setLocationVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Active Call State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // In-call text messages
  const [messages, setMessages] = useState<Array<{ sender: 'me' | 'stranger' | 'system'; text: string }>>([]);
  const [inputText, setInputText] = useState('');
  const [chatWarning, setChatWarning] = useState<string | null>(null);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');

  // WebRTC & Media references
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const queuePollingRef = useRef<NodeJS.Timeout | null>(null);
  const signalingPollingRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignalTimeRef = useRef<string | undefined>(undefined);
  const isInitiatorRef = useRef<boolean>(false);

  // 1. Initialize user from localStorage / cookies
  useEffect(() => {
    const savedUserId = localStorage.getItem('niva_stranger_user_id');
    const savedAlias = localStorage.getItem('niva_stranger_alias');
    if (savedAlias) setAlias(savedAlias);

    async function checkExistingAuth() {
      try {
        const res = await fetch(`/api/stranger-cam/auth?userId=${savedUserId || ''}`);
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserId(data.user.id);
          setIs18Plus(data.user.is18Plus);
          if (data.user.displayName) setAlias(data.user.displayName);
          if (data.user.is18Plus) {
            if (data.eligibility?.requiresLocation) {
              setStep('LOCATION_CHECK');
            } else if (data.eligibility?.eligible) {
              setLocationVerified(true);
              setStep('DEVICE_SETUP');
            }
          }
        }
      } catch {
        // Fallback to age gate step
      }
    }
    checkExistingAuth();

    return () => {
      stopAllMedia();
      clearAllTimers();
    };
  }, []);

  function clearAllTimers() {
    if (queuePollingRef.current) clearInterval(queuePollingRef.current);
    if (signalingPollingRef.current) clearInterval(signalingPollingRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
  }

  function stopAllMedia() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }

  // ── Step 1: 18+ Age Gate ───────────────────────────────────────────────────
  const handleConfirmAgeGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!is18Plus) {
      setErrorMessage('Anda harus berusia 18 tahun ke atas untuk menggunakan NIVA Stranger Cam.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/stranger-cam/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || undefined,
          alias: alias.trim() || 'Mahasiswa Semarang',
          confirmAge: true,
          is18Plus: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan konfirmasi usia.');

      setUserId(data.user.id);
      localStorage.setItem('niva_stranger_user_id', data.user.id);
      localStorage.setItem('niva_stranger_alias', data.user.displayName);

      if (data.eligibility?.eligible) {
        setLocationVerified(true);
        setStep('DEVICE_SETUP');
      } else {
        setStep('LOCATION_CHECK');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Semarang Location Confirmation ─────────────────────────────────
  const handleConfirmLocation = async (useGps: boolean) => {
    setLoading(true);
    setErrorMessage('');
    setLocationStatus(useGps ? 'Memeriksa sinyal GPS browser...' : 'Mengonfirmasi wilayah Semarang...');

    if (useGps && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            const res = await fetch('/api/stranger-cam/location-confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                method: 'BROWSER_GEO',
                coords,
              }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lokasi tidak berada di area Semarang.');

            setLocationVerified(true);
            setStep('DEVICE_SETUP');
          } catch (err: any) {
            setErrorMessage(err.message || 'Gagal memverifikasi lokasi Semarang melalui GPS.');
          } finally {
            setLoading(false);
          }
        },
        async (geoErr) => {
          // Fallback to user self-confirmation if GPS permission is denied or unavailable
          setLocationStatus('GPS tidak tersedia atau ditolak. Mengalihkan ke konfirmasi pernyataan mandiri...');
          try {
            const res = await fetch('/api/stranger-cam/location-confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                method: 'USER_CONFIRMATION',
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setLocationVerified(true);
            setStep('DEVICE_SETUP');
          } catch (err: any) {
            setErrorMessage(err.message || 'Gagal mengonfirmasi lokasi.');
          } finally {
            setLoading(false);
          }
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    } else {
      // Direct user confirmation
      try {
        const res = await fetch('/api/stranger-cam/location-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            method: 'USER_CONFIRMATION',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setLocationVerified(true);
        setStep('DEVICE_SETUP');
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal mengonfirmasi lokasi.');
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Step 3: Camera & Microphone Setup ─────────────────────────────────────
  const handleSetupMedia = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Automatically proceed to queue
      enterQueue();
    } catch (err: any) {
      setErrorMessage(
        'Izin kamera atau mikrofon ditolak. Untuk menggunakan Stranger Cam, izinkan akses kamera & mikrofon di browser Anda.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Enter Queue & Matchmaking ──────────────────────────────────────
  const enterQueue = async () => {
    setStep('QUEUED');
    setErrorMessage('');
    clearAllTimers();

    try {
      const res = await fetch('/api/stranger-cam/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'JOIN',
          userId,
          interests: ['Ngobrol Santai', 'Semarang'],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal masuk antrean.');

      if (data.status === 'CONNECTED' && data.session) {
        // Immediate match!
        initiateCall(data.session);
      } else {
        // Polling queue
        queuePollingRef.current = setInterval(async () => {
          try {
            // Heartbeat
            await fetch('/api/stranger-cam/session/heartbeat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId }),
            });

            // Re-join check
            const pollRes = await fetch('/api/stranger-cam/queue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'JOIN', userId }),
            });
            const pollData = await pollRes.json();
            if (pollData.status === 'CONNECTED' && pollData.session) {
              clearInterval(queuePollingRef.current!);
              initiateCall(pollData.session);
            }
          } catch {
            // Heartbeat retry
          }
        }, 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal bergabung ke antrean.');
      setStep('ERROR');
    }
  };

  const handleLeaveQueue = async () => {
    clearAllTimers();
    try {
      await fetch('/api/stranger-cam/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LEAVE', userId }),
      });
    } catch {
      // Ignore
    }
    setStep('DEVICE_SETUP');
  };

  // ── Step 5: WebRTC P2P Call Session ───────────────────────────────────────
  const initiateCall = async (session: any) => {
    clearAllTimers();
    setSessionId(session.id);
    setStep('CALL');
    setCallDuration(0);
    setMessages([
      { sender: 'system', text: '🔒 Terhubung secara 1-on-1 dengan mahasiswa Semarang. Zero Recording aktif.' },
      { sender: 'system', text: '⚠️ Jangan pernah membagikan password, kode OTP, atau transfer uang ke orang asing.' },
    ]);

    // Timer
    durationTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Identify roles: user_a initiates WebRTC offer, user_b waits for offer and answers
    const isInitiator = session.user_a_id === userId;
    isInitiatorRef.current = isInitiator;

    // Fetch peer public information
    try {
      const infoRes = await fetch(`/api/stranger-cam/session/info?sessionId=${session.id}&userId=${userId}`);
      const infoData = await infoRes.json();
      if (infoData.peer) {
        setPeer(infoData.peer);
      }
    } catch {
      // Peer info fallback
      setPeer({
        id: isInitiator ? session.user_b_id : session.user_a_id,
        displayName: 'Mahasiswa Semarang',
        isKtmVerified: false,
        region: 'SEMARANG',
        isOnline: true,
      });
    }

    setupWebRTCConnection(session.id);
  };

  const setupWebRTCConnection = async (currentSessionId: string) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local stream tracks to WebRTC
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming remote stream tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          fetch('/api/stranger-cam/session/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: currentSessionId,
              senderId: userId,
              signalType: 'CANDIDATE',
              payload: JSON.stringify(event.candidate),
            }),
          }).catch(() => {});
        }
      };

      // If initiator, create Offer
      if (isInitiatorRef.current) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await fetch('/api/stranger-cam/session/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            senderId: userId,
            signalType: 'OFFER',
            payload: JSON.stringify(offer),
          }),
        });
      }

      // Start signaling poll & presence heartbeat
      startSignalingAndHeartbeat(currentSessionId, pc);
    } catch (err: any) {
      setErrorMessage('Gagal membentuk koneksi WebRTC P2P.');
    }
  };

  const startSignalingAndHeartbeat = (currentSessionId: string, pc: RTCPeerConnection) => {
    signalingPollingRef.current = setInterval(async () => {
      try {
        // Poll signals
        const res = await fetch(
          `/api/stranger-cam/session/signal?sessionId=${currentSessionId}&receiverId=${userId}${
            lastSignalTimeRef.current ? `&after=${encodeURIComponent(lastSignalTimeRef.current)}` : ''
          }`
        );
        const data = await res.json();

        if (data.signals && data.signals.length > 0) {
          for (const signal of data.signals) {
            lastSignalTimeRef.current = signal.createdAt;
            const parsed = JSON.parse(signal.payload);

            if (signal.signalType === 'OFFER' && !isInitiatorRef.current) {
              await pc.setRemoteDescription(new RTCSessionDescription(parsed));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              await fetch('/api/stranger-cam/session/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: currentSessionId,
                  senderId: userId,
                  signalType: 'ANSWER',
                  payload: JSON.stringify(answer),
                }),
              });
            } else if (signal.signalType === 'ANSWER' && isInitiatorRef.current) {
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(parsed));
              }
            } else if (signal.signalType === 'CANDIDATE') {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(parsed));
              } catch {
                // Ignore candidate buffering mismatch
              }
            }
          }
        }
      } catch {
        // Retry polling
      }
    }, 1500);

    // Heartbeat every 4 seconds
    heartbeatRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/stranger-cam/session/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, sessionId: currentSessionId }),
        });
        const data = await res.json();
        if (data.session && data.session.status !== 'CONNECTED') {
          // Partner ended or skipped
          handleCallEndedByPartner(data.session.endReason || 'Sesi telah diakhiri.');
        }
      } catch {
        // Ignore
      }
    }, 4000);
  };

  const handleCallEndedByPartner = (reason: string) => {
    clearAllTimers();
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setMessages((prev) => [...prev, { sender: 'system', text: `Percakapan diakhiri: ${reason}` }]);
    setTimeout(() => {
      enterQueue(); // Auto-queue next partner
    }, 2000);
  };

  // ── Call Actions: Skip, End, Block, Report ──────────────────────────────────
  const handleSkip = async () => {
    if (!sessionId) return;
    clearAllTimers();
    try {
      await fetch('/api/stranger-cam/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SKIP',
          sessionId,
          userId,
        }),
      });
    } catch {
      // Proceed
    }
    enterQueue();
  };

  const handleEnd = async () => {
    if (!sessionId) return;
    clearAllTimers();
    try {
      await fetch('/api/stranger-cam/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'END',
          sessionId,
          userId,
        }),
      });
    } catch {
      // Proceed
    }
    stopAllMedia();
    setStep('DEVICE_SETUP');
  };

  const handleBlock = async () => {
    if (!sessionId || !peer) return;
    if (!confirm('Apakah Anda yakin ingin memblokir pengguna ini secara permanen? Anda tidak akan pernah dipasangkan lagi.')) {
      return;
    }

    clearAllTimers();
    try {
      await fetch('/api/stranger-cam/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BLOCK',
          sessionId,
          userId,
          targetUserId: peer.id,
        }),
      });
      alert('Pengguna telah diblokir secara permanen.');
    } catch {
      // Proceed
    }
    enterQueue();
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !peer) return;

    try {
      await fetch('/api/stranger-cam/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPORT',
          sessionId,
          userId,
          targetUserId: peer.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      alert('Laporan Anda telah diterima tim moderasi NIVA. Panggilan ditutup demi keamanan Anda.');
      setShowReportModal(false);
      setReportDetails('');
      clearAllTimers();
      enterQueue();
    } catch (err: any) {
      alert('Gagal mengirim laporan: ' + err.message);
    }
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOff;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  // Text message submission with anti-scam checks
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    // Client-side quick filter
    if (/transfer\s+(uang|duit|dana)|minta\s+otp|minta\s+pin|slot\s+gacor/i.test(text)) {
      setChatWarning('⚠️ Pesan terdeteksi berisiko tinggi dan dicegah oleh sistem keamanan NIVA.');
      return;
    }

    setMessages((prev) => [...prev, { sender: 'me', text }]);
    setInputText('');
    setChatWarning(null);

    // Send via signal payload
    if (sessionId && peerConnectionRef.current) {
      fetch('/api/stranger-cam/session/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          senderId: userId,
          signalType: 'CANDIDATE', // piggyback or simple channel
          payload: JSON.stringify({ type: 'CHAT_MSG', text }),
        }),
      }).catch(() => {});
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-[#16121D] text-white rounded-3xl p-4 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
      {/* ── STAGE 1: AGE GATE ────────────────────────────────────────────── */}
      {step === 'AGE_GATE' && (
        <div className="max-w-md mx-auto py-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5B3A6D] to-[#C47293] mx-auto flex items-center justify-center text-white shadow-lg">
            <UserCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>18+ Age Gated Community</span>
            </div>
            <h3 className="text-2xl font-display font-black text-white">
              Konfirmasi Usia & Panggilan
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              NIVA Stranger Cam khusus untuk mahasiswa dan dewasa berusia 18 tahun ke atas di wilayah Semarang.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleConfirmAgeGate} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nama Panggilan / Alias (Publik)
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                maxLength={30}
                required
                placeholder="Contoh: Teman Semarang"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A5A9A]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Data sensitif seperti NIM, nomor HP, email, atau KTM Anda tidak pernah dibagikan.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is18Plus}
                  onChange={(e) => setIs18Plus(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#8A5A9A] focus:ring-[#8A5A9A]"
                />
                <span className="text-xs text-gray-200 leading-relaxed">
                  Saya menyatakan bahwa saya <strong>berusia 18 tahun atau lebih</strong> dan setuju untuk menjaga norma kesopanan, anti-pelecehan, dan anti-penipuan.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !is18Plus}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#C47293] hover:opacity-95 text-white font-bold text-sm shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Memverifikasi Usia...' : 'Lanjutkan ke Lokasi Semarang →'}
            </button>
          </form>
        </div>
      )}

      {/* ── STAGE 2: SEMARANG LOCATION CHECK ─────────────────────────────── */}
      {step === 'LOCATION_CHECK' && (
        <div className="max-w-md mx-auto py-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 mx-auto flex items-center justify-center text-white shadow-lg">
            <MapPin className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Semarang Geofence Check</span>
            </div>
            <h3 className="text-2xl font-display font-black text-white">
              Konfirmasi Wilayah Semarang
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Stranger Cam didedikasikan khusus komunitas Semarang. Kami hanya memastikan wilayah (region) Anda tanpa menyimpan koordinat GPS presisi Anda.
            </p>
          </div>

          {locationStatus && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-emerald-300 animate-pulse">
              {locationStatus}
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleConfirmLocation(true)}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Verifikasi Otomatis via Browser GPS</span>
            </button>

            <button
              onClick={() => handleConfirmLocation(false)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all"
            >
              Saya Sedang Berada di Semarang (Pernyataan Mandiri)
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE 3: DEVICE & CAMERA PERMISSION ───────────────────────────── */}
      {step === 'DEVICE_SETUP' && (
        <div className="max-w-lg mx-auto py-6 text-center space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8A5A9A]/20 border border-[#8A5A9A]/30 text-[#E8B4C8] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero Recording Guaranteed</span>
            </div>
            <h3 className="text-2xl font-display font-black text-white">
              Izinkan Kamera & Mikrofon
            </h3>
            <p className="text-xs text-gray-300 max-w-sm mx-auto">
              NIVA tidak menyimpan rekaman panggilan. Semua aliran video murni peer-to-peer antar-browser Anda.
            </p>
          </div>

          {/* Self preview container */}
          <div className="relative w-full max-w-xs mx-auto aspect-[4/3] bg-black/40 rounded-2xl overflow-hidden border border-white/15 shadow-inner flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            {!localStreamRef.current && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                <Video className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-xs">Klik tombol di bawah untuk menyalakan kamera preview</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleSetupMedia}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#C47293] hover:opacity-95 text-white font-black text-sm shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              {loading ? 'Meminta Akses Media...' : '🎥 Nyalakan Kamera & Mulai Cari Match →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE 4: QUEUE (FINDING SOMEONE IN SEMARANG) ─────────────────── */}
      {step === 'QUEUED' && (
        <div className="max-w-md mx-auto py-12 text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-[#8A5A9A]/30 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] flex items-center justify-center text-white shadow-xl">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-display font-bold text-white">
              Mencari seseorang di Semarang...
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Sistem matchmaking acak sedang menghubungkan Anda dengan mahasiswa lain yang sedang online.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Lokasi Terkonfirmasi: Semarang</span>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Moderasi & Perlindungan Anti-Scam Aktif</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={handleLeaveQueue}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
            >
              Batalkan & Keluar dari Antrean
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE 5: ACTIVE 1-ON-1 WEBRTC CALL ────────────────────────────── */}
      {step === 'CALL' && (
        <div className="space-y-4">
          {/* Top Call Info Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{peer?.displayName || 'Mahasiswa Semarang'}</span>
                  {peer?.isKtmVerified && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                      KTM Terverifikasi
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400">
                  📍 Semarang • Durasi: {formatDuration(callDuration)}
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              <span>● Zero Recording</span>
            </div>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Remote Stranger Video */}
            <div className="relative aspect-[4/3] bg-black/60 rounded-2xl overflow-hidden border border-white/15 shadow-xl flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[11px] font-semibold text-white">
                Lawan Bicara
              </div>
            </div>

            {/* Local User Video */}
            <div className="relative aspect-[4/3] bg-black/60 rounded-2xl overflow-hidden border border-white/15 shadow-xl flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[11px] font-semibold text-white">
                Kamu ({alias})
              </div>
              {isCameraOff && (
                <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-gray-400">
                  <VideoOff className="w-8 h-8 mb-2" />
                  <span className="text-xs">Kamera Dimatikan</span>
                </div>
              )}
            </div>
          </div>

          {/* Safety Control Bar (Requirement 8: Mute, Camera, Skip, Report, Block, End always visible) */}
          <div className="p-4 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
                title={isMuted ? 'Unmute Mikrofon' : 'Mute Mikrofon'}
              >
                {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
                <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                onClick={toggleCamera}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isCameraOff
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
                title={isCameraOff ? 'Nyalakan Kamera' : 'Matikan Kamera'}
              >
                {isCameraOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4" />}
                <span className="hidden sm:inline">{isCameraOff ? 'Cam On' : 'Cam Off'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Skip */}
              <button
                onClick={handleSkip}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                title="Lewati ke partner berikutnya"
              >
                <SkipForward className="w-4 h-4" />
                <span>Skip</span>
              </button>

              {/* Report */}
              <button
                onClick={() => setShowReportModal(true)}
                className="px-3.5 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Laporkan Pelanggaran"
              >
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">Laporkan</span>
              </button>

              {/* Block */}
              <button
                onClick={handleBlock}
                className="px-3.5 py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Blokir Pengguna Permanen"
              >
                <ShieldBan className="w-4 h-4" />
                <span className="hidden sm:inline">Blokir</span>
              </button>

              {/* End */}
              <button
                onClick={handleEnd}
                className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                title="Akhiri Panggilan"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Akhiri</span>
              </button>
            </div>
          </div>

          {/* In-Call Text Chat with Anti-Scam Warning */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
              <MessageSquare className="w-4 h-4 text-[#8A5A9A]" />
              <span>Pesan Teks Percakapan (Tersaring Anti-Scam)</span>
            </div>

            <div className="h-32 overflow-y-auto space-y-2 p-3 rounded-xl bg-black/30 border border-white/10 text-xs">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg ${
                    msg.sender === 'me'
                      ? 'bg-[#5B3A6D]/40 text-white ml-auto max-w-xs'
                      : msg.sender === 'stranger'
                      ? 'bg-white/10 text-gray-200 mr-auto max-w-xs'
                      : 'bg-amber-950/40 border border-amber-500/20 text-amber-200 text-center text-[11px]'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {chatWarning && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{chatWarning}</span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik pesan santai..."
                maxLength={200}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#8A5A9A]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#5B3A6D] hover:bg-[#8A5A9A] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── STAGE 6: ERROR STATE ─────────────────────────────────────────── */}
      {step === 'ERROR' && (
        <div className="max-w-md mx-auto py-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-display font-bold text-white">
              Koneksi Terganggu
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              {errorMessage || 'Terjadi gangguan jaringan atau sesi tidak dapat dilanjutkan.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              onClick={enterQueue}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-90 text-white text-xs font-bold transition-all"
            >
              Coba Cari Lagi (Retry)
            </button>
            <button
              onClick={() => setStep('DEVICE_SETUP')}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
            >
              Kembali ke Pengaturan Media
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: REPORT REASONS ────────────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1C1622] text-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/20 space-y-5 relative animate-scaleUp">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <Flag className="w-4 h-4" />
                <span>Pelaporan Keamanan</span>
              </div>
              <h4 className="text-xl font-display font-bold text-white">
                Laporkan Lawan Bicara
              </h4>
              <p className="text-xs text-gray-400">
                Panggilan akan segera dihentikan dan tiket moderasi akan diproses.
              </p>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Kategori Pelanggaran
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#8A5A9A]"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value} className="bg-[#1C1622] text-white">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  maxLength={300}
                  placeholder="Jelaskan detail kejadian..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#8A5A9A]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition"
                >
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
