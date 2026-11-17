import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Globe,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  DeviceType,
  NetworkDevice,
  SCHEMA_LIMITS,
  SubscriberGroup,
  clampNumber,
  sanitizeString,
} from '@/src/types/network';
import {
  DeviceTypeIcon,
  formatRelativeTime,
  getDeviceTypeLabel,
  getSignalLabel,
} from '@/src/components/DeviceIcons';

interface DevicesSectionProps {
  devices: NetworkDevice[];
  subscribers: SubscriberGroup[];
  maxWanDownMbps: number;
  maxWanUpMbps: number;
  onToggleBlock: (device: NetworkDevice) => void;
  onTrustDevice: (device: NetworkDevice) => void;
  onUpdateDevicePolicy: (
    device: NetworkDevice,
    patch: {
      name: string;
      deviceType: DeviceType;
      subscriberId: string;
      speedLimitDownMbps: number;
      speedLimitUpMbps: number;
      quotaLimitGb: number;
      trusted: boolean;
      blocked: boolean;
    }
  ) => void;
  onAddManualMacBlock: (payload: { name: string; macAddress: string }) => void;
  onDeleteDevice: (device: NetworkDevice) => void;
  onSimulateNewDevice: () => void;
  onInspectDomains: (device: NetworkDevice) => void;
}

type DeviceFilter = 'all' | 'online' | 'blocked' | 'untrusted';

export const DevicesSection: React.FC<DevicesSectionProps> = ({
  devices,
  subscribers,
  maxWanDownMbps,
  maxWanUpMbps,
  onToggleBlock,
  onTrustDevice,
  onUpdateDevicePolicy,
  onAddManualMacBlock,
  onDeleteDevice,
  onSimulateNewDevice,
  onInspectDomains,
}) => {
  const [filter, setFilter] = useState<DeviceFilter>('all');
  const [search, setSearch] = useState('');
  const [editingDevice, setEditingDevice] = useState<NetworkDevice | null>(null);
  const [showMacModal, setShowMacModal] = useState(false);

  // Edit Policy Modal State
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<DeviceType>('phone');
  const [editSubscriberId, setEditSubscriberId] = useState('');
  const [editSpeedDown, setEditSpeedDown] = useState(0);
  const [editSpeedUp, setEditSpeedUp] = useState(0);
  const [editQuotaGb, setEditQuotaGb] = useState(0);
  const [editTrusted, setEditTrusted] = useState(true);
  const [editBlocked, setEditBlocked] = useState(false);

  // Manual MAC Block Modal State
  const [manualMacName, setManualMacName] = useState('');
  const [manualMacAddress, setManualMacAddress] = useState('');
  const [macError, setMacError] = useState('');

  const openEditor = (dev: NetworkDevice) => {
    setEditingDevice(dev);
    setEditName(dev.name);
    setEditType(dev.deviceType);
    setEditSubscriberId(dev.subscriberId);
    setEditSpeedDown(dev.speedLimitDownMbps);
    setEditSpeedUp(dev.speedLimitUpMbps);
    setEditQuotaGb(dev.quotaLimitGb);
    setEditTrusted(dev.trusted);
    setEditBlocked(dev.blocked);
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    onUpdateDevicePolicy(editingDevice, {
      name: sanitizeString(editName, SCHEMA_LIMITS.DEVICE_NAME_MAX, editingDevice.name),
      deviceType: editType,
      subscriberId: editSubscriberId,
      speedLimitDownMbps: clampNumber(Number(editSpeedDown), 0, 10000),
      speedLimitUpMbps: clampNumber(Number(editSpeedUp), 0, 10000),
      quotaLimitGb: clampNumber(Number(editQuotaGb), 0, 100000),
      trusted: editTrusted,
      blocked: editBlocked,
    });
    setEditingDevice(null);
  };

  const handleManualBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedMac = manualMacAddress.trim().toUpperCase();
    if (!SCHEMA_LIMITS.MAC_REGEX.test(cleanedMac)) {
      setMacError('يرجى إدخال عنوان MAC صحيح مثل AA:BB:CC:11:22:33');
      return;
    }
    onAddManualMacBlock({
      name: sanitizeString(manualMacName, SCHEMA_LIMITS.DEVICE_NAME_MAX, 'جهاز محظور يدوياً'),
      macAddress: cleanedMac,
    });
    setManualMacName('');
    setManualMacAddress('');
    setMacError('');
    setShowMacModal(false);
  };

  const subscriberMap = useMemo(() => {
    const map = new Map<string, SubscriberGroup>();
    subscribers.forEach((s) => map.set(s.id, s));
    return map;
  }, [subscribers]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((dev) => {
      if (filter === 'online' && (!dev.online || dev.blocked)) return false;
      if (filter === 'blocked' && !dev.blocked) return false;
      if (filter === 'untrusted' && (dev.trusted || dev.blocked)) return false;

      if (!q) return true;
      return (
        dev.name.toLowerCase().includes(q) ||
        dev.hostname.toLowerCase().includes(q) ||
        dev.macAddress.toLowerCase().includes(q) ||
        dev.ipAddress.toLowerCase().includes(q) ||
        dev.vendor.toLowerCase().includes(q)
      );
    });
  }, [devices, filter, search]);

  const counts = useMemo(
    () => ({
      all: devices.length,
      online: devices.filter((d) => d.online && !d.blocked).length,
      blocked: devices.filter((d) => d.blocked).length,
      untrusted: devices.filter((d) => !d.trusted && !d.blocked).length,
    }),
    [devices]
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(
            [
              { id: 'all', label: `الكل (${counts.all})` },
              { id: 'online', label: `متصل (${counts.online})` },
              { id: 'untrusted', label: `غير موثوق (${counts.untrusted})` },
              { id: 'blocked', label: `محظور (${counts.blocked})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو IP أو MAC..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMacModal(true)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>حظر MAC يدوياً</span>
          </button>

          <button
            type="button"
            onClick={onSimulateNewDevice}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فحص / محاكاة جهاز جديد</span>
          </button>
        </div>
      </div>

      {/* High-Density Devices Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filteredDevices.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              لا توجد أجهزة مطابقة لمعايير البحث الحالية.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearch('');
              }}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
            >
              عرض جميع الأجهزة
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">الجهاز والشبكة</th>
                  <th className="py-3 px-4">المشترك</th>
                  <th className="py-3 px-4">السرعة اللحظية / الحد</th>
                  <th className="py-3 px-4">كمية الاستهلاك</th>
                  <th className="py-3 px-4">الحالة والأمان</th>
                  <th className="py-3 px-4 text-left">التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredDevices.map((dev) => {
                  const sub = dev.subscriberId ? subscriberMap.get(dev.subscriberId) : undefined;
                  const sig = getSignalLabel(dev.rssi, dev.band);
                  const quotaPct =
                    dev.quotaLimitGb > 0
                      ? Math.min(100, Math.round((dev.usedGb / dev.quotaLimitGb) * 100))
                      : 0;

                  return (
                    <tr
                      key={dev.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                            <DeviceTypeIcon type={dev.deviceType} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {dev.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                              {dev.ipAddress} · {dev.macAddress} · {dev.vendor}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {dev.band} · إشارة {sig.label} ({dev.rssi} dBm) ·{' '}
                              {formatRelativeTime(dev.lastSeenAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {sub ? sub.name : 'بدون مجموعة'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          {dev.blocked || !dev.online
                            ? '0.0 ↓ / 0.0 ↑ Mbps'
                            : `${dev.currentDownMbps.toFixed(1)} ↓ / ${dev.currentUpMbps.toFixed(1)} ↑ Mbps`}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          الحد:{' '}
                          {dev.speedLimitDownMbps > 0
                            ? `${dev.speedLimitDownMbps} / ${dev.speedLimitUpMbps} Mbps`
                            : 'مفتوح'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="text-slate-900 dark:text-slate-100 font-medium">
                              {dev.usedGb.toFixed(1)} GB
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {dev.quotaLimitGb > 0 ? `${dev.quotaLimitGb} GB` : 'غير محدود'}
                            </span>
                          </div>
                          {dev.quotaLimitGb > 0 && (
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  quotaPct >= 90
                                    ? 'bg-rose-600'
                                    : quotaPct >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-teal-600'
                                }`}
                                style={{ width: `${quotaPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {dev.blocked ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                            <Ban className="w-3.5 h-3.5" />
                            <span>محظور من الشبكة</span>
                          </span>
                        ) : !dev.trusted ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>جهاز جديد غير موثوق</span>
                          </span>
                        ) : dev.online ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>متصل وموثوق</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            غير متصل حالياً
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {!dev.trusted && !dev.blocked && (
                            <button
                              type="button"
                              onClick={() => onTrustDevice(dev)}
                              title="اعتماد الجهاز كجهاز موثوق"
                              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                            >
                              اعتماد
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onInspectDomains(dev)}
                            title="عرض المواقع المستخدمة على هذا الجهاز"
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>المواقع</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditor(dev)}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>السرعة والحصة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleBlock(dev)}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              dev.blocked
                                ? 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                : 'border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                            }`}
                          >
                            {dev.blocked ? 'فك الحظر' : 'حظر'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDevice(dev)}
                            aria-label={`حذف ${dev.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Device Speed & Quota Modal */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  التحكم في سرعة وحصة الجهاز
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingDevice.macAddress} · {editingDevice.ipAddress}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditor} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    الاسم المميز للجهاز
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={SCHEMA_LIMITS.DEVICE_NAME_MAX}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    نوع الجهاز
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as DeviceType)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {(['phone', 'laptop', 'tv', 'console', 'tablet', 'iot', 'other'] as const).map(
                      (t) => (
                        <option key={t} value={t}>
                          {getDeviceTypeLabel(t)}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  تعيين إلى مجموعة مشترك
                </label>
                <select
                  value={editSubscriberId}
                  onChange={(e) => setEditSubscriberId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">بدون مجموعة مشترك</option>
                  {subscribers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.speedLimitMbps > 0 ? `${s.speedLimitMbps} Mbps` : 'مفتوح'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    حد التحميل (Mbps)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={maxWanDownMbps * 10}
                    step={1}
                    value={editSpeedDown}
                    onChange={(e) => setEditSpeedDown(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-[11px] text-slate-400">0 = بدون حد</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    حد الرفع (Mbps)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={maxWanUpMbps * 10}
                    step={1}
                    value={editSpeedUp}
                    onChange={(e) => setEditSpeedUp(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    حصة الجيجات (GB)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    step={1}
                    value={editQuotaGb}
                    onChange={(e) => setEditQuotaGb(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-[11px] text-slate-400">0 = مفتوح</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editTrusted}
                    onChange={(e) => setEditTrusted(e.target.checked)}
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>جهاز موثوق</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-rose-700 dark:text-rose-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editBlocked}
                    onChange={(e) => setEditBlocked(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 rounded"
                  />
                  <Ban className="w-4 h-4" />
                  <span>حظر من الشبكة</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                >
                  حفظ سياسة الجهاز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual MAC Blacklist Modal */}
      {showMacModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                إضافة عنوان MAC لقائمة الحظر
              </h3>
              <button
                type="button"
                onClick={() => setShowMacModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualBlockSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  وصف الجهاز
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: جهاز متطفل خارجي"
                  maxLength={SCHEMA_LIMITS.DEVICE_NAME_MAX}
                  value={manualMacName}
                  onChange={(e) => setManualMacName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان MAC Address
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="AA:BB:CC:11:22:33"
                  value={manualMacAddress}
                  onChange={(e) => {
                    setManualMacAddress(e.target.value);
                    setMacError('');
                  }}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                {macError && <p className="text-xs text-rose-600 mt-1">{macError}</p>}
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMacModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  حظر العنوان فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
