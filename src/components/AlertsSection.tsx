import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { NetworkAlert, NetworkDevice } from '@/src/types/network';
import { formatRelativeTime } from '@/src/components/DeviceIcons';

interface AlertsSectionProps {
  alerts: NetworkAlert[];
  devices: NetworkDevice[];
  soundAlerts: boolean;
  newDeviceAlert: boolean;
  autoBlockUnknown: boolean;
  onToggleSound: () => void;
  onToggleNewDeviceAlert: () => void;
  onToggleAutoBlock: () => void;
  onMarkRead: (alert: NetworkAlert) => void;
  onMarkAllRead: () => void;
  onDeleteAlert: (alert: NetworkAlert) => void;
  onBlockFromAlert: (alert: NetworkAlert) => void;
  onTrustFromAlert: (alert: NetworkAlert) => void;
  onSimulateNewDevice: () => void;
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({
  alerts,
  devices,
  soundAlerts,
  newDeviceAlert,
  autoBlockUnknown,
  onToggleSound,
  onToggleNewDeviceAlert,
  onToggleAutoBlock,
  onMarkRead,
  onMarkAllRead,
  onDeleteAlert,
  onBlockFromAlert,
  onTrustFromAlert,
  onSimulateNewDevice,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'new_device'>('all');

  const deviceMap = useMemo(() => {
    const map = new Map<string, NetworkDevice>();
    devices.forEach((d) => map.set(d.id, d));
    return map;
  }, [devices]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'unread') return !a.read;
      if (filter === 'new_device') return a.type === 'new_device' || a.type === 'device_blocked';
      return true;
    });
  }, [alerts, filter]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6">
      {/* Alert Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              مركز إشعارات الشبكة ودخول الأجهزة الجديدة
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              راقب كل جهاز جديد يدخل شبكتك وتنبيهات استهلاك الباقة مع إمكانية الحظر الفوري
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSimulateNewDevice}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap"
            >
              اختبار إشعار جهاز جديد
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>
        </div>

        {/* Preferences Strip */}
        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={newDeviceAlert}
              onChange={onToggleNewDeviceAlert}
              className="w-4 h-4 accent-teal-700 rounded"
            />
            <Bell className="w-3.5 h-3.5 text-teal-600" />
            <span>تنبيه فوري عند دخول أي جهاز جديد</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={onToggleSound}
              className="w-4 h-4 accent-teal-700 rounded"
            />
            {soundAlerts ? (
              <Volume2 className="w-3.5 h-3.5 text-teal-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>صوت تنبيه عند اكتشاف متطفل</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer text-rose-700 dark:text-rose-400">
            <input
              type="checkbox"
              checked={autoBlockUnknown}
              onChange={onToggleAutoBlock}
              className="w-4 h-4 accent-rose-600 rounded"
            />
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>حظر الأجهزة غير المعروفة تلقائياً</span>
          </label>
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        {(
          [
            { id: 'all', label: `كل الإشعارات (${alerts.length})` },
            { id: 'unread', label: `غير مقروءة (${unreadCount})` },
            { id: 'new_device', label: 'دخول وحظر الأجهزة' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {filteredAlerts.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              لا توجد إشعارات في هذا التصنيف
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              الشبكة مستقرة وآمنة حالياً.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const linkedDevice = alert.deviceId ? deviceMap.get(alert.deviceId) : undefined;
            const Icon =
              alert.severity === 'critical'
                ? ShieldAlert
                : alert.severity === 'warning'
                  ? AlertTriangle
                  : Bell;
            const iconTone =
              alert.severity === 'critical'
                ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                : alert.severity === 'warning'
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40';

            return (
              <div
                key={alert.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  !alert.read ? 'bg-slate-50/70 dark:bg-slate-800/30' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconTone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {alert.title}
                      </h4>
                      {!alert.read && (
                        <span className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
                          جديد
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                      {alert.createdAtIso ? formatRelativeTime(alert.createdAtIso) : 'الآن'}
                      {alert.macAddress ? ` · MAC: ${alert.macAddress}` : ''}
                      {alert.ipAddress ? ` · IP: ${alert.ipAddress}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {linkedDevice && !linkedDevice.blocked && (
                    <button
                      type="button"
                      onClick={() => onBlockFromAlert(alert)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    >
                      حظر الجهاز
                    </button>
                  )}
                  {linkedDevice && !linkedDevice.trusted && !linkedDevice.blocked && (
                    <button
                      type="button"
                      onClick={() => onTrustFromAlert(alert)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                    >
                      اعتماد كموثوق
                    </button>
                  )}
                  {!alert.read && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(alert)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      تمت القراءة
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteAlert(alert)}
                    aria-label="حذف الإشعار"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
