import React, { useMemo, useState } from 'react';
import {
  Clock,
  PauseCircle,
  PlayCircle,
  Plus,
  Scale,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  NetworkDevice,
  RouterProfile,
  SCHEMA_LIMITS,
  SubscriberGroup,
  SubscriberPriority,
  clampNumber,
  sanitizeString,
} from '@/src/types/network';

interface SubscribersSectionProps {
  router: RouterProfile;
  subscribers: SubscriberGroup[];
  devices: NetworkDevice[];
  onCreateSubscriber: (payload: Omit<SubscriberGroup, 'id' | 'ownerId' | 'routerId'>) => void;
  onUpdateSubscriber: (
    subscriber: SubscriberGroup,
    patch: Omit<SubscriberGroup, 'id' | 'ownerId' | 'routerId'>
  ) => void;
  onDeleteSubscriber: (subscriber: SubscriberGroup) => void;
  onAutoBalance: () => void;
}

export const SubscribersSection: React.FC<SubscribersSectionProps> = ({
  router,
  subscribers,
  devices,
  onCreateSubscriber,
  onUpdateSubscriber,
  onDeleteSubscriber,
  onAutoBalance,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriberGroup | null>(null);

  const [name, setName] = useState('');
  const [speedLimitMbps, setSpeedLimitMbps] = useState(20);
  const [uploadLimitMbps, setUploadLimitMbps] = useState(5);
  const [quotaLimitGb, setQuotaLimitGb] = useState(80);
  const [priority, setPriority] = useState<SubscriberPriority>('normal');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleStart, setScheduleStart] = useState('23:00');
  const [scheduleEnd, setScheduleEnd] = useState('07:00');

  const totalAllocatedQuota = useMemo(
    () => subscribers.reduce((acc, s) => acc + s.quotaLimitGb, 0),
    [subscribers]
  );

  const totalAllocatedSpeed = useMemo(
    () => subscribers.reduce((acc, s) => acc + s.speedLimitMbps, 0),
    [subscribers]
  );

  const devicesBySubscriber = useMemo(() => {
    const map = new Map<string, NetworkDevice[]>();
    devices.forEach((d) => {
      if (!d.subscriberId) return;
      const list = map.get(d.subscriberId) || [];
      list.push(d);
      map.set(d.subscriberId, list);
    });
    return map;
  }, [devices]);

  const openCreateModal = () => {
    setEditingSub(null);
    setName('');
    setSpeedLimitMbps(20);
    setUploadLimitMbps(5);
    setQuotaLimitGb(60);
    setPriority('normal');
    setScheduleEnabled(false);
    setScheduleStart('23:00');
    setScheduleEnd('07:00');
    setModalOpen(true);
  };

  const openEditModal = (sub: SubscriberGroup) => {
    setEditingSub(sub);
    setName(sub.name);
    setSpeedLimitMbps(sub.speedLimitMbps);
    setUploadLimitMbps(sub.uploadLimitMbps);
    setQuotaLimitGb(sub.quotaLimitGb);
    setPriority(sub.priority);
    setScheduleEnabled(sub.scheduleEnabled);
    setScheduleStart(sub.scheduleStart);
    setScheduleEnd(sub.scheduleEnd);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validStart = SCHEMA_LIMITS.TIME_REGEX.test(scheduleStart) ? scheduleStart : '23:00';
    const validEnd = SCHEMA_LIMITS.TIME_REGEX.test(scheduleEnd) ? scheduleEnd : '07:00';

    const payload = {
      name: sanitizeString(name, SCHEMA_LIMITS.SUBSCRIBER_NAME_MAX, 'مشترك جديد'),
      speedLimitMbps: clampNumber(Number(speedLimitMbps), 0, 10000),
      uploadLimitMbps: clampNumber(Number(uploadLimitMbps), 0, 10000),
      quotaLimitGb: clampNumber(Number(quotaLimitGb), 0, 100000),
      usedGb: editingSub ? editingSub.usedGb : 0,
      priority,
      paused: editingSub ? editingSub.paused : false,
      scheduleEnabled,
      scheduleStart: validStart,
      scheduleEnd: validEnd,
    };

    if (editingSub) {
      onUpdateSubscriber(editingSub, payload);
    } else {
      onCreateSubscriber(payload);
    }
    setModalOpen(false);
  };

  const togglePause = (sub: SubscriberGroup) => {
    onUpdateSubscriber(sub, {
      name: sub.name,
      speedLimitMbps: sub.speedLimitMbps,
      uploadLimitMbps: sub.uploadLimitMbps,
      quotaLimitGb: sub.quotaLimitGb,
      usedGb: sub.usedGb,
      priority: sub.priority,
      paused: !sub.paused,
      scheduleEnabled: sub.scheduleEnabled,
      scheduleStart: sub.scheduleStart,
      scheduleEnd: sub.scheduleEnd,
    });
  };

  const priorityLabel = (p: SubscriberPriority) => {
    if (p === 'high') return 'أولوية قصوى';
    if (p === 'low') return 'أولوية منخفضة';
    return 'أولوية عادية';
  };

  const quotaBudgetPct = Math.min(
    100,
    Math.round((totalAllocatedQuota / Math.max(1, router.monthlyQuotaGb)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Budget & Auto-Balance Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              تقسيم السرعة والجيجات على المشتركين
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              خصص باقة شهرية وسرعة تحميل ورفع محددة وجدول زمني لكل شقة أو مجموعة أجهزة
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onAutoBalance}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>توزيع تلقائي عادل للباقة</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مشترك جديد</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                إجمالي الجيجات الموزعة على المشتركين
              </span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                {totalAllocatedQuota} GB / {router.monthlyQuotaGb} GB
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalAllocatedQuota > router.monthlyQuotaGb ? 'bg-amber-500' : 'bg-teal-600'
                }`}
                style={{ width: `${quotaBudgetPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-2.5">
            <span className="text-slate-600 dark:text-slate-300">
              مجموع حدود السرعة المخصصة / سرعة الخط
            </span>
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
              {totalAllocatedSpeed} Mbps · خطك {router.wanDownloadMbps} Mbps
            </span>
          </div>
        </div>
      </div>

      {/* Subscribers Grid */}
      {subscribers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            لا توجد مجموعات مشتركين مضافة حالياً
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            أضف أول مشترك لتقسيم السرعة والجيجات بين أفراد الأسرة أو الشقق المجاورة.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors"
          >
            إضافة أول مشترك
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subscribers.map((sub) => {
            const linked = devicesBySubscriber.get(sub.id) || [];
            const usedPct =
              sub.quotaLimitGb > 0
                ? Math.min(100, Math.round((sub.usedGb / sub.quotaLimitGb) * 100))
                : 0;

            return (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {priorityLabel(sub.priority)} · {linked.length} أجهزة مرتبطة
                      {sub.paused ? ' · متوقف مؤقتاً' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => togglePause(sub)}
                      title={sub.paused ? 'استئناف الإنترنت' : 'إيقاف مؤقت'}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors inline-flex items-center gap-1 ${
                        sub.paused
                          ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          : 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                      }`}
                    >
                      {sub.paused ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>تشغيل</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>إيقاف</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(sub)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label={`تعديل ${sub.name}`}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSubscriber(sub)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      aria-label={`حذف ${sub.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">حد التحميل</p>
                    <p className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {sub.speedLimitMbps > 0 ? `${sub.speedLimitMbps} Mbps` : 'مفتوح'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">حد الرفع</p>
                    <p className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {sub.uploadLimitMbps > 0 ? `${sub.uploadLimitMbps} Mbps` : 'مفتوح'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">الجدول الزمني</p>
                    <p className="mt-0.5 font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {sub.scheduleEnabled ? `${sub.scheduleStart} - ${sub.scheduleEnd}` : 'دائم'}
                    </p>
                  </div>
                </div>

                {/* Quota Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-slate-600 dark:text-slate-300">
                      الاستهلاك: {sub.usedGb.toFixed(1)} GB
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      الحصة: {sub.quotaLimitGb > 0 ? `${sub.quotaLimitGb} GB (${usedPct}%)` : 'غير محدودة'}
                    </span>
                  </div>
                  {sub.quotaLimitGb > 0 && (
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usedPct >= 90
                            ? 'bg-rose-600'
                            : usedPct >= 75
                              ? 'bg-amber-500'
                              : 'bg-teal-600'
                        }`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Linked Devices */}
                {linked.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    الأجهزة: {linked.map((d) => d.name).join(' · ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Subscriber Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {editingSub ? `تعديل مشترك: ${editingSub.name}` : 'إضافة مشترك / مجموعة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم المشترك أو المجموعة
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={SCHEMA_LIMITS.SUBSCRIBER_NAME_MAX}
                    placeholder="مثال: شقة الدور الثاني"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    أولوية التوجيه (QoS)
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SubscriberPriority)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="high">أولوية قصوى (High)</option>
                    <option value="normal">أولوية عادية (Normal)</option>
                    <option value="low">أولوية منخفضة (Low)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    سرعة التحميل (Mbps)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={speedLimitMbps}
                    onChange={(e) => setSpeedLimitMbps(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    سرعة الرفع (Mbps)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={uploadLimitMbps}
                    onChange={(e) => setUploadLimitMbps(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    الحصة الشهرية (GB)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={quotaLimitGb}
                    onChange={(e) => setQuotaLimitGb(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  <span>تفعيل جدول الإيقاف الليلي التلقائي (الرقابة الأبوية)</span>
                </label>

                {scheduleEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">يبدأ الإيقاف الساعة</label>
                      <input
                        type="time"
                        value={scheduleStart}
                        onChange={(e) => setScheduleStart(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">يعود التشغيل الساعة</label>
                      <input
                        type="time"
                        value={scheduleEnd}
                        onChange={(e) => setScheduleEnd(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                >
                  {editingSub ? 'حفظ التعديلات' : 'إنشاء المشترك'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
