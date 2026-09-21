'use client';

import { useEffect, useState } from 'react';
import { Users, GraduationCap, ShieldCheck, Heart } from 'lucide-react';
import { FIXED_INSTITUTION_COUNT } from '@/lib/constants';

interface Stats {
  studentsJoined: number | null;
  institutions: number;
  isLive: boolean;
}

export default function LiveStatsBar() {
  const [stats, setStats] = useState<Stats>({
    studentsJoined: null,
    institutions: FIXED_INSTITUTION_COUNT,
    isLive: false,
  });

  useEffect(() => {
    fetch('/api/public/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.studentsJoined === 'number') {
          setStats({
            studentsJoined: data.studentsJoined,
            institutions: data.institutions || FIXED_INSTITUTION_COUNT,
            isLive: true,
          });
        }
      })
      .catch(() => {
        // Fallback default - keep null and not live
      });
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-[#5B3A6D]/15 shadow-soft max-w-4xl mx-auto my-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#68626D]">
            <Users className="w-4 h-4 text-[#5B3A6D]" />
            <span>Mahasiswa Terdaftar</span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#17151A]">
            {stats.studentsJoined !== null ? stats.studentsJoined.toLocaleString('id-ID') : '—'}
          </p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stats.isLive ? 'text-[#2D8C6A] bg-[#2D8C6A]/10' : 'text-[#68626D] bg-neutral-100'}`}>
            {stats.isLive ? '● Live Database' : 'Live Database'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#68626D]">
            <GraduationCap className="w-4 h-4 text-[#8A5A9A]" />
            <span>Kampus Semarang</span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#17151A]">
            {stats.institutions}
          </p>
          <span className="text-[10px] text-[#8A5A9A] font-semibold bg-[#8A5A9A]/10 px-2 py-0.5 rounded-full">
            Fixed Registry
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#68626D]">
            <Heart className="w-4 h-4 text-[#E8B4C8]" />
            <span>Kuota Like Harian</span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#17151A]">
            10 - 50
          </p>
          <span className="text-[10px] text-[#68626D]">Berdasarkan Verifikasi</span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#68626D]">
            <ShieldCheck className="w-4 h-4 text-[#2D8C6A]" />
            <span>Opsi Verifikasi</span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#17151A]">
            KTM / Foto
          </p>
          <span className="text-[10px] text-[#2D8C6A] font-semibold bg-[#2D8C6A]/10 px-2 py-0.5 rounded-full">
            Review Terpisah
          </span>
        </div>
      </div>
    </div>
  );
}
