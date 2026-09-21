import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('niva_admin_token')?.value;

  if (!token) {
    notFound();
  }

  const session = AdminAuthService.validateSession(token);
  if (!session) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0F0D13] text-[#F3EDF7] flex flex-col font-sans">
      {/* Admin Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#171420]/90 backdrop-blur-md border-b border-[#2B2438]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Role Badge */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center">
                <Image
                  src="/logo-icon.png"
                  alt="NIVA"
                  width={26}
                  height={26}
                  className="object-contain"
                />
              </div>
              <span className="font-display font-bold text-lg text-white tracking-tight">
                NIVA
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5B3A6D]/40 text-[#E8B4C8] border border-[#5B3A6D]/60 tracking-wider uppercase">
                {session.role}
              </span>
            </div>

            {/* Admin identity & logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-white">{session.displayName}</div>
                <div className="text-[10px] text-[#9D93A8]">@{session.username}</div>
              </div>
              <form action="/api/auth/admin/logout" method="POST">
                <button
                  type="submit"
                  className="text-xs font-semibold text-rose-300 hover:text-white px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <nav className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none text-xs font-medium border-t border-[#2B2438]/40">
            <Link
              href="/app-admin/overview"
              className="px-3 py-1.5 rounded-lg text-[#C8BED4] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              📊 Overview
            </Link>
            <Link
              href="/app-admin/users"
              className="px-3 py-1.5 rounded-lg text-[#C8BED4] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              👥 All Active Users
            </Link>
            <Link
              href="/app-admin/verification"
              className="px-3 py-1.5 rounded-lg text-[#C8BED4] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              🛡️ Verification Queues
            </Link>
            <Link
              href="/app-admin/payments"
              className="px-3 py-1.5 rounded-lg text-[#C8BED4] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              💳 Payment Queue (FIFO)
            </Link>
            <Link
              href="/app-admin/support"
              className="px-3 py-1.5 rounded-lg text-[#C8BED4] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              💬 Support Tickets (FIFO)
            </Link>
            <Link
              href="/app-admin/reviews"
              className="px-3 py-1.5 rounded-lg text-[#C8BED4] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              ⭐ User Reviews
            </Link>
            <Link
              href="/app-admin/audit"
              className="px-3 py-1.5 rounded-lg text-[#C8BED4] hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              📜 Audit Logs
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
