import React from 'react';
import { LayoutDashboard, ShoppingBag, Package, Store, Users, TrendingUp } from 'lucide-react';

export const AuthHeroSection: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between p-8 lg:p-12 h-full min-h-[600px] bg-surface-lowest text-foreground overflow-hidden">
      {/* Top Brand */}
      <div className="relative z-10 flex items-center gap-3 mb-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
          O
        </span>
        <span className="text-lg font-semibold tracking-tight text-foreground">ORA</span>
      </div>

      {/* Headline */}
      <div className="relative z-10 mb-8 max-w-lg">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight mb-3">
          The AI sales engine for modern commerce
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Autonomous voice agents, live catalog search, and customer intelligence for your storefront.
        </p>
      </div>

      {/* Mini Product Dashboard Preview */}
      <div className="relative z-10 rounded-md border border-border bg-surface-container p-4 shadow-xl max-w-md overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              O
            </span>
            <span className="text-xs font-semibold text-foreground">Merchant workspace</span>
          </div>
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/25">
            Voice live
          </span>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-12 gap-3">
          {/* Mini sidebar */}
          <div className="col-span-4 border-r border-border pr-2 space-y-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
              <LayoutDashboard className="h-3 w-3" />
              <span>Dashboard</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 hover:text-foreground transition-colors">
              <ShoppingBag className="h-3 w-3" />
              <span>Orders</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 hover:text-foreground transition-colors">
              <Package className="h-3 w-3" />
              <span>Products</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 hover:text-foreground transition-colors">
              <Store className="h-3 w-3" />
              <span>Stores</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 hover:text-foreground transition-colors">
              <Users className="h-3 w-3" />
              <span>Staff</span>
            </div>
          </div>

          {/* Mini main preview */}
          <div className="col-span-8 space-y-2.5">
            <div>
              <div className="text-[11px] font-semibold text-foreground">Command center</div>
              <div className="text-[9px] text-muted-foreground">Autonomous voice & chat pipeline is active</div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-md bg-surface-high p-1.5 border border-border">
                <div className="text-[8px] text-muted-foreground">Revenue</div>
                <div className="text-[10px] font-semibold text-foreground">$15,300</div>
                <div className="text-[8px] text-success font-medium">+2.8%</div>
              </div>
              <div className="rounded-md bg-surface-high p-1.5 border border-border">
                <div className="text-[8px] text-muted-foreground">Orders</div>
                <div className="text-[10px] font-semibold text-foreground">440</div>
                <div className="text-[8px] text-success font-medium">+1.3%</div>
              </div>
              <div className="rounded-md bg-surface-high p-1.5 border border-border">
                <div className="text-[8px] text-muted-foreground">Returns</div>
                <div className="text-[10px] font-semibold text-foreground">24</div>
                <div className="text-[8px] text-error font-medium">+1.1%</div>
              </div>
            </div>

            <div className="rounded-md bg-surface-high p-2 border border-border">
              <div className="flex items-center justify-between text-[9px] font-medium text-foreground mb-1">
                <span>Sales analytics</span>
                <TrendingUp className="h-3 w-3 text-primary" />
              </div>
              <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 30">
                <path
                  d="M 0 25 Q 25 5, 50 18 T 100 8"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="8" r="2.5" fill="var(--primary)" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-[11px] text-muted-foreground pt-4">
        &copy; {new Date().getFullYear()} ORA AI Corporation. All rights reserved.
      </div>
    </div>
  );
};
