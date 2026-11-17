import React from 'react';
import { NetworkDevice } from '@/src/types/network';

export interface ThroughputPoint {
  timeLabel: string;
  downloadMbps: number;
  uploadMbps: number;
}

interface BandwidthChartProps {
  history: ThroughputPoint[];
  maxWanMbps: number;
  devices: NetworkDevice[];
}

export const BandwidthChart: React.FC<BandwidthChartProps> = ({
  history,
  maxWanMbps,
  devices,
}) => {
  const width = 640;
  const height = 210;
  const padLeft = 42;
  const padRight = 14;
  const padTop = 16;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const peakY = Math.max(
    maxWanMbps,
    ...history.map((h) => Math.max(h.downloadMbps, h.uploadMbps)),
    10
  );

  const buildPath = (values: number[]) => {
    if (values.length === 0) return '';
    return values
      .map((v, i) => {
        const x = padLeft + (values.length === 1 ? chartW : (i / (values.length - 1)) * chartW);
        const y = padTop + chartH - (Math.min(v, peakY) / peakY) * chartH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const buildAreaPath = (values: number[]) => {
    if (values.length === 0) return '';
    const line = buildPath(values);
    const lastX = padLeft + chartW;
    const baseY = padTop + chartH;
    return `${line} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${padLeft.toFixed(1)} ${baseY.toFixed(1)} Z`;
  };

  const downValues = history.map((h) => h.downloadMbps);
  const upValues = history.map((h) => h.uploadMbps);

  const downLine = buildPath(downValues);
  const downArea = buildAreaPath(downValues);
  const upLine = buildPath(upValues);

  const topConsumers = [...devices]
    .sort((a, b) => b.usedGb - a.usedGb)
    .slice(0, 5);
  const maxUsed = Math.max(...topConsumers.map((d) => d.usedGb), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Live Throughput Chart */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              تدفق السرعة اللحظي للشبكة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إجمالي السحب الحالي مقارنة بالسعة القصوى للخط ({maxWanMbps} ميجابت/ث)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block" />
              التحميل (Download)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              الرفع (Upload)
            </span>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-52 select-none"
            role="img"
            aria-label="مخطط تدفق السرعة اللحظي للشبكة"
          >
            <defs>
              <linearGradient id="downAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padTop + chartH * (1 - ratio);
              const val = Math.round(peakY * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + chartW}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {downArea && <path d={downArea} fill="url(#downAreaGrad)" />}
            {downLine && (
              <path
                d={downLine}
                fill="none"
                stroke="#0d9488"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {upLine && (
              <path
                d={upLine}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {history.map((pt, idx) => {
              if (idx % 3 !== 0 && idx !== history.length - 1) return null;
              const x =
                padLeft +
                (history.length === 1 ? chartW : (idx / (history.length - 1)) * chartW);
              return (
                <text
                  key={`${pt.timeLabel}-${idx}`}
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {pt.timeLabel}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Top GB Consumers */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            أعلى الأجهزة استهلاكاً للباقة
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            توزيع الجيجابايت المستهلكة خلال الدورة الشهرية الحالية
          </p>
        </div>

        <div className="mt-4 space-y-3.5">
          {topConsumers.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              لا توجد أجهزة مسجلة حتى الآن.
            </p>
          ) : (
            topConsumers.map((dev) => {
              const widthPct = Math.max(4, Math.round((dev.usedGb / maxUsed) * 100));
              const quotaRatio =
                dev.quotaLimitGb > 0 ? dev.usedGb / dev.quotaLimitGb : 0;
              const barColor = dev.blocked
                ? 'bg-rose-600'
                : quotaRatio >= 0.85
                  ? 'bg-amber-500'
                  : 'bg-teal-600';

              return (
                <div key={dev.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {dev.name}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                      {dev.usedGb.toFixed(1)} GB
                      {dev.quotaLimitGb > 0 ? ` / ${dev.quotaLimitGb}` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
