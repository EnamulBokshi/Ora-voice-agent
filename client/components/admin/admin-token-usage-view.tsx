'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  fetchTokenCostAnalytics,
  fetchMerchantsCost,
  updateMerchantBudgetCap,
} from '@/services/admin-service';
import {
  PlatformTokenAnalyticsResponse,
  MerchantCostItem,
  DailyTokenUsagePoint,
} from '@/types/admin';
import {
  Layers,
  Radio,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  AlertTriangle,
  Activity,
  Terminal,
  Database,
  ShieldAlert,
  X,
  Loader2,
  SlidersHorizontal,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Builds a continuous date-series for the entire timeframe (7, 30, or 90 days),
 * filling empty days with 0 so the chart always displays a complete, balanced timeline.
 */
function getContinuousTimeline(rawTimeline: DailyTokenUsagePoint[] | undefined, days: number): DailyTokenUsagePoint[] {
  const result: DailyTokenUsagePoint[] = [];
  const map = new Map<string, DailyTokenUsagePoint>();
  (rawTimeline || []).forEach((p) => map.set(p.date, p));

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const existing = map.get(dateStr);
    if (existing) {
      result.push(existing);
    } else {
      result.push({
        date: dateStr,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        voiceMinutes: 0,
        costUsd: 0,
        sessions: 0,
      });
    }
  }
  return result;
}

function formatChartDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function AdminTokenUsageView() {
  // Default to 7 Days, with quick toggles for 30 Days and 90 Days
  const [period, setPeriod] = useState<number>(7);
  const [activeMetric, setActiveMetric] = useState<'tokens' | 'cost' | 'voice'>('tokens');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const [analytics, setAnalytics] = useState<PlatformTokenAnalyticsResponse | null>(null);
  const [merchants, setMerchants] = useState<MerchantCostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cost' | 'tokens' | 'margin' | 'mrr'>('cost');

  // Detailed Merchant Modal State (Inspect & Budget)
  const [inspectedMerchant, setInspectedMerchant] = useState<MerchantCostItem | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [savingBudget, setSavingBudget] = useState(false);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [analyticsRes, merchantsRes] = await Promise.all([
        fetchTokenCostAnalytics(period),
        fetchMerchantsCost(),
      ]);
      setAnalytics(analyticsRes);
      setMerchants(merchantsRes);
    } catch (err) {
      console.error('Failed to load token & cost analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Continuous Full-Timeframe Timeline
  const continuousTimeline = useMemo(() => {
    return getContinuousTimeline(analytics?.timeline, period);
  }, [analytics?.timeline, period]);

  // Aggregate stats
  const totalMrr = useMemo(() => {
    return merchants.reduce((acc, m) => acc + (m.mrrUsd || 0), 0);
  }, [merchants]);

  const totalCost = analytics?.summary.totalCostUsd || 0;
  const overallGrossMargin = totalMrr > 0 ? Math.round(((totalMrr - totalCost) / totalMrr) * 1000) / 10 : 100;

  // Filtered & Sorted Merchants
  const filteredMerchants = useMemo(() => {
    return merchants
      .filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.planName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        if (sortBy === 'cost') return b.aiCostUsd - a.aiCostUsd;
        if (sortBy === 'tokens') return b.totalTokens - a.totalTokens;
        if (sortBy === 'margin') return b.grossMarginPercent - a.grossMarginPercent;
        if (sortBy === 'mrr') return b.mrrUsd - a.mrrUsd;
        return 0;
      });
  }, [merchants, searchQuery, sortBy]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredMerchants.length / pageSize) || 1;
  const paginatedMerchants = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMerchants.slice(start, start + pageSize);
  }, [filteredMerchants, page, pageSize]);

  const handleOpenInspect = (merchant: MerchantCostItem) => {
    setInspectedMerchant(merchant);
    setBudgetInput(merchant.budgetCapUsd ? merchant.budgetCapUsd.toString() : '');
  };

  const handleSaveBudget = async () => {
    if (!inspectedMerchant) return;
    setSavingBudget(true);
    try {
      const capValue = budgetInput.trim() === '' ? null : parseFloat(budgetInput);
      await updateMerchantBudgetCap(inspectedMerchant.id, isNaN(capValue as number) ? null : capValue);
      await loadData(true);
      setInspectedMerchant((prev) => (prev ? { ...prev, budgetCapUsd: isNaN(capValue as number) ? null : capValue } : null));
    } catch (err) {
      console.error('Failed to update budget limit:', err);
    } finally {
      setSavingBudget(false);
    }
  };

  // SVG Chart Geometry Calculations
  const chartWidth = 800;
  const chartHeight = 160;
  const chartPaddingTop = 15;
  const chartPaddingBottom = 25;
  const chartDrawableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
  const baselineY = chartHeight - chartPaddingBottom;

  const rawHighest = useMemo(() => {
    if (continuousTimeline.length === 0) return 0;
    const vals = continuousTimeline.map((p) => {
      if (activeMetric === 'cost') return p.costUsd;
      if (activeMetric === 'voice') return p.voiceMinutes;
      return p.totalTokens;
    });
    return Math.max(...vals, 0);
  }, [continuousTimeline, activeMetric]);

  const maxVal = useMemo(() => {
    return rawHighest > 0 ? rawHighest * 1.15 : activeMetric === 'cost' ? 1 : activeMetric === 'voice' ? 10 : 100;
  }, [rawHighest, activeMetric]);

  const chartPoints = useMemo(() => {
    const len = continuousTimeline.length;
    if (len === 0) return [];
    const step = chartWidth / Math.max(1, len - 1);

    return continuousTimeline.map((p, i) => {
      const x = i * step;
      const val = activeMetric === 'cost' ? p.costUsd : activeMetric === 'voice' ? p.voiceMinutes : p.totalTokens;
      const y = baselineY - (val / maxVal) * chartDrawableHeight;
      return { x, y: Math.min(baselineY, Math.max(chartPaddingTop, y)), point: p, val };
    });
  }, [continuousTimeline, activeMetric, maxVal, chartWidth, baselineY, chartPaddingTop, chartDrawableHeight]);

  // Monotone Clamped Spline Generator (Zero baseline overshoot dip)
  const { linePath, areaPath } = useMemo(() => {
    if (chartPoints.length === 0) return { linePath: '', areaPath: '' };
    if (chartPoints.length === 1) {
      const p = chartPoints[0];
      return {
        linePath: `M 0 ${p.y} L ${chartWidth} ${p.y}`,
        areaPath: `M 0 ${p.y} L ${chartWidth} ${p.y} L ${chartWidth} ${baselineY} L 0 ${baselineY} Z`,
      };
    }

    let d = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i === 0 ? 0 : i - 1];
      const p1 = chartPoints[i];
      const p2 = chartPoints[i + 1];
      const p3 = chartPoints[i + 2 >= chartPoints.length ? chartPoints.length - 1 : i + 2];

      let cp1x = p1.x + (p2.x - p0.x) / 6;
      let cp1y = p1.y + (p2.y - p0.y) / 6;
      let cp2x = p2.x - (p3.x - p1.x) / 6;
      let cp2y = p2.y - (p3.y - p1.y) / 6;

      // Lock control points to baseline when both endpoints are at 0 baseline
      if (Math.abs(p1.y - baselineY) < 0.5 && Math.abs(p2.y - baselineY) < 0.5) {
        cp1y = baselineY;
        cp2y = baselineY;
      } else {
        // Clamp control points within chart bounds to eliminate negative dips
        cp1y = Math.min(baselineY, Math.max(chartPaddingTop, cp1y));
        cp2y = Math.min(baselineY, Math.max(chartPaddingTop, cp2y));
      }

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const area = `${d} L ${chartPoints[chartPoints.length - 1].x} ${baselineY} L ${chartPoints[0].x} ${baselineY} Z`;

    return { linePath: d, areaPath: area };
  }, [chartPoints, chartWidth, baselineY, chartPaddingTop]);

  const activeHoverPoint = hoveredIdx !== null && chartPoints[hoveredIdx] ? chartPoints[hoveredIdx] : null;

  // Chart Title & Units Display
  const chartMeta = useMemo(() => {
    if (activeMetric === 'cost') {
      return {
        title: 'Daily AI Cost Trajectory',
        subtitle: `Continuous ${period}-day financial AI spend incurred`,
        peakLabel: `Peak: $${rawHighest.toFixed(3)} USD`,
        activeUnit: 'Cost ($)',
      };
    }
    if (activeMetric === 'voice') {
      return {
        title: 'Daily AI Voice Streaming Trajectory',
        subtitle: `Continuous ${period}-day bidirectional voice minutes`,
        peakLabel: `Peak: ${rawHighest.toFixed(1)} mins`,
        activeUnit: 'Voice Mins',
      };
    }
    return {
      title: 'Daily Token Usage Trajectory',
      subtitle: `Continuous ${period}-day prompt & completion tokens consumed`,
      peakLabel: `Peak: ${rawHighest > 1000 ? `${(rawHighest / 1000).toFixed(1)}k` : rawHighest.toLocaleString()} tokens`,
      activeUnit: 'Tokens',
    };
  }, [activeMetric, period, rawHighest]);

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="AI Token Usage & Cost Management"
        description="Track AI token usage, voice audio minutes, merchant costs, gross margins, and budget caps."
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Top Metric Cards (Modular) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlatformStatCard
            title={`Total AI Cost (${period}D)`}
            value={(analytics?.summary.totalCostUsd || 0).toFixed(2)}
            prefix="$"
            icon={<DollarSign size={18} />}
            subtext={
              <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                <span>≈ ৳{(analytics?.summary.totalCostBdt || 0).toLocaleString()} BDT</span>
                <span>•</span>
                <span className="text-primary font-medium">Avg ${(analytics?.summary.avgCostPerSessionUsd || 0).toFixed(4)}/session</span>
              </div>
            }
          />

          <PlatformStatCard
            title="Tokens Consumed"
            value={((analytics?.summary.totalTokens || 0) / 1_000_000).toFixed(2)}
            suffix="M"
            icon={<Layers size={18} />}
            subtext={
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>In: {((analytics?.summary.totalPromptTokens || 0) / 1_000).toFixed(1)}k</span>
                <span>•</span>
                <span>Out: {((analytics?.summary.totalCompletionTokens || 0) / 1_000).toFixed(1)}k</span>
              </div>
            }
          />

          <PlatformStatCard
            title="Voice Audio Streamed"
            value={(analytics?.summary.totalVoiceMinutes || 0).toLocaleString()}
            suffix="mins"
            icon={<Radio size={18} />}
            subtext={<span className="text-muted-foreground">Bidirectional PCM16 Audio Engine</span>}
          />

          <PlatformStatCard
            title="AI Gross Profit Margin"
            value={`${overallGrossMargin}%`}
            icon={overallGrossMargin >= 75 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            highlight={overallGrossMargin >= 75}
            valueColor={overallGrossMargin >= 75 ? 'text-primary' : 'text-amber-400'}
            subtext={
              <span className="text-muted-foreground">Net MRR: ${(totalMrr - totalCost).toFixed(2)} / ${totalMrr.toFixed(2)}</span>
            }
          />
        </div>

        {/* Daily Time-Series & Channel Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart: Continuous SVG Spline Area Chart */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-surface-container p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Activity size={16} className="text-primary" />
                      {chartMeta.title}
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                      {chartMeta.peakLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {chartMeta.subtitle}
                  </p>
                </div>

                {/* Timeframe & Metric Selector Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Timeframe Pills */}
                  <div className="flex items-center gap-1 bg-surface-lowest p-1 rounded-lg border border-border">
                    {[
                      { label: '7D', value: 7 },
                      { label: '30D', value: 30 },
                      { label: '90D', value: 90 },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setPeriod(item.value)}
                        className={cn(
                          'px-2 py-0.5 text-xs font-semibold rounded-md transition-colors',
                          period === item.value
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Metric Pills */}
                  <div className="flex items-center gap-1 bg-surface-lowest p-1 rounded-lg border border-border">
                    <button
                      onClick={() => setActiveMetric('tokens')}
                      className={cn(
                        'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
                        activeMetric === 'tokens'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Tokens
                    </button>
                    <button
                      onClick={() => setActiveMetric('cost')}
                      className={cn(
                        'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
                        activeMetric === 'cost'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Cost ($)
                    </button>
                    <button
                      onClick={() => setActiveMetric('voice')}
                      className={cn(
                        'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
                        activeMetric === 'voice'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Voice Mins
                    </button>
                  </div>
                </div>
              </div>

              {/* SVG Area Chart Container */}
              <div className="relative pt-4">
                {loading ? (
                  <div className="h-44 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-primary mr-2" />
                    <span className="text-xs text-muted-foreground">Generating trajectory telemetry...</span>
                  </div>
                ) : (
                  <div
                    className="relative w-full h-44 cursor-crosshair select-none"
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="limeGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C8F031" stopOpacity="0.30" />
                          <stop offset="60%" stopColor="#C8F031" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#C8F031" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Reference Gridlines */}
                      <line
                        x1="0"
                        y1={chartPaddingTop}
                        x2={chartWidth}
                        y2={chartPaddingTop}
                        stroke="currentColor"
                        strokeDasharray="4 4"
                        className="text-border/60"
                        strokeWidth="1"
                      />
                      <line
                        x1="0"
                        y1={chartPaddingTop + chartDrawableHeight / 2}
                        x2={chartWidth}
                        y2={chartPaddingTop + chartDrawableHeight / 2}
                        stroke="currentColor"
                        strokeDasharray="4 4"
                        className="text-border/40"
                        strokeWidth="1"
                      />
                      <line
                        x1="0"
                        y1={baselineY}
                        x2={chartWidth}
                        y2={baselineY}
                        stroke="currentColor"
                        className="text-border/80"
                        strokeWidth="1"
                      />

                      {/* Area Fill */}
                      <path d={areaPath} fill="url(#limeGlow)" />

                      {/* Active Line Curve */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#C8F031"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Interactive Hover Crosshair Line & Point Dot */}
                      {activeHoverPoint && (
                        <g>
                          <line
                            x1={activeHoverPoint.x}
                            y1={chartPaddingTop}
                            x2={activeHoverPoint.x}
                            y2={baselineY}
                            stroke="#C8F031"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                            className="opacity-80"
                          />
                          <circle
                            cx={activeHoverPoint.x}
                            cy={activeHoverPoint.y}
                            r="5"
                            fill="#C8F031"
                            stroke="#000000"
                            strokeWidth="2"
                            className="shadow-md"
                          />
                        </g>
                      )}
                    </svg>

                    {/* Invisible Touch/Hover Columns for precise mouse capture */}
                    <div className="absolute inset-0 flex">
                      {continuousTimeline.map((_, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-full"
                          onMouseEnter={() => setHoveredIdx(idx)}
                        />
                      ))}
                    </div>

                    {/* Floating Tooltip Card */}
                    {activeHoverPoint && (
                      <div
                        className="absolute -top-14 z-30 pointer-events-none transform -translate-x-1/2 rounded-lg border border-border bg-surface-high/95 backdrop-blur-md px-3 py-1.5 shadow-2xl text-left text-xs transition-all duration-75"
                        style={{
                          left: `${(hoveredIdx! / Math.max(1, continuousTimeline.length - 1)) * 100}%`,
                        }}
                      >
                        <div className="text-[10px] font-semibold text-muted-foreground">
                          {activeHoverPoint.point.date}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 tabular-nums">
                          <span className="font-bold text-primary">
                            {activeMetric === 'cost'
                              ? `$${activeHoverPoint.point.costUsd.toFixed(3)} USD`
                              : activeMetric === 'voice'
                              ? `${activeHoverPoint.point.voiceMinutes.toFixed(1)} mins`
                              : `${activeHoverPoint.point.totalTokens.toLocaleString()} tokens`}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({activeHoverPoint.point.sessions} sessions)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline X-Axis Labels */}
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums pt-2 border-t border-border/60">
              <span className="font-medium">{formatChartDate(continuousTimeline[0]?.date) || 'Start'}</span>
              <span className="text-[11px] text-muted-foreground/80 font-semibold uppercase tracking-wider">
                {period === 7 ? '7-Day Trajectory' : period === 30 ? '30-Day Trajectory' : '90-Day Trajectory'}
              </span>
              <span className="font-medium">{formatChartDate(continuousTimeline[continuousTimeline.length - 1]?.date) || 'Today'}</span>
            </div>
          </div>

          {/* Sub Panel: Channel Distribution */}
          <div className="rounded-xl border border-border bg-surface-container p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Layers size={16} className="text-primary" />
                Cost by AI Service
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Financial spend across AI compute channels
              </p>

              <div className="space-y-3">
                {/* Voice Stream */}
                <div className="rounded-lg bg-surface-lowest p-3 border border-border/60">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Radio size={14} className="text-primary" />
                      Live AI Voice Gateway
                    </span>
                    <span className="font-semibold text-primary tabular-nums">
                      ${(analytics?.channelBreakdown.voice.costUsd || 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>{analytics?.channelBreakdown.voice.count || 0} streams</span>
                    <span>{((analytics?.channelBreakdown.voice.tokens || 0) / 1000).toFixed(1)}k tokens</span>
                  </div>
                </div>

                {/* Text Chat */}
                <div className="rounded-lg bg-surface-lowest p-3 border border-border/60">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Terminal size={14} className="text-chart-2" />
                      Text & Tool Orchestration
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      ${(analytics?.channelBreakdown.chat.costUsd || 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>{analytics?.channelBreakdown.chat.count || 0} turns</span>
                    <span>{((analytics?.channelBreakdown.chat.tokens || 0) / 1000).toFixed(1)}k tokens</span>
                  </div>
                </div>

                {/* RAG Vector */}
                <div className="rounded-lg bg-surface-lowest p-3 border border-border/60">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Database size={14} className="text-chart-4" />
                      RAG Embeddings & Ingestion
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      ${(analytics?.channelBreakdown.rag.costUsd || 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>{analytics?.channelBreakdown.rag.count || 0} embeddings</span>
                    <span>{((analytics?.channelBreakdown.rag.tokens || 0) / 1000).toFixed(1)}k tokens</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">AI Cost Efficiency:</span>
              <span className="font-bold text-primary tabular-nums">99.4% margin</span>
            </div>
          </div>
        </div>

        {/* Granular Merchant Cost & Gross Margin Breakdown Table */}
        <div className="rounded-xl border border-border bg-surface-container p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Merchant Token & AI Cost Breakdown
              </h3>
              <p className="text-xs text-muted-foreground">
                Store-by-store token allocation, voice streaming time, and store AI spend
              </p>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter store name, domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface-high text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-48 sm:w-60"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-2 py-1 text-xs">
                <SlidersHorizontal size={13} className="text-muted-foreground" />
                <span className="text-muted-foreground">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="cost" className="bg-surface-container">Highest AI Cost</option>
                  <option value="tokens" className="bg-surface-container">Most Tokens</option>
                  <option value="margin" className="bg-surface-container">Gross Margin</option>
                  <option value="mrr" className="bg-surface-container">Highest MRR</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                <tr>
                  <th className="px-4 py-3">Merchant Store</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3 text-right">Store MRR</th>
                  <th className="px-4 py-3 text-right">Tokens Consumed</th>
                  <th className="px-4 py-3 text-right">Voice Time</th>
                  <th className="px-4 py-3 text-right">AI Cost ($)</th>
                  <th className="px-4 py-3 text-right">Gross Margin</th>
                  <th className="px-4 py-3 text-center">Budget Guard</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Aggregating merchant token telemetry...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No merchant usage records match your search query.
                    </td>
                  </tr>
                ) : (
                  paginatedMerchants.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => handleOpenInspect(m)}
                      className="hover:bg-surface-high/60 transition-colors cursor-pointer"
                    >
                      {/* Merchant Name & Domain */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground hover:text-primary transition-colors">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground">{m.domain}</div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
                          m.planId === 'scale'
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : m.planId === 'growth'
                            ? 'bg-chart-2/10 text-chart-2 border-chart-2/30'
                            : 'bg-surface-high text-muted-foreground border-border'
                        )}>
                          {m.planName}
                        </span>
                      </td>

                      {/* MRR */}
                      <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                        ${m.mrrUsd.toFixed(2)}
                      </td>

                      {/* Tokens */}
                      <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                        {m.totalTokens > 1_000_000
                          ? `${(m.totalTokens / 1_000_000).toFixed(2)}M`
                          : m.totalTokens > 1_000
                          ? `${(m.totalTokens / 1_000).toFixed(1)}k`
                          : m.totalTokens}
                      </td>

                      {/* Voice Time */}
                      <td className="px-4 py-3 text-right font-medium text-muted-foreground tabular-nums">
                        {m.voiceMinutes}m
                      </td>

                      {/* AI Cost */}
                      <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                        ${m.aiCostUsd.toFixed(3)}
                      </td>

                      {/* Gross Margin % */}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        <span className={cn(
                          'inline-flex items-center gap-1',
                          m.grossMarginPercent >= 70 ? 'text-primary' : m.grossMarginPercent > 0 ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {m.grossMarginPercent}%
                        </span>
                      </td>

                      {/* Budget Guard Status */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {m.budgetCapUsd ? (
                          <div className="flex flex-col items-center">
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
                              m.budgetStatus === 'exceeded'
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-primary/10 text-primary border-primary/30'
                            )}>
                              {m.budgetStatus === 'exceeded' && <AlertTriangle size={10} />}
                              Cap: ${m.budgetCapUsd}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium">Unlimited</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenInspect(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-high hover:bg-surface-bright text-[11px] font-medium text-foreground border border-border transition-colors"
                          title="Inspect telemetry & budget"
                        >
                          <Eye size={12} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredMerchants.length}
            pageSize={pageSize}
            itemName="merchants"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* ── Merchant AI Telemetry & Budget Inspection Modal ── */}
      {inspectedMerchant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!savingBudget) setInspectedMerchant(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface-container p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">{inspectedMerchant.name}</h3>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
                    inspectedMerchant.planId === 'scale'
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : inspectedMerchant.planId === 'growth'
                      ? 'bg-chart-2/10 text-chart-2 border-chart-2/30'
                      : 'bg-surface-high text-muted-foreground border-border'
                  )}>
                    {inspectedMerchant.planName}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{inspectedMerchant.domain}</p>
              </div>

              <button
                onClick={() => setInspectedMerchant(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-high hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Spotlight Hero: Token Consumption ── */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Token Consumption
                </span>
                <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
                  {inspectedMerchant.totalTokens > 1_000_000
                    ? `${(inspectedMerchant.totalTokens / 1_000_000).toFixed(2)}M Tokens`
                    : inspectedMerchant.totalTokens > 10_000
                    ? `${(inspectedMerchant.totalTokens / 1000).toFixed(1)}k Tokens`
                    : 'Active Stream'}
                </span>
              </div>

              {/* Large Big Number */}
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold font-serif text-primary tabular-nums">
                  {inspectedMerchant.totalTokens.toLocaleString()}
                </div>
                <span className="text-xs text-muted-foreground font-medium">total tokens</span>
              </div>

              {/* Symmetrical In / Out Token Split */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-lg border border-border bg-surface-lowest p-2.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Input (Prompt)</span>
                  <span className="font-semibold text-foreground tabular-nums font-serif">
                    {(inspectedMerchant.promptTokens || 0).toLocaleString()}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-surface-lowest p-2.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Output (Completion)</span>
                  <span className="font-semibold text-foreground tabular-nums font-serif">
                    {(inspectedMerchant.completionTokens || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Symmetrical 2-Column Supporting Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Monthly AI Cost */}
              <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-lowest p-3.5 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly AI Cost
                </span>
                <div className="text-xl font-bold font-serif text-primary tabular-nums">
                  ${inspectedMerchant.aiCostUsd.toFixed(3)}
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  ≈ ৳{(inspectedMerchant.aiCostUsd * 122).toFixed(1)} BDT
                </div>
              </div>

              {/* Voice Streaming Compute */}
              <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-lowest p-3.5 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Voice Streaming
                </span>
                <div className="text-xl font-bold font-serif text-foreground tabular-nums">
                  {inspectedMerchant.voiceMinutes}m
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  {inspectedMerchant.sessionsCount || 0} {inspectedMerchant.sessionsCount === 1 ? 'session' : 'sessions'}
                </div>
              </div>
            </div>

            {/* Symmetrical Clean Budget Guard */}
            <div className="rounded-xl border border-border bg-surface-lowest p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <ShieldAlert size={14} className="text-primary" />
                  <span>Monthly Spend Limit</span>
                </div>
                {inspectedMerchant.budgetCapUsd ? (
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
                    inspectedMerchant.budgetStatus === 'exceeded'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-primary/10 text-primary border-primary/30'
                  )}>
                    Cap: ${inspectedMerchant.budgetCapUsd}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-medium">Unlimited</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                  <input
                    type="number"
                    placeholder="Set spend cap (leave blank for unlimited)"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-surface-container text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary tabular-nums"
                  />
                </div>
                <button
                  onClick={handleSaveBudget}
                  disabled={savingBudget}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs whitespace-nowrap"
                >
                  {savingBudget && <Loader2 size={13} className="animate-spin" />}
                  Save Cap
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-1">
              <button
                onClick={() => setInspectedMerchant(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-foreground bg-surface-high hover:bg-surface-bright transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
