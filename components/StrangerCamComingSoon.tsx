'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Video, 
  Sparkles, 
  MapPin, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  EyeOff, 
  Zap, 
  MessageSquare,
  Radio,
  X
} from 'lucide-react';

export default function StrangerCamComingSoon() {
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInfo.trim()) {
      setErrorMsg('Harap masukkan username Telegram atau email Anda.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/stranger-cam/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactInfo: contactInfo.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mendaftar waitlist.');
      }

      setSubmitted(true);
      setContactInfo('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-12 relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-[#5B3A6D]/20 via-[#8A5A9A]/15 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />

      <div className="bg-white/80 backdrop-blur-xl border border-[#5B3A6D]/20 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-card hover:shadow-hover transition-all">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B3A6D]/10 border border-[#5B3A6D]/20 text-[#5B3A6D] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#8A5A9A]" />
            <span>Fitur Resmi • NIVA Stranger Cam</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-black text-[#17151A] tracking-tight">
            Meet a stranger.{' '}
            <span className="bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#C47293] bg-clip-text text-transparent">
              Start a conversation.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[#68626D] max-w-2xl mx-auto leading-relaxed">
            NIVA Stranger Cam akan mempertemukan kamu secara acak dengan mahasiswa lain yang sedang online di Semarang — langsung 1-on-1 melalui browser.
          </p>

          <p className="text-xs sm:text-sm text-[#8A5A9A] font-medium">
            Tidak perlu memilih profil satu per satu. Masuk ke antrean, dapatkan match, lalu mulai ngobrol.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { label: '18+ Only', icon: UserCheck },
              { label: 'Semarang Only', icon: MapPin },
              { label: '1-on-1', icon: Video },
              { label: 'Privacy First', icon: EyeOff },
              { label: 'Moderated', icon: ShieldCheck },
            ].map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF8F6] text-[#3B123F] border border-[#5B3A6D]/15 shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-[#8A5A9A]" />
                  {badge.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Feature Preview Card */}
        <div className="mt-12 max-w-2xl mx-auto bg-gradient-to-b from-[#1C1622] to-[#2D2136] text-white rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient light */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#8A5A9A]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold tracking-wider uppercase border border-emerald-500/30">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>LIVE FEATURE • BUKA SEKARANG</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white">NIVA STRANGER CAM</h3>
              <p className="text-xs text-white/70 max-w-sm leading-relaxed">
                Random 1-on-1 conversations with students and adults who are online now in the Semarang community.
              </p>
              <div className="text-[11px] text-[#E8B4C8] font-medium tracking-wide">
                18+ • Semarang • Moderated • Zero Recording
              </div>
            </div>

            <div className="w-full sm:w-auto flex flex-col items-center gap-3">
              <Link
                href="/stranger-cam"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#8A5A9A] via-[#C47293] to-[#E8B4C8] hover:opacity-95 text-[#17151A] font-extrabold text-sm shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Video className="w-4 h-4 text-[#17151A]" />
                <span>🎥 Masuk ke Stranger Cam Sekarang →</span>
              </Link>
              <button
                onClick={() => setShowNotifyModal(true)}
                className="text-xs text-white/70 hover:text-white underline underline-offset-4 flex items-center gap-1.5 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notify Me</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Pillars of Stranger Cam Safety */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          <div className="p-5 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#5B3A6D]/10 flex items-center justify-center text-[#5B3A6D]">
              <MapPin className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-[#17151A]">Konfirmasi Semarang</h4>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Cukup konfirmasi lokasi saat berada di Semarang. Koordinat GPS presisi Anda tidak disimpan atau diperlihatkan ke lawan bicara.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#5B3A6D]/10 flex items-center justify-center text-[#5B3A6D]">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-[#17151A]">Tanpa Syarat KTM</h4>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Masuk dengan mudah tanpa unggah kartu mahasiswa atau verifikasi foto terlebih dahulu. Cukup berusia 18+ dan di Semarang.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#5B3A6D]/10 flex items-center justify-center text-[#5B3A6D]">
              <EyeOff className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-[#17151A]">Tanpa Rekaman Otomatis</h4>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Kamera dan mikrofon peer-to-peer murni melalui WebRTC browser. NIVA tidak menyimpan atau merekam panggilan video Anda.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF8F6] border border-[#5B3A6D]/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[#5B3A6D]/10 flex items-center justify-center text-[#5B3A6D]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-[#17151A]">Kendali Seketika</h4>
            <p className="text-xs text-[#68626D] leading-relaxed">
              Tombol Mute, Skip, Report, dan Block permanen selalu tersedia di layar. Perlindungan anti-nudity dan anti-scam aktif.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Notify Me Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#5B3A6D]/20 space-y-5 relative animate-scaleUp">
            <button
              onClick={() => {
                setShowNotifyModal(false);
                setSubmitted(false);
                setErrorMsg('');
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {!submitted ? (
              <form onSubmit={handleSubscribe} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#5B3A6D]/10 text-[#5B3A6D] text-xs font-bold">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Stranger Cam Early Notification</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-[#17151A]">
                    Jadilah yang Pertama Tahu
                  </h3>
                  <p className="text-xs text-[#68626D] leading-relaxed">
                    Masukkan username Telegram atau email Anda. Kami hanya akan menghubungi saat fitur resmi diluncurkan di Semarang.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#17151A]">Kontak Telegram atau Email</label>
                  <input
                    type="text"
                    required
                    placeholder="@username_telegram atau email@kampus.id"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:border-[#8A5A9A] focus:ring-2 focus:ring-[#8A5A9A]/20 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5B3A6D] to-[#8A5A9A] hover:from-[#492e57] hover:to-[#734882] text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'Mendaftarkan...' : 'Daftarkan Saya ke Waitlist'}
                </button>

                <p className="text-[11px] text-gray-400 text-center">
                  Kami menghormati privasi Anda. Tanpa spam atau pesan promosi pihak ketiga.
                </p>
              </form>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#17151A]">Terima Kasih!</h3>
                <p className="text-xs text-[#68626D] leading-relaxed">
                  Kontak Anda telah terdaftar. Kami akan memberikan notifikasi eksklusif begitu NIVA Stranger Cam siap digunakan di Semarang.
                </p>
                <button
                  onClick={() => setShowNotifyModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#FAF8F6] border text-xs font-bold text-[#17151A] hover:bg-gray-100 transition"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
