'use client';

import { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Sparkles, Shield, Users } from 'lucide-react';

export default function DatingWaitlistForm() {
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/dating/waitlist')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.waitlistCount === 'number') {
          setCount(data.waitlistCount);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInfo.trim()) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/dating/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactInfo: contactInfo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mendaftar waitlist.');

      setSuccessMessage(data.message || 'Berhasil terdaftar di daftar tunggu!');
      setContactInfo('');
      setCount((prev) => (prev !== null ? prev + 1 : 1));
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kendala saat mendaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {count !== null && count > 0 && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm border border-white/15">
          <Users className="w-3.5 h-3.5 text-[#E8B4C8]" />
          <span>{count} pendaftar terverifikasi di Semarang</span>
        </div>
      )}

      {successMessage ? (
        <div className="p-5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-white flex items-start gap-3 text-left">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">Pendaftaran Berhasil!</p>
            <p className="text-xs text-emerald-100/90 leading-relaxed">{successMessage}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Username Telegram (@username) atau Email"
              className="flex-1 px-4 py-3.5 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8B4C8] focus:bg-white/20 transition-all"
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !contactInfo.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#5B3A6D] hover:bg-[#FAF8F6] font-bold text-sm shadow-md transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Mendaftarkan...' : 'Join the Waitlist'}</span>
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 text-xs text-rose-200 bg-rose-900/30 px-3.5 py-2 rounded-lg border border-rose-500/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-[11px] text-white/70 flex items-center justify-center gap-1.5 pt-1">
            <Shield className="w-3.5 h-3.5 text-[#E8B4C8]" />
            <span>Kontak hanya digunakan untuk notifikasi peluncuran. Zero spam & privasi terjaga.</span>
          </p>
        </form>
      )}
    </div>
  );
}
