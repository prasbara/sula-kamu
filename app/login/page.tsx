'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Shield, KeyRound, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          totpCode: totpCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Autentikasi gagal.');
      }

      router.push('/app-admin/overview');
    } catch (err: any) {
      setErrorMsg(err.message || 'Kredensial tidak valid.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0D13] text-[#F3EDF7] flex flex-col justify-center items-center p-4 selection:bg-[#5B3A6D] selection:text-white">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-[#1C1824] border border-[#2E283A] shadow-xl shadow-purple-950/20">
            <Image
              src="/logo-icon.png"
              alt="NIVA"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-white">
              NIVA Operations Console
            </h1>
            <p className="text-xs text-[#9D93A8] font-medium tracking-wide mt-1">
              Authorized Administrative Access Portal
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#171420] border border-[#2B2438] rounded-3xl p-8 shadow-2xl space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D0C4DC] tracking-wider uppercase">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Username administrator"
                  className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-sm text-white placeholder-[#685F75] focus:outline-none focus:border-[#8A5A9A] focus:ring-1 focus:ring-[#8A5A9A] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D0C4DC] tracking-wider uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-sm text-white placeholder-[#685F75] focus:outline-none focus:border-[#8A5A9A] focus:ring-1 focus:ring-[#8A5A9A] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#D0C4DC] tracking-wider uppercase flex items-center gap-1">
                  <span>MFA / TOTP Code</span>
                  <span className="text-[10px] text-[#8A5A9A] font-normal lowercase">(opsional / jika aktif)</span>
                </label>
              </div>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6 digit kode autentikator (cth: 123456)"
                className="w-full px-4 py-3 rounded-xl bg-[#0F0D13] border border-[#2B2438] text-sm text-white font-mono tracking-widest placeholder-[#685F75] focus:outline-none focus:border-[#8A5A9A] focus:ring-1 focus:ring-[#8A5A9A] transition-all text-center"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#5B3A6D] via-[#7B4A8D] to-[#8A5A9A] hover:opacity-95 shadow-lg shadow-purple-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memverifikasi kredensial...</span>
              ) : (
                <>
                  <span>Masuk ke Konsol</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-[#2B2438] text-center">
            <p className="text-[11px] text-[#6E647D] leading-relaxed">
              Seluruh upaya autentikasi dicatat dalam audit trail permanen. Sesi dilindungi dengan enkripsi SHA-256 dan pembatasan brute force otomatis.
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-[#554C60]">
          NIVA Administrative Security Layer • Restricted System
        </div>
      </div>
    </div>
  );
}
