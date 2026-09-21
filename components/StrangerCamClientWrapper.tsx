'use client';

import dynamic from 'next/dynamic';
import { Camera } from 'lucide-react';

const StrangerCamApp = dynamic(() => import('@/components/StrangerCamApp'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-white border border-[#5B3A6D]/15 shadow-xl flex flex-col items-center justify-center min-h-[380px] space-y-4 animate-pulse">
      <div className="w-14 h-14 rounded-2xl bg-[#5B3A6D]/10 flex items-center justify-center text-[#5B3A6D]">
        <Camera className="w-7 h-7 animate-bounce" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="font-display font-bold text-xl text-[#3B123F]">Memuat NIVA Stranger Cam...</p>
        <p className="text-xs text-[#68626D]">Menyiapkan saluran WebRTC dan validasi kamera peer-to-peer</p>
      </div>
    </div>
  ),
});

export default function StrangerCamClientWrapper() {
  return <StrangerCamApp />;
}
