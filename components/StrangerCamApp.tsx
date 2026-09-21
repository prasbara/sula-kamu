'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  detectFacePresence,
  FacePresenceResult,
} from '@/lib/facePresenceDetector';

type Step = 'AGE_GATE' | 'LOCATION_CHECK' | 'DEVICE_SETUP' | 'QUEUED' | 'CALL' | 'ERROR';

export type CameraSafetyState =
  | 'CAMERA_OFF'
  | 'CAMERA_REQUESTING'
  | 'CAMERA_ON_FACE_PRESENT'
  | 'CAMERA_ON_FACE_MISSING'
  | 'CAMERA_AUTO_DISABLED'
  | 'CAMERA_REENABLE_PENDING';

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
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

const DEFAULT_GRACE_SECONDS = 6;

export default function StrangerCamApp() {
  // Navigation & session state
  const [step, setStep] = useState<Step>('AGE_GATE');
  const [userId, setUserId] = useState<string>('');
  const [alias, setAlias] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('niva_stranger_alias');
      if (saved) return saved;
    }
    return `Stranger #${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [is18Plus, setIs18Plus] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [locationVerified, setLocationVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // Active Call State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Face Visibility Safety Gate state machine
  const [cameraSafetyState, setCameraSafetyState] = useState<CameraSafetyState>('CAMERA_REQUESTING');
  const [faceWarningCountdown, setFaceWarningCountdown] = useState<number | null>(null);
  const [faceWarningMessage, setFaceWarningMessage] = useState<string>('');
  const [setupFaceStatus, setSetupFaceStatus] = useState<'IDLE' | 'CHECKING' | 'FACE_DETECTED' | 'NO_FACE' | 'MULTIPLE_FACES'>('IDLE');

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
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const peerIdRef = useRef<string>('');
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const iceCandidateBufferRef = useRef<RTCIceCandidateInit[]>([]);
  const queuePollingRef = useRef<NodeJS.Timeout | null>(null);
  const signalingPollingRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignalTimeRef = useRef<string | undefined>(undefined);
  const isInitiatorRef = useRef<boolean>(false);
  const isSkippingRef = useRef<boolean>(false);
  const unloadHandlerRef = useRef<(() => void) | null>(null);

  // Synchronous callback refs to guarantee immediate DOM attachment
  const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (localVideoRef as any).current = el;
    if (el && localStreamRef.current) {
      if (el.srcObject !== localStreamRef.current) {
        el.srcObject = localStreamRef.current;
      }
      el.play().catch(() => {});
    }
  }, []);

  const setRemoteVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (remoteVideoRef as any).current = el;
    if (el && remoteStreamRef.current) {
      if (el.srcObject !== remoteStreamRef.current) {
        el.srcObject = remoteStreamRef.current;
      }
      el.play().catch(() => {});
    }
  }, []);

  // Face detection loop references
  const faceDetectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const missingTicksRef = useRef<number>(0);
  const multipleTicksRef = useRef<number>(0);
  const graceSecondsRef = useRef<number>(DEFAULT_GRACE_SECONDS);

  // Active Media Stream Recovery Helper
  const ensureActiveLocalMedia = async (): Promise<MediaStream | null> => {
    const existing = localStreamRef.current;
    const hasLiveVideo = existing && existing.getVideoTracks().some((t) => t.readyState === 'live');
    const hasLiveAudio = existing && existing.getAudioTracks().some((t) => t.readyState === 'live');
    if (existing && hasLiveVideo && hasLiveAudio) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== existing) {
        localVideoRef.current.srcObject = existing;
        localVideoRef.current.play().catch(() => {});
      }
      return existing;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      console.warn('Failed to acquire active media stream:', err);
      return existing;
    }
  };

  // Persistent video stream attachment across step changes (DEVICE_SETUP, CALL)
  useEffect(() => {
    if (step === 'CALL') {
      const attachMedia = () => {
        if (localVideoRef.current && localStreamRef.current) {
          if (localVideoRef.current.srcObject !== localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          localVideoRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current && remoteStreamRef.current) {
          if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      attachMedia();
      const t = setTimeout(attachMedia, 150);
      return () => clearTimeout(t);
    } else if (step === 'DEVICE_SETUP') {
      const attachLocal = () => {
        if (localVideoRef.current && localStreamRef.current) {
          if (localVideoRef.current.srcObject !== localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          localVideoRef.current.play().catch(() => {});
        }
      };
      attachLocal();
      const t = setTimeout(attachLocal, 150);
      return () => clearTimeout(t);
    }
  }, [step]);

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

  // Poll online Stranger Cam users periodically (strictly separate from chatbot users)
  useEffect(() => {
    async function fetchOnlineCount() {
      try {
        const uid = userId || localStorage.getItem('niva_stranger_user_id') || '';
        const res = await fetch(`/api/stranger-cam/online?userId=${encodeURIComponent(uid)}`);
        const data = await res.json();
        if (data.success && typeof data.onlineCount === 'number') {
          setOnlineCount(Math.max(data.onlineCount, 1));
        }
      } catch {}
    }

    fetchOnlineCount();
    const interval = setInterval(fetchOnlineCount, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  function clearAllTimers() {
    if (queuePollingRef.current) clearInterval(queuePollingRef.current);
    if (signalingPollingRef.current) clearInterval(signalingPollingRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (faceDetectionTimerRef.current) clearInterval(faceDetectionTimerRef.current);
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch {}
      dataChannelRef.current = null;
    }
    if (unloadHandlerRef.current) {
      window.removeEventListener('beforeunload', unloadHandlerRef.current);
      window.removeEventListener('pagehide', unloadHandlerRef.current);
      unloadHandlerRef.current = null;
    }
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
    remoteStreamRef.current = null;
  }

  // ── Step 1: 18+ Age Gate & Fast Start (No Registration Required) ────────────
  const handleConfirmAgeGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!is18Plus) {
      setErrorMessage('Anda harus berusia 18 tahun ke atas untuk menggunakan NIVA Stranger Cam.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const cleanAlias = alias.trim() || `Stranger #${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch('/api/stranger-cam/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || undefined,
          alias: cleanAlias,
          confirmAge: true,
          is18Plus: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memulai Stranger Cam.');

      setUserId(data.user.id);
      localStorage.setItem('niva_stranger_user_id', data.user.id);
      localStorage.setItem('niva_stranger_alias', data.user.displayName || cleanAlias);

      // Seamlessly auto-confirm Semarang location so users can jump straight to media setup
      try {
        await fetch('/api/stranger-cam/location-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            method: 'USER_CONFIRMATION',
          }),
        });
      } catch {}

      setLocationVerified(true);
      setStep('DEVICE_SETUP');
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
        async () => {
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

  // ── Step 3: Camera & Face Presence Setup (Requirement 15 & 29) ─────────────
  const handleSetupMedia = async () => {
    setLoading(true);
    setErrorMessage('');
    setSetupFaceStatus('CHECKING');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCameraSafetyState('CAMERA_ON_FACE_PRESENT');

      // Run initial face presence check on preview after video element starts playing
      setTimeout(async () => {
        if (!localVideoRef.current) return;
        try {
          const result = await detectFacePresence(localVideoRef.current);
          if (result.status === 'FACE_PRESENT') {
            setSetupFaceStatus('FACE_DETECTED');
          } else if (result.status === 'MULTIPLE_FACES') {
            setSetupFaceStatus('MULTIPLE_FACES');
          } else {
            setSetupFaceStatus('NO_FACE');
          }
        } catch {
          setSetupFaceStatus('FACE_DETECTED');
        }
      }, 700);
    } catch (err: any) {
      setErrorMessage(
        'Izin kamera atau mikrofon ditolak. Untuk menggunakan Stranger Cam, izinkan akses kamera & mikrofon di browser Anda.'
      );
      setSetupFaceStatus('IDLE');
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
      // Ensure media is alive
      await ensureActiveLocalMedia();

      let currentUid = userId || localStorage.getItem('niva_stranger_user_id');
      if (!currentUid) {
        const authRes = await fetch('/api/stranger-cam/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alias: alias.trim() || 'Mahasiswa Semarang',
            confirmAge: true,
            is18Plus: true,
          }),
        });
        const authData = await authRes.json();
        if (authData.user) {
          currentUid = authData.user.id;
          setUserId(authData.user.id);
          localStorage.setItem('niva_stranger_user_id', authData.user.id);
        }
      }

      // Guarantee Semarang location is confirmed for this serverless instance
      try {
        await fetch('/api/stranger-cam/location-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUid,
            method: 'USER_CONFIRMATION',
          }),
        });
      } catch {}

      const res = await fetch('/api/stranger-cam/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'JOIN',
          userId: currentUid,
          interests: ['Ngobrol Santai', 'Semarang'],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.message?.includes('tidak ditemukan') || data.message?.includes('Syarat kelayakan')) {
          // Auto-recover user on this container and retry once
          const authRes = await fetch('/api/stranger-cam/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUid,
              alias: alias.trim() || 'Mahasiswa Semarang',
              confirmAge: true,
              is18Plus: true,
            }),
          });
          const authData = await authRes.json();
          const retryUid = authData.user?.id || currentUid;
          if (authData.user?.id) {
            setUserId(authData.user.id);
            localStorage.setItem('niva_stranger_user_id', authData.user.id);
          }
          await fetch('/api/stranger-cam/location-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: retryUid, method: 'USER_CONFIRMATION' }),
          });
          const retryRes = await fetch('/api/stranger-cam/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'JOIN', userId: retryUid, interests: ['Ngobrol Santai', 'Semarang'] }),
          });
          const retryData = await retryRes.json();
          if (!retryRes.ok) throw new Error(retryData.message || 'Gagal masuk antrean.');
          if (retryData.status === 'CONNECTED' && retryData.session) {
            initiateCall(retryData.session);
            return;
          }
        } else {
          throw new Error(data.message || 'Gagal masuk antrean.');
        }
      }

      if (data.status === 'CONNECTED' && data.session) {
        initiateCall(data.session);
      } else {
        queuePollingRef.current = setInterval(async () => {
          try {
            await fetch('/api/stranger-cam/session/heartbeat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUid }),
            });

            const pollRes = await fetch('/api/stranger-cam/queue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'POLL', userId: currentUid }),
            });
            const pollData = await pollRes.json();
            if (pollData.status === 'CONNECTED' && pollData.session) {
              clearInterval(queuePollingRef.current!);
              initiateCall(pollData.session);
            }
          } catch {
            // Heartbeat retry
          }
        }, 1200);
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
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  };

  // ── Step 5: WebRTC Call & Real-Time Face Safety Loop ───────────────────────
  const initiateCall = async (session: any) => {
    clearAllTimers();
    isSkippingRef.current = false;
    setSessionId(session.id);
    setStep('CALL');
    setCallDuration(0);
    setRemoteCameraOff(false);
    setIsCameraOff(false);
    setCameraSafetyState('CAMERA_ON_FACE_PRESENT');
    setFaceWarningCountdown(null);
    setFaceWarningMessage('');
    missingTicksRef.current = 0;
    multipleTicksRef.current = 0;

    // Ensure active video & audio stream is present
    await ensureActiveLocalMedia();

    setMessages([
      { sender: 'system', text: 'Terhubung secara 1-on-1 di Semarang (Tanpa Perlu Akun & Terbuka untuk Umum 18+). Zero Recording aktif.' },
      { sender: 'system', text: 'Face Safety Gate aktif: Pastikan wajah Anda selalu terlihat di depan kamera.' },
      { sender: 'system', text: 'Jangan pernah membagikan password, kode OTP, atau transfer uang ke orang asing.' },
    ]);

    durationTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    const isInitiator = session.user_a_id === userId;
    isInitiatorRef.current = isInitiator;
    const partnerId = isInitiator ? session.user_b_id : session.user_a_id;
    peerIdRef.current = partnerId;

    try {
      const infoRes = await fetch(`/api/stranger-cam/session/info?sessionId=${session.id}&userId=${userId}`);
      const infoData = await infoRes.json();
      if (infoData.peer) {
        setPeer(infoData.peer);
        if (infoData.peer.id) peerIdRef.current = infoData.peer.id;
      }
    } catch {
      setPeer({
        id: partnerId,
        displayName: 'Stranger',
        isKtmVerified: false,
        region: 'SEMARANG',
        isOnline: true,
      });
    }

    // Attach unload handler to notify partner instantly if tab is closed
    const handleWindowUnload = () => {
      try {
        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          dataChannelRef.current.send(JSON.stringify({ type: 'PEER_LEFT', reason: 'Lawan bicara menutup halaman.' }));
        }
        sendSignalToPeer('CANDIDATE', JSON.stringify({ type: 'PEER_LEFT', reason: 'Lawan bicara menutup halaman.' }));
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/stranger-cam/session/action', JSON.stringify({ action: 'SKIP', sessionId: session.id, userId }));
        }
      } catch {}
    };
    unloadHandlerRef.current = handleWindowUnload;
    window.addEventListener('beforeunload', handleWindowUnload);
    window.addEventListener('pagehide', handleWindowUnload);

    setupWebRTCConnection(session.id, peerIdRef.current);

    // Start Real-Time Face Presence Detection Loop (runs every 600ms on-device)
    startFaceSafetyMonitor(session.id);
  };

  // ── Face Visibility Safety Monitor (Requirements 1, 4, 5, 7, 8, 9) ─────────
  const startFaceSafetyMonitor = (currentSessionId: string) => {
    if (faceDetectionTimerRef.current) clearInterval(faceDetectionTimerRef.current);

    // Initial warm-up allowance (12 ticks = ~7.2s) so WebRTC connection, decoder, & canvas stabilize
    let warmupTicksRemaining = 12;

    faceDetectionTimerRef.current = setInterval(async () => {
      // If camera is intentionally turned OFF by user, do not enforce face presence
      if (!localVideoRef.current || isCameraOff || cameraSafetyState === 'CAMERA_OFF' || cameraSafetyState === 'CAMERA_AUTO_DISABLED') {
        return;
      }

      // Wait until video has actually decoded frames before enforcing face check
      if (localVideoRef.current.readyState < 2 || localVideoRef.current.videoWidth === 0) {
        return;
      }

      if (warmupTicksRemaining > 0) {
        warmupTicksRemaining -= 1;
        return;
      }

      try {
        const result: FacePresenceResult = await detectFacePresence(localVideoRef.current);

        if (result.status === 'FACE_PRESENT') {
          // Face is visible -> continue normally (Test 1 & 3: warning cancelled)
          if (missingTicksRef.current > 0 || multipleTicksRef.current > 0) {
            missingTicksRef.current = 0;
            multipleTicksRef.current = 0;
            setFaceWarningCountdown(null);
            setFaceWarningMessage('');
            setCameraSafetyState('CAMERA_ON_FACE_PRESENT');
          }
        } else if (result.status === 'FACE_MISSING') {
          // Face not detected -> start/continue countdown (Test 2 & 4)
          multipleTicksRef.current = 0;
          missingTicksRef.current += 1;
          setCameraSafetyState('CAMERA_ON_FACE_MISSING');

          // Each tick is ~600ms. 10 ticks = 6.0 seconds
          const elapsedSecs = Math.floor(missingTicksRef.current * 0.6);
          const countdown = Math.max(0, graceSecondsRef.current - elapsedSecs);
          setFaceWarningCountdown(countdown);

          if (result.isLowLight) {
            setFaceWarningMessage('Wajah sulit terdeteksi. Coba arahkan wajah ke kamera atau gunakan pencahayaan lebih terang.');
          } else {
            setFaceWarningMessage('Wajah tidak terlihat di kamera. Kamera akan dimatikan jika wajah tidak kembali terlihat.');
          }

          // Test 4: Grace period expired (> graceSeconds) -> automatically disable camera
          if (countdown <= 0) {
            triggerCameraAutoDisable(
              currentSessionId,
              'FACE_VISIBILITY_CAMERA_DISABLED',
              `Wajah tidak terlihat di kamera selama melebihi batas toleransi ${graceSecondsRef.current} detik`
            );
          }
        } else if (result.status === 'MULTIPLE_FACES') {
          // Multiple faces detected (Test 7)
          missingTicksRef.current = 0;
          multipleTicksRef.current += 1;
          setCameraSafetyState('CAMERA_ON_FACE_MISSING');

          const elapsedSecs = Math.floor(multipleTicksRef.current * 0.6);
          const countdown = Math.max(0, graceSecondsRef.current - elapsedSecs);
          setFaceWarningCountdown(countdown);
          setFaceWarningMessage('Hanya satu orang yang boleh terlihat di kamera. Kamera akan dimatikan jika kondisi ini berlanjut.');

          if (countdown <= 0) {
            triggerCameraAutoDisable(
              currentSessionId,
              'MULTIPLE_FACE_CAMERA_DISABLED',
              `Terdeteksi lebih dari satu orang di kamera selama melebihi ${graceSecondsRef.current} detik`
            );
          }
        }
      } catch {
        // Fallback: keep call running
      }
    }, 600);
  };

  // Disable outgoing video track and log minimal safety metadata (Requirement 8, 13, 20)
  const triggerCameraAutoDisable = (currentSessionId: string, eventType: string, reason: string) => {
    // 1. Disable local video track immediately (remote sees black / camera off, not frozen frame)
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    setIsCameraOff(true);
    setCameraSafetyState('CAMERA_AUTO_DISABLED');
    setFaceWarningCountdown(null);
    setFaceWarningMessage('');
    missingTicksRef.current = 0;
    multipleTicksRef.current = 0;

    // 2. Notify remote participant via WebRTC signal that camera was disabled
    if (currentSessionId && userId) {
      sendSignalToPeer('CANDIDATE', JSON.stringify({ type: 'CAMERA_STATE', enabled: false }));

      // 3. Log minimal safety event (zero images stored)
      fetch('/api/stranger-cam/session/safety-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          userId,
          eventType,
          reason,
        }),
      }).catch(() => {});
    }
  };

  // Dedicated Real-Time Multi-Channel Signaling (SSE Push + Serverless HTTP)
  const sendSignalToPeer = (signalType: string, payloadStr: string) => {
    if (!sessionId || !userId) return;
    const partnerId = peerIdRef.current;

    const signalObj = {
      sessionId,
      senderId: userId,
      receiverId: partnerId,
      signalType,
      payload: payloadStr,
      createdAt: new Date().toISOString(),
    };

    // 1. Instant Real-Time Push delivery via ntfy.sh SSE topic
    if (partnerId) {
      const targetTopic = `niva_sig_${sessionId}_${partnerId}`;
      fetch(`https://ntfy.sh/${targetTopic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signalObj),
      }).catch(() => {});
    }

    // 2. HTTP Serverless signaling route (with receiverId for auto-provisioning)
    fetch('/api/stranger-cam/session/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signalObj),
    }).catch(() => {});
  };

  // Re-enable camera with mandatory face presence check (Requirement 10 & Acceptance Test 6)
  const handleReenableCamera = async () => {
    if (!localStreamRef.current || !localVideoRef.current) return;
    setCameraSafetyState('CAMERA_REENABLE_PENDING');

    // Turn video track on momentarily to analyze frame
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });

    if (localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }

    setTimeout(async () => {
      if (!localVideoRef.current) return;
      const check = await detectFacePresence(localVideoRef.current);

      if (check.status === 'FACE_PRESENT') {
        setIsCameraOff(false);
        setCameraSafetyState('CAMERA_ON_FACE_PRESENT');
        missingTicksRef.current = 0;
        multipleTicksRef.current = 0;
        setFaceWarningCountdown(null);
        setFaceWarningMessage('');

        // Notify peer
        sendSignalToPeer('CANDIDATE', JSON.stringify({ type: 'CAMERA_STATE', enabled: true }));
      } else {
        // Face still absent or multiple faces -> shut off immediately
        localStreamRef.current?.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
        setCameraSafetyState('CAMERA_AUTO_DISABLED');
        alert(
          check.status === 'MULTIPLE_FACES'
            ? 'Hanya satu orang yang boleh terlihat di kamera.'
            : 'Wajah belum terdeteksi. Arahkan wajah Anda ke depan kamera sebelum mengaktifkan kembali.'
        );
      }
    }, 450);
  };

  // Manual camera toggle by user (Test 5)
  const toggleCamera = () => {
    if (isCameraOff) {
      // User wants to turn camera ON -> run face presence gate
      handleReenableCamera();
    } else {
      // User intentionally turns camera OFF -> no face safety enforcement
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsCameraOff(true);
      setCameraSafetyState('CAMERA_OFF');
      setFaceWarningCountdown(null);
      setFaceWarningMessage('');
      missingTicksRef.current = 0;
      multipleTicksRef.current = 0;

      sendSignalToPeer('CANDIDATE', JSON.stringify({ type: 'CAMERA_STATE', enabled: false }));
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

  // Fast Auto-Skip to Next Partner (Immediate Transition when Peer Leaves)
  const triggerAutoSkipToNext = useCallback((reason?: string) => {
    if (isSkippingRef.current) return;
    isSkippingRef.current = true;

    clearAllTimers();
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch {}
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;

    setMessages((prev) => [
      ...prev,
      { sender: 'system', text: reason || 'Lawan bicara telah keluar/melewati panggilan. Mencari partner baru...' },
    ]);

    // Jump straight to matchmaking queue with zero hang
    setTimeout(() => {
      isSkippingRef.current = false;
      enterQueue();
    }, 300);
  }, [userId, alias]);

  // Unified Incoming Signal Processor (Used by both SSE Real-Time Push & HTTP Polling)
  const processIncomingSignal = async (signal: any, pc: RTCPeerConnection) => {
    try {
      if (!signal || !signal.payload) return;
      const payloadStr = typeof signal.payload === 'string' ? signal.payload : JSON.stringify(signal.payload);
      const sigKey = `${signal.signalType}_${payloadStr}`;
      if (processedSignalsRef.current.has(sigKey)) return;
      processedSignalsRef.current.add(sigKey);

      let parsed: any;
      try {
        parsed = typeof signal.payload === 'string' ? JSON.parse(signal.payload) : signal.payload;
      } catch {
        return;
      }

      // 0. Peer Left Signal (Direct notification from partner)
      if (parsed.type === 'PEER_LEFT') {
        triggerAutoSkipToNext(parsed.reason || 'Lawan bicara telah melewati panggilan. Mencari partner baru...');
        return;
      }

      // 1. In-call Chat Message
      if (parsed.type === 'CHAT_MSG' && parsed.text) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.sender === 'stranger' && last.text === parsed.text) return prev;
          return [...prev, { sender: 'stranger', text: parsed.text }];
        });
        return;
      }

      // 2. Remote Camera State
      if (parsed.type === 'CAMERA_STATE') {
        setRemoteCameraOff(!parsed.enabled);
        return;
      }

      // 3. WebRTC OFFER
      if (signal.signalType === 'OFFER' && !isInitiatorRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(parsed));
        while (iceCandidateBufferRef.current.length > 0) {
          const cand = iceCandidateBufferRef.current.shift();
          if (cand) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalToPeer('ANSWER', JSON.stringify(answer));
        return;
      }

      // 4. WebRTC ANSWER
      if (signal.signalType === 'ANSWER' && isInitiatorRef.current) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(parsed));
          while (iceCandidateBufferRef.current.length > 0) {
            const cand = iceCandidateBufferRef.current.shift();
            if (cand) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
            }
          }
        }
        return;
      }

      // 5. WebRTC ICE CANDIDATE
      if (signal.signalType === 'CANDIDATE') {
        if (!parsed.candidate && !parsed.sdpMid && typeof parsed.sdpMLineIndex !== 'number') {
          return;
        }
        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          iceCandidateBufferRef.current.push(parsed);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(parsed));
          } catch {}
        }
        return;
      }
    } catch (err) {
      console.warn('Signal processing error:', err);
    }
  };

  const setupWebRTCConnection = async (currentSessionId: string, partnerId: string) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;
      iceCandidateBufferRef.current = [];
      processedSignalsRef.current = new Set();

      // Listen for peer disconnection or drop to immediately auto-skip
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'disconnected' || s === 'failed' || s === 'closed') {
          triggerAutoSkipToNext('Koneksi lawan bicara terputus. Mencari lawan bicara baru...');
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === 'disconnected' || s === 'failed') {
          triggerAutoSkipToNext('Koneksi lawan bicara terputus. Mencari lawan bicara baru...');
        }
      };

      // Negotiated DataChannel for instant 0ms P2P chat and immediate skip events
      try {
        const dc = pc.createDataChannel('niva_chat', { negotiated: true, id: 0 });
        dataChannelRef.current = dc;
        dc.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PEER_LEFT') {
              triggerAutoSkipToNext(data.reason || 'Lawan bicara telah melewati panggilan. Mencari partner baru...');
              return;
            }
            if (data.type === 'CHAT_MSG' && data.text) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.sender === 'stranger' && last.text === data.text) return prev;
                return [...prev, { sender: 'stranger', text: data.text }];
              });
            }
          } catch {}
        };
        dc.onclose = () => {
          triggerAutoSkipToNext('Koneksi lawan bicara terputus. Mencari partner baru...');
        };
      } catch (dcErr) {
        console.warn('DataChannel init notice:', dcErr);
      }

      const stream = await ensureActiveLocalMedia();
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
          } catch {}
        });
      }

      pc.ontrack = (event) => {
        let targetStream: MediaStream;
        if (event.streams && event.streams[0]) {
          targetStream = event.streams[0];
        } else {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
          targetStream = remoteStreamRef.current;
        }

        remoteStreamRef.current = targetStream;
        if (remoteVideoRef.current) {
          if (remoteVideoRef.current.srcObject !== targetStream) {
            remoteVideoRef.current.srcObject = targetStream;
          }
          remoteVideoRef.current.play().catch(() => {});
        }

        event.track.onunmute = () => {
          if (remoteVideoRef.current && remoteStreamRef.current) {
            if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
            }
            remoteVideoRef.current.play().catch(() => {});
          }
        };
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalToPeer('CANDIDATE', JSON.stringify(event.candidate));
        }
      };

      if (isInitiatorRef.current) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignalToPeer('OFFER', JSON.stringify(offer));
      }

      startSignalingAndHeartbeat(currentSessionId, partnerId, pc);
    } catch {
      setErrorMessage('Gagal membentuk koneksi WebRTC P2P.');
    }
  };

  const startSignalingAndHeartbeat = (currentSessionId: string, partnerId: string, pc: RTCPeerConnection) => {
    // 1. Instant Real-Time Push Listener via ntfy.sh SSE topic
    try {
      if (sseRef.current) {
        try { sseRef.current.close(); } catch {}
        sseRef.current = null;
      }
      const myTopic = `niva_sig_${currentSessionId}_${userId}`;
      const sse = new EventSource(`https://ntfy.sh/${myTopic}/sse`);
      sseRef.current = sse;
      sse.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw && raw.message) {
            const inner = JSON.parse(raw.message);
            processIncomingSignal(inner, pc);
          } else if (raw && raw.signalType) {
            processIncomingSignal(raw, pc);
          }
        } catch {}
      };
    } catch (sseErr) {
      console.warn('SSE connection notice:', sseErr);
    }

    // 2. Parallel HTTP Polling as fallback
    signalingPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/stranger-cam/session/signal?sessionId=${currentSessionId}&receiverId=${userId}${
            lastSignalTimeRef.current ? `&after=${encodeURIComponent(lastSignalTimeRef.current)}` : ''
          }`
        );
        const data = await res.json();

        if (data.signals && data.signals.length > 0) {
          for (const signal of data.signals) {
            lastSignalTimeRef.current = signal.createdAt;
            processIncomingSignal(signal, pc);
          }
        }
      } catch {
        // Retry polling
      }
    }, 800);

    // 3. Heartbeat (every 2000ms for fast exit detection)
    heartbeatRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/stranger-cam/session/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, sessionId: currentSessionId }),
        });
        const data = await res.json();
        // If session status is not CONNECTED or session was not found on server
        if (!data.session || data.session.status !== 'CONNECTED') {
          triggerAutoSkipToNext(data.session?.endReason || 'Lawan bicara telah keluar.');
        }
      } catch {
        // Ignore
      }
    }, 2000);
  };

  // ── Call Actions: Skip, End, Block, Report ──────────────────────────────────
  const handleSkip = async () => {
    if (!sessionId) return;
    // 1. Notify partner immediately over DataChannel and Push
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify({ type: 'PEER_LEFT', reason: 'Lawan bicara menekan Skip.' }));
      } catch {}
    }
    sendSignalToPeer('CANDIDATE', JSON.stringify({ type: 'PEER_LEFT', reason: 'Lawan bicara menekan Skip.' }));

    clearAllTimers();
    try {
      await fetch('/api/stranger-cam/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SKIP', sessionId, userId }),
      });
    } catch {
      // Proceed
    }
    enterQueue();
  };

  const handleEnd = async () => {
    if (!sessionId) return;
    // 1. Notify partner immediately over DataChannel and Push
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify({ type: 'PEER_LEFT', reason: 'Lawan bicara mengakhiri panggilan.' }));
      } catch {}
    }
    sendSignalToPeer('CANDIDATE', JSON.stringify({ type: 'PEER_LEFT', reason: 'Lawan bicara mengakhiri panggilan.' }));

    clearAllTimers();
    try {
      await fetch('/api/stranger-cam/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'END', sessionId, userId }),
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

    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify({ type: 'PEER_LEFT', reason: 'Panggilan dihentikan.' }));
      } catch {}
    }
    sendSignalToPeer('CANDIDATE', JSON.stringify({ type: 'PEER_LEFT', reason: 'Panggilan dihentikan.' }));

    clearAllTimers();
    try {
      await fetch('/api/stranger-cam/session/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BLOCK', sessionId, userId, targetUserId: peer.id }),
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (/transfer\s+(uang|duit|dana)|minta\s+otp|minta\s+pin|slot\s+gacor/i.test(text)) {
      setChatWarning('⚠️ Pesan terdeteksi berisiko tinggi dan dicegah oleh sistem keamanan NIVA.');
      return;
    }

    setMessages((prev) => [...prev, { sender: 'me', text }]);
    setInputText('');
    setChatWarning(null);

    // 1. Instant Direct P2P via WebRTC DataChannel
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify({ type: 'CHAT_MSG', text }));
      } catch {}
    }

    // 2. Real-time signaling channel delivery
    sendSignalToPeer('CANDIDATE', JSON.stringify({ type: 'CHAT_MSG', text }));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-[#16121D] text-white rounded-3xl p-4 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
      {/* ── STAGE 1: AGE GATE & INSTANT START (NO REGISTRATION REQUIRED) ─ */}
      {step === 'AGE_GATE' && (
        <div className="max-w-md mx-auto py-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5B3A6D] to-[#C47293] mx-auto flex items-center justify-center text-white shadow-lg">
            <UserCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{onlineCount} Pengguna Online</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Tanpa Perlu Mendaftar</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Terbuka untuk Umum (18+)</span>
              </span>
            </div>
            <h3 className="text-2xl font-display font-black text-white">
              NIVA Stranger Cam
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Bebas untuk siapa saja di Semarang (Umum & Mahasiswa). Tidak perlu mendaftar atau membuat akun — langsung mulai ngobrol secara anonim dan aman.
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
                Nama Panggilan / Alias Anonim (Opsional)
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                maxLength={30}
                required
                placeholder="Contoh: Stranger, Teman Semarang"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A5A9A]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Data sensitif seperti nomor HP, email, atau KTM tidak pernah diminta dan tidak disimpan.
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
                  Saya menyatakan bahwa saya <strong>berusia 18 tahun atau lebih</strong>, berada di area Semarang, dan setuju untuk menjaga norma kesopanan.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !is18Plus}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#C47293] hover:opacity-95 text-white font-black text-sm shadow-xl disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
            >
              {loading ? 'Menyiapkan Sesi...' : 'Mulai Stranger Cam Sekarang (Tanpa Mendaftar) →'}
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

      {/* ── STAGE 3: DEVICE & FACE VISIBILITY SAFETY CHECK (Req 15 & 29) ─── */}
      {step === 'DEVICE_SETUP' && (
        <div className="max-w-lg mx-auto py-6 text-center space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{onlineCount} Pengguna Online</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8A5A9A]/20 border border-[#8A5A9A]/30 text-[#E8B4C8] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero Recording Guaranteed</span>
              </div>
            </div>
            <h3 className="text-2xl font-display font-black text-white">
              Izinkan Kamera & Cek Wajah
            </h3>
            <p className="text-xs text-gray-300 max-w-sm mx-auto">
              NIVA memeriksa secara lokal (on-device) apakah wajah Anda terlihat di kamera saat sesi aktif. Tidak ada rekaman yang disimpan.
            </p>
          </div>

          {/* Privacy Notice (Requirement 15) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 space-y-1 text-left">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#8A5A9A]" />
              <span>Face Safety Check</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              NIVA checks locally whether a face is visible in your camera frame while Stranger Cam is active.
              We do not save or record camera frames for this check.
            </p>
          </div>

          {/* Self preview container */}
          <div className="relative w-full max-w-xs mx-auto aspect-[4/3] bg-black/40 rounded-2xl overflow-hidden border border-white/15 shadow-inner flex items-center justify-center">
            <video
              ref={setLocalVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            {!localStreamRef.current ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                <Video className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-xs">Klik tombol di bawah untuk menyalakan kamera preview</span>
              </div>
            ) : (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center">
                {setupFaceStatus === 'CHECKING' && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/80 backdrop-blur-md text-[10px] font-bold text-black flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Mendeteksi Wajah On-Device...</span>
                  </span>
                )}
                {setupFaceStatus === 'FACE_DETECTED' && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Wajah Terlihat ✓ (Siap Ngobrol)</span>
                  </span>
                )}
                {setupFaceStatus === 'NO_FACE' && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-600/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Wajah Belum Terlihat di Kamera</span>
                  </span>
                )}
                {setupFaceStatus === 'MULTIPLE_FACES' && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-600/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Hanya 1 Orang Diperbolehkan</span>
                  </span>
                )}
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
            {!localStreamRef.current ? (
              <button
                onClick={handleSetupMedia}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#C47293] hover:opacity-95 text-white font-black text-sm shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                {loading ? 'Meminta Akses Media...' : 'Nyalakan Kamera Preview & Cek Wajah →'}
              </button>
            ) : (
              <button
                onClick={enterQueue}
                disabled={setupFaceStatus === 'NO_FACE' || setupFaceStatus === 'MULTIPLE_FACES'}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white font-black text-sm shadow-xl transition-all disabled:opacity-50"
              >
                Masuk Antrean & Cari Match Semarang →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STAGE 4: QUEUE ───────────────────────────────────────────────── */}
      {step === 'QUEUED' && (
        <div className="max-w-md mx-auto py-12 text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-[#8A5A9A]/30 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] flex items-center justify-center text-white shadow-xl">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mx-auto mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{onlineCount} Pengguna Online di Semarang</span>
            </div>
            <h3 className="text-2xl font-display font-bold text-white">
              Mencari seseorang di Semarang...
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Sistem matchmaking acak sedang menghubungkan Anda dengan pengguna lain di Semarang (Tanpa Perlu Mendaftar & Terbuka untuk Umum).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Lokasi Terkonfirmasi: Semarang</span>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Face Visibility & Perlindungan Anti-Scam Aktif</span>
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

      {/* ── STAGE 5: ACTIVE 1-ON-1 CALL WITH FACE SAFETY GATE ─────────────── */}
      {step === 'CALL' && (
        <div className="space-y-4">
          {/* Top Call Info Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{peer?.displayName || 'Stranger'}</span>
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

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{onlineCount} Online</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                <UserCheck className="w-3 h-3" />
                <span>Face Gate Active</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px] font-semibold border border-rose-500/20">
                ● Zero Recording
              </span>
            </div>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Remote Video */}
            <div className="relative aspect-[4/3] bg-black/60 rounded-2xl overflow-hidden border border-white/15 shadow-xl flex items-center justify-center">
              <video
                ref={setRemoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${remoteCameraOff ? 'hidden' : ''}`}
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[11px] font-semibold text-white">
                Lawan Bicara
              </div>
              {remoteCameraOff && (
                <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                  <VideoOff className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-xs font-semibold text-gray-300">Kamera Lawan Bicara Sedang Mati</span>
                  <span className="text-[10px] text-gray-500 mt-1">Audio tetap tersambung</span>
                </div>
              )}
            </div>

            {/* Local Video with Face Visibility Warning & Countdown Overlays */}
            <div className="relative aspect-[4/3] bg-black/60 rounded-2xl overflow-hidden border border-white/15 shadow-xl flex items-center justify-center">
              <video
                ref={setLocalVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[11px] font-semibold text-white">
                Kamu ({alias})
              </div>

              {/* Countdown & Warning Overlay (Requirements 9 & 11) */}
              {cameraSafetyState === 'CAMERA_ON_FACE_MISSING' && faceWarningCountdown !== null && (
                <div className="absolute inset-x-3 bottom-3 p-3 rounded-xl bg-rose-950/90 backdrop-blur-md border border-rose-500/50 text-white space-y-1 text-center animate-fadeIn">
                  <div className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>{faceWarningMessage}</span>
                  </div>
                  <div className="text-sm font-extrabold text-white">
                    Kamera mati dalam:{' '}
                    <span className="text-amber-300 text-base">{faceWarningCountdown}</span> detik
                  </div>
                  <div className="text-[10px] text-gray-300">
                    Arahkan kembali wajah Anda ke kamera untuk membatalkan penonaktifan.
                  </div>
                </div>
              )}

              {/* Camera Auto Disabled Overlay (Requirement 10) */}
              {cameraSafetyState === 'CAMERA_AUTO_DISABLED' && (
                <div className="absolute inset-0 bg-gray-950/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                    <EyeOff className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">
                      Kamera dimatikan karena wajah tidak terlihat
                    </div>
                    <p className="text-xs text-gray-400 max-w-xs">
                      Audio tetap aktif. Posisikan wajah Anda di depan kamera sebelum mengaktifkan kembali.
                    </p>
                  </div>
                  <button
                    onClick={handleReenableCamera}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>Aktifkan Kamera Kembali</span>
                  </button>
                </div>
              )}

              {/* Manual Camera Off Overlay */}
              {cameraSafetyState === 'CAMERA_OFF' && (
                <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                  <VideoOff className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs font-semibold text-gray-300">Kamera Dinonaktifkan Manual</span>
                  <button
                    onClick={handleReenableCamera}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white border border-white/15"
                  >
                    Nyalakan Kamera
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Safety Control Bar */}
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
              <button
                onClick={handleSkip}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                title="Lewati ke partner berikutnya"
              >
                <SkipForward className="w-4 h-4" />
                <span>Skip</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="px-3.5 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Laporkan Pelanggaran"
              >
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">Laporkan</span>
              </button>

              <button
                onClick={handleBlock}
                className="px-3.5 py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Blokir Pengguna Permanen"
              >
                <ShieldBan className="w-4 h-4" />
                <span className="hidden sm:inline">Blokir</span>
              </button>

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

          {/* In-Call Text Chat with Anti-Scam Filter */}
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
