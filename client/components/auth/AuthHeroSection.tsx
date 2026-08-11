import React from 'react';
import { Bot, LayoutDashboard, ShoppingBag, Package, Store, Users, TrendingUp } from 'lucide-react';

export const AuthHeroSection: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between p-8 lg:p-12 h-full min-h-[600px] bg-gradient-to-br from-[#12131D] via-[#171826] to-[#0F101A] text-white overflow-hidden">
      {/* Subtle Background Glow Accent */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-[#6C5CE7]/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#2DD4C8]/10 blur-[110px]" />

      {/* Top Brand Logo */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6C5CE7] to-[#2DD4C8] text-white shadow-md shadow-[#6C5CE7]/30">
          <Bot className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white font-heading">
          ORA
        </span>
      </div>

      {/* Headline & Description */}
      <div className="relative z-10 mb-8 max-w-lg">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight mb-3 font-heading">
          The AI sales engine for modern commerce
        </h1>
        <p className="text-sm text-[#94A3B8] leading-relaxed">
          Streamline, organize, and optimize: unleashing the power of autonomous voice agents, live catalog search, and customer intelligence.
        </p>
      </div>

      {/* Mini Product Dashboard Mockup Card (Matches Reference Screenshot Structure) */}
      <div className="relative z-10 rounded-2xl border border-[#2A2C3A]/80 bg-[#161724]/90 p-4 shadow-2xl backdrop-blur-xl max-w-md overflow-hidden">
        {/* Mockup Top Header Row */}
        <div className="flex items-center justify-between border-b border-[#2A2C3A]/60 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6C5CE7]/20 text-[#6C5CE7] text-xs font-bold">
              O
            </div>
            <span className="text-xs font-bold text-white">Merchant Workspace</span>
          </div>
          <span className="text-[10px] font-medium text-[#2DD4C8] bg-[#2DD4C8]/10 px-2 py-0.5 rounded-full border border-[#2DD4C8]/20">
            ● Voice Live
          </span>
        </div>

        {/* Mockup Content Grid (Sidebar + Main Preview) */}
        <div className="grid grid-cols-12 gap-3">
          {/* Mini Sidebar */}
          <div className="col-span-4 border-r border-[#2A2C3A]/50 pr-2 space-y-1.5 text-[11px] text-[#94A3B8]">
            <div className="flex items-center gap-1.5 font-semibold text-white bg-[#6C5CE7]/20 text-[#6C5CE7] px-2 py-1 rounded-md">
              <LayoutDashboard className="h-3 w-3" />
              <span>Dashboard</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 hover:text-white transition-colors">
              <ShoppingBag className="h-3 w-3" />
              <span>Orders</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 hover:text-white transition-colors">
              <Package className="h-3 w-3" />
              <span>Products</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 hover:text-white transition-colors">
              <Store className="h-3 w-3" />
              <span>Stores</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 hover:text-white transition-colors">
              <Users className="h-3 w-3" />
              <span>Staff</span>
            </div>
          </div>

          {/* Mini Main Dashboard Preview */}
          <div className="col-span-8 space-y-2.5">
            <div>
              <div className="text-[11px] font-bold text-white">
                Live Sales Command Center
              </div>
              <div className="text-[9px] text-[#64748B]">
                Autonomous voice & chat pipeline is active
              </div>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-[#1D1E2C] p-1.5 border border-[#2A2C3A]/60">
                <div className="text-[8px] text-[#94A3B8]">Revenue</div>
                <div className="text-[10px] font-bold text-white">$15,300</div>
                <div className="text-[8px] text-[#2DD4C8] font-medium">▲ +2.8%</div>
              </div>
              <div className="rounded-lg bg-[#1D1E2C] p-1.5 border border-[#2A2C3A]/60">
                <div className="text-[8px] text-[#94A3B8]">Orders</div>
                <div className="text-[10px] font-bold text-white">440</div>
                <div className="text-[8px] text-[#2DD4C8] font-medium">▲ +1.3%</div>
              </div>
              <div className="rounded-lg bg-[#1D1E2C] p-1.5 border border-[#2A2C3A]/60">
                <div className="text-[8px] text-[#94A3B8]">Returns</div>
                <div className="text-[10px] font-bold text-white">24</div>
                <div className="text-[8px] text-red-400 font-medium">▲ +1.1%</div>
              </div>
            </div>

            {/* Mini Sales Analytics Line Chart Visual */}
            <div className="rounded-lg bg-[#1D1E2C] p-2 border border-[#2A2C3A]/60">
              <div className="flex items-center justify-between text-[9px] font-semibold text-white mb-1">
                <span>Sales analytics</span>
                <TrendingUp className="h-3 w-3 text-[#2DD4C8]" />
              </div>
              <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 30">
                <path
                  d="M 0 25 Q 25 5, 50 18 T 100 8"
                  fill="none"
                  stroke="#2DD4C8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="8" r="2.5" fill="#2DD4C8" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="relative z-10 text-[11px] text-[#64748B] pt-4">
        &copy; {new Date().getFullYear()} ORA AI Corporation. All rights reserved.
      </div>
    </div>
  );
};
