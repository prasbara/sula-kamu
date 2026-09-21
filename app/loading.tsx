export default function Loading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 animate-fadeIn">
      {/* Top indeterminate progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5B3A6D] via-[#8A5A9A] to-[#E8B4C8] z-50 animate-pulse" />

      {/* Modern minimal loading spinner & label */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#5B3A6D]/15" />
          <div className="w-12 h-12 rounded-full border-2 border-[#5B3A6D] border-t-transparent animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#3B123F]">Memuat Halaman NIVA...</p>
          <p className="text-xs text-[#68626D]">Menghubungkan layanan aman mahasiswa Semarang</p>
        </div>
      </div>
    </div>
  );
}
