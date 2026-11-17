import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Gauge,
  HardDrive,
  Lock,
  Plus,
  Router,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wifi,
} from 'lucide-react';
import { NetworkAlert, NetworkDevice, RouterProfile, SubscriberGroup } from '@/src/types/network';
import { BandwidthChart, ThroughputPoint } from '@/src/components/BandwidthChart';
import { DeviceTypeIcon, formatUptime } from '@/src/components/DeviceIcons';

interface OverviewSectionProps {
  router: RouterProfile;
  devices: NetworkDevice[];
  subscribers: SubscriberGroup[];
  alerts: NetworkAlert[];
  history: ThroughputPoint[];
  liveTrafficEnabled: boolean;
  onToggleLiveTraffic: () => void;
  onSimulateNewDevice: () => void;
  onOpenRouterModal: () => void;
  onNavigateTab: (tab: 'devices' | 'subscribers' | 'wifi' | 'alerts') => void;
  onToggleBlockDevice: (device: NetworkDevice) => void;
  onTrustDevice: (device: NetworkDevice) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  router,
  devices,
  subscribers,
  alerts,
  history,
  liveTrafficEnabled,
  onToggleLiveTraffic,
  onSimulateNewDevice,
  onOpenRouterModal,
  onNavigateTab,
  onToggleBlockDevice,
  onTrustDevice,
}) => {
  const [imgError, setImgError] = useState(false);

  const onlineDevices = devices.filter((d) => d.online && !d.blocked);
  const blockedDevices = devices.filter((d) => d.blocked);
  const untrustedOnline = devices.filter((d) => !d.trusted && !d.blocked);
  const unreadAlerts = alerts.filter((a) => !a.read);

  const totalCurrentDown = onlineDevices.reduce((acc, d) => acc + d.currentDownMbps, 0);
  const totalCurrentUp = onlineDevices.reduce((acc, d) => acc + d.currentUpMbps, 0);
  const remainingQuotaGb = Math.max(0, router.monthlyQuotaGb - router.usedQuotaGb);
  const quotaPct = Math.min(
    100,
    Math.round((router.usedQuotaGb / Math.max(1, router.monthlyQuotaGb)) * 100)
  );

  const snrQuality =
    router.snrMarginDown >= 12
      ? 'ممتازة'
      : router.snrMarginDown >= 7
        ? 'مقبولة'
        : 'ضعيفة';

  return (
    <div className="space-y-6">
      {/* Router Hardware & Line Diagnostics Hero Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{router.brandModel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{router.gatewayIp}</span>
                <span aria-hidden="true">·</span>
                <span>{router.securityMode}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {router.name}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onToggleLiveTraffic}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 ${
                  liveTrafficEnabled
                    ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{liveTrafficEnabled ? 'مراقبة حية مفعّلة' : 'تفعيل المراقبة الحية'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenRouterModal}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>إعدادات الخط والراوتر</span>
              </button>
            </div>
          </div>

          {/* Line Quality Diagnostics Strip (Router Chef style metrics without card nesting) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">أقصى سرعة للخط</p>
              <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {router.wanDownloadMbps} / {router.wanUploadMbps}{' '}
                <span className="text-xs font-normal text-slate-500">Mbps</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">هامش التشويش SNR</p>
              <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {router.snrMarginDown.toFixed(1)} dB{' '}
                <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">
                  ({snrQuality})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">فقد الإشارة Attenuation</p>
              <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {router.lineAttenuationDown.toFixed(1)} dB
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">مدة التشغيل المتصل</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatUptime(router.uptimeSeconds)}
              </p>
            </div>
          </div>

          {/* Monthly Quota Bar */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                استهلاك الباقة الشهرية الكلي
              </span>
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                مستهلك {router.usedQuotaGb.toFixed(1)} GB · متبقي {remainingQuotaGb.toFixed(1)} GB من أصل{' '}
                {router.monthlyQuotaGb} GB ({quotaPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  quotaPct >= 90
                    ? 'bg-rose-600'
                    : quotaPct >= 75
                      ? 'bg-amber-500'
                      : 'bg-teal-600'
                }`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hardware Showcase Frame */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
          <div className="relative h-44 lg:h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            {!imgError ? (
              <img
                src="/src/assets/images/router_hardware_unit_1794898169844.jpg"
                alt="وحدة راوتر Wi-Fi 6 ثنائية النطاق"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                <Router className="w-10 h-10" />
                <span className="text-xs font-medium">{router.brandModel}</span>
              </div>
            )}
          </div>
          <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">حالة البث اللاسلكي</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {router.wifi24Enabled ? '2.4GHz نشط' : '2.4GHz متوقف'} ·{' '}
                {router.wifi5Enabled ? '5GHz نشط' : '5GHz متوقف'} · طاقة {router.txPowerPercent}%
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('wifi')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              ضبط الواي فاي
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">السحب اللحظي للشبكة</span>
            <Gauge className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {totalCurrentDown.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">Mbps تحميل</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            رفع حالي: {totalCurrentUp.toFixed(1)} Mbps · نمط QoS: {router.qosMode}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('devices')}
          className="text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 rounded-xl p-4 space-y-2 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">الأجهزة المتصلة والمحظورة</span>
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {onlineDevices.length}{' '}
            <span className="text-xs font-normal text-slate-500">متصل الآن</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {blockedDevices.length} محظور · {untrustedOnline.length} جهاز غير موثوق
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('subscribers')}
          className="text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 rounded-xl p-4 space-y-2 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">مجموعات المشتركين</span>
            <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {subscribers.length}{' '}
            <span className="text-xs font-normal text-slate-500">مشتركين</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subscribers.filter((s) => s.paused).length} متوقف مؤقتاً · تقسيم جيجات نشط
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('alerts')}
          className="text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 rounded-xl p-4 space-y-2 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">الأمان وإشعارات المتطفلين</span>
            {unreadAlerts.length > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {unreadAlerts.length}{' '}
            <span className="text-xs font-normal text-slate-500">تنبيه غير مقروء</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            الحظر التلقائي للغرباء: {router.autoBlockUnknown ? 'مفعّل' : 'إشعار فقط'}
          </p>
        </button>
      </div>

      {/* Live Bandwidth & Top Usage Charts */}
      <BandwidthChart
        history={history}
        maxWanMbps={router.wanDownloadMbps}
        devices={devices}
      />

      {/* Untrusted / Recent Devices Quick Review + Simulator Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              نظرة سريعة على الأجهزة النشطة والمراقبة الأمنية
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              يمكنك اختبار نظام كشف الأجهزة الجديدة أو حظر أي جهاز مباشرة من هنا
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onSimulateNewDevice}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>محاكاة دخول جهاز جديد</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('devices')}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              إدارة كل الأجهزة ({devices.length})
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {devices.slice(0, 6).map((device) => (
            <div
              key={device.id}
              className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                  <DeviceTypeIcon type={device.deviceType} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {device.name}
                    </span>
                    {!device.trusted && !device.blocked && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>جديد غير موثوق</span>
                      </span>
                    )}
                    {device.blocked && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>محظور</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                    {device.ipAddress} · {device.macAddress} · {device.band}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {device.blocked
                      ? '0.0 Mbps'
                      : `${device.currentDownMbps.toFixed(1)} ↓ / ${device.currentUpMbps.toFixed(1)} ↑ Mbps`}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <HardDrive className="w-3 h-3 inline ml-1" />
                    {device.usedGb.toFixed(1)} GB مستهلك
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!device.trusted && !device.blocked && (
                    <button
                      type="button"
                      onClick={() => onTrustDevice(device)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors whitespace-nowrap"
                    >
                      اعتماد
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleBlockDevice(device)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      device.blocked
                        ? 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        : 'border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                    }`}
                  >
                    {device.blocked ? 'فك الحظر' : 'حظر'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
