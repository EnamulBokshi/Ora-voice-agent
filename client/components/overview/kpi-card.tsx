import { TrendingUp, TrendingDown, MessageSquare, DollarSign, Percent, ShoppingBag, Package } from 'lucide-react';

export interface KpiCardProps {
  label: string;
  value: string;
  trend: number;
  icon: 'conversations' | 'revenue' | 'conversion' | 'aov' | 'orders';
}

const iconMap = {
  conversations: MessageSquare,
  revenue:       DollarSign,
  conversion:    Percent,
  aov:           ShoppingBag,
  orders:        Package,
} as const;

// Per-series accent — all sourced from CSS vars defined in globals.css
const accentConfig: Record<KpiCardProps['icon'], {
  iconColorVar: string;
  iconBgVar:    string;
  sparkAVar:    string;
  sparkBVar:    string;
  sparkPoints:  string;
  sparkArea:    string;
}> = {
  conversations: {
    iconColorVar: 'var(--spark-conversations-a)',
    iconBgVar:    'color-mix(in srgb, var(--spark-conversations-a) 15%, transparent)',
    sparkAVar:    'var(--spark-conversations-a)',
    sparkBVar:    'var(--spark-conversations-b)',
    sparkPoints:  'M0 15 L20 12 L40 22 L60 8 L80 14 L100 5',
    sparkArea:    'M0 30 L0 15 L20 12 L40 22 L60 8 L80 14 L100 5 L100 30 Z',
  },
  revenue: {
    iconColorVar: 'var(--spark-revenue-a)',
    iconBgVar:    'color-mix(in srgb, var(--spark-revenue-a) 15%, transparent)',
    sparkAVar:    'var(--spark-revenue-a)',
    sparkBVar:    'var(--spark-revenue-b)',
    sparkPoints:  'M0 25 L20 22 L40 18 L60 10 L80 15 L100 2',
    sparkArea:    'M0 30 L0 25 L20 22 L40 18 L60 10 L80 15 L100 2 L100 30 Z',
  },
  conversion: {
    iconColorVar: 'var(--spark-conversion-a)',
    iconBgVar:    'color-mix(in srgb, var(--spark-conversion-a) 15%, transparent)',
    sparkAVar:    'var(--spark-conversion-a)',
    sparkBVar:    'var(--spark-conversion-b)',
    sparkPoints:  'M0 20 L20 24 L40 15 L60 18 L80 10 L100 5',
    sparkArea:    'M0 30 L0 20 L20 24 L40 15 L60 18 L80 10 L100 5 L100 30 Z',
  },
  aov: {
    iconColorVar: 'var(--spark-aov-a)',
    iconBgVar:    'color-mix(in srgb, var(--spark-aov-a) 15%, transparent)',
    sparkAVar:    'var(--spark-aov-a)',
    sparkBVar:    'var(--spark-aov-b)',
    sparkPoints:  'M0 10 L20 8 L40 15 L60 12 L80 20 L100 22',
    sparkArea:    'M0 30 L0 10 L20 8 L40 15 L60 12 L80 20 L100 22 L100 30 Z',
  },
  orders: {
    iconColorVar: 'var(--spark-orders-a)',
    iconBgVar:    'color-mix(in srgb, var(--spark-orders-a) 15%, transparent)',
    sparkAVar:    'var(--spark-orders-a)',
    sparkBVar:    'var(--spark-orders-b)',
    sparkPoints:  'M0 22 L20 25 L40 15 L60 18 L80 8 L100 4',
    sparkArea:    'M0 30 L0 22 L20 25 L40 15 L60 18 L80 8 L100 4 L100 30 Z',
  },
};

export function KpiCard({ label, value, trend, icon }: KpiCardProps) {
  const Icon    = iconMap[icon];
  const isPos   = trend >= 0;
  const accent  = accentConfig[icon];
  const lineId  = `spark-line-${icon}`;
  const areaId  = `spark-area-${icon}`;

  return (
    <div
      className="flex flex-col justify-between p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden"
      style={{
        background:     'var(--glass-bg)',
        border:         '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Hover border glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent.iconColorVar} 30%, transparent)` }}
      />

      {/* Header */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: accent.iconBgVar }}
        >
          <Icon size={15} style={{ color: accent.iconColorVar }} />
        </div>
      </div>

      {/* Value */}
      <div className="relative z-10 mb-3">
        <p className="text-2xl font-bold tabular-nums leading-none mb-2 text-foreground">
          {value}
        </p>
        {/* Trend badge */}
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded"
          style={{
            color:           isPos ? 'var(--ora-success)' : 'var(--ora-error)',
            backgroundColor: isPos
              ? 'color-mix(in srgb, var(--ora-success) 15%, transparent)'
              : 'color-mix(in srgb, var(--ora-error) 15%, transparent)',
            border: isPos
              ? '1px solid color-mix(in srgb, var(--ora-success) 30%, transparent)'
              : '1px solid color-mix(in srgb, var(--ora-error) 30%, transparent)',
          }}
        >
          {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {isPos ? '+' : ''}{trend}%
        </span>
      </div>

      {/* Sparkline — colors from CSS vars */}
      <div className="h-8 w-full relative z-10 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={lineId} x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%"   stopColor={accent.sparkAVar} />
              <stop offset="100%" stopColor={accent.sparkBVar} />
            </linearGradient>
            <linearGradient id={areaId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%"   stopColor={accent.sparkAVar} stopOpacity="0.25" />
              <stop offset="100%" stopColor={accent.sparkAVar} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={accent.sparkArea}  fill={`url(#${areaId})`} />
          <path d={accent.sparkPoints} fill="none" stroke={`url(#${lineId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
