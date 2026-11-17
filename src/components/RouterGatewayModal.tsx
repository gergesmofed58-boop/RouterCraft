import React, { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { ROUTER_MODEL_PRESETS } from '@/src/data/defaultNetwork';
import {
  RouterProfile,
  SCHEMA_LIMITS,
  clampNumber,
  sanitizeString,
} from '@/src/types/network';

interface RouterGatewayModalProps {
  router: RouterProfile;
  onClose: () => void;
  onSave: (patch: {
    name: string;
    brandModel: string;
    gatewayIp: string;
    wanDownloadMbps: number;
    wanUploadMbps: number;
    monthlyQuotaGb: number;
    billingDay: number;
  }) => void;
  onResetMonthlyQuota: () => void;
}

export const RouterGatewayModal: React.FC<RouterGatewayModalProps> = ({
  router,
  onClose,
  onSave,
  onResetMonthlyQuota,
}) => {
  const [name, setName] = useState(router.name);
  const [brandModel, setBrandModel] = useState(router.brandModel);
  const [gatewayIp, setGatewayIp] = useState(router.gatewayIp);
  const [wanDownloadMbps, setWanDownloadMbps] = useState(router.wanDownloadMbps);
  const [wanUploadMbps, setWanUploadMbps] = useState(router.wanUploadMbps);
  const [monthlyQuotaGb, setMonthlyQuotaGb] = useState(router.monthlyQuotaGb);
  const [billingDay, setBillingDay] = useState(router.billingDay);

  const handlePresetChange = (modelLabel: string) => {
    setBrandModel(modelLabel);
    const found = ROUTER_MODEL_PRESETS.find((p) => p.label === modelLabel);
    if (found) setGatewayIp(found.gatewayIp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: sanitizeString(name, SCHEMA_LIMITS.ROUTER_NAME_MAX, router.name),
      brandModel: sanitizeString(brandModel, SCHEMA_LIMITS.ROUTER_NAME_MAX, router.brandModel),
      gatewayIp: sanitizeString(gatewayIp, 45, '192.168.1.1'),
      wanDownloadMbps: clampNumber(Number(wanDownloadMbps), 1, 10000),
      wanUploadMbps: clampNumber(Number(wanUploadMbps), 1, 10000),
      monthlyQuotaGb: clampNumber(Number(monthlyQuotaGb), 1, 100000),
      billingDay: clampNumber(Number(billingDay), 1, 31),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            إعدادات الراوتر وسعة الباقة والخط
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                اسم الراوتر
              </label>
              <input
                type="text"
                required
                maxLength={SCHEMA_LIMITS.ROUTER_NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                موديل الراوتر (متوافق مع Router Chef)
              </label>
              <select
                value={brandModel}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                {ROUTER_MODEL_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                عنوان البوابة (Gateway IP)
              </label>
              <input
                type="text"
                dir="ltr"
                required
                value={gatewayIp}
                onChange={(e) => setGatewayIp(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                سرعة التحميل (Mbps)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={wanDownloadMbps}
                onChange={(e) => setWanDownloadMbps(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                سرعة الرفع (Mbps)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={wanUploadMbps}
                onChange={(e) => setWanUploadMbps(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                الباقة الشهرية الكلية (GB)
              </label>
              <input
                type="number"
                min={1}
                max={100000}
                value={monthlyQuotaGb}
                onChange={(e) => setMonthlyQuotaGb(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                يوم تجديد الباقة الشهرية
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={billingDay}
                onChange={(e) => setBillingDay(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                onResetMonthlyQuota();
                onClose();
              }}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير عداد الجيجات (بداية شهر جديد)</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
