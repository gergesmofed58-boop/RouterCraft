import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  EyeOff,
  Lock,
  Radio,
  Shield,
  Wifi,
} from 'lucide-react';
import { DNS_PRESETS } from '@/src/data/defaultNetwork';
import {
  QosMode,
  RouterProfile,
  SCHEMA_LIMITS,
  SecurityMode,
  clampNumber,
  sanitizeString,
} from '@/src/types/network';

interface WifiControlSectionProps {
  router: RouterProfile;
  onSaveWifiSettings: (patch: {
    wifi24Enabled: boolean;
    wifi24Ssid: string;
    wifi24Channel: string;
    wifi24Hidden: boolean;
    wifi5Enabled: boolean;
    wifi5Ssid: string;
    wifi5Channel: string;
    wifi5Hidden: boolean;
    guestEnabled: boolean;
    guestSsid: string;
    guestSpeedLimitMbps: number;
    txPowerPercent: 25 | 50 | 75 | 100;
    securityMode: SecurityMode;
    wpsEnabled: boolean;
    newDeviceAlert: boolean;
    autoBlockUnknown: boolean;
  }) => void;
  onSaveNetworkRouting: (patch: {
    dnsPrimary: string;
    dnsSecondary: string;
    qosMode: QosMode;
  }) => void;
}

export const WifiControlSection: React.FC<WifiControlSectionProps> = ({
  router,
  onSaveWifiSettings,
  onSaveNetworkRouting,
}) => {
  const [wifi24Enabled, setWifi24Enabled] = useState(router.wifi24Enabled);
  const [wifi24Ssid, setWifi24Ssid] = useState(router.wifi24Ssid);
  const [wifi24Channel, setWifi24Channel] = useState(router.wifi24Channel);
  const [wifi24Hidden, setWifi24Hidden] = useState(router.wifi24Hidden);

  const [wifi5Enabled, setWifi5Enabled] = useState(router.wifi5Enabled);
  const [wifi5Ssid, setWifi5Ssid] = useState(router.wifi5Ssid);
  const [wifi5Channel, setWifi5Channel] = useState(router.wifi5Channel);
  const [wifi5Hidden, setWifi5Hidden] = useState(router.wifi5Hidden);

  const [guestEnabled, setGuestEnabled] = useState(router.guestEnabled);
  const [guestSsid, setGuestSsid] = useState(router.guestSsid);
  const [guestSpeedLimitMbps, setGuestSpeedLimitMbps] = useState(router.guestSpeedLimitMbps);

  const [txPowerPercent, setTxPowerPercent] = useState<25 | 50 | 75 | 100>(
    router.txPowerPercent
  );
  const [securityMode, setSecurityMode] = useState<SecurityMode>(router.securityMode);
  const [wpsEnabled, setWpsEnabled] = useState(router.wpsEnabled);
  const [newDeviceAlert, setNewDeviceAlert] = useState(router.newDeviceAlert);
  const [autoBlockUnknown, setAutoBlockUnknown] = useState(router.autoBlockUnknown);

  const [dnsPrimary, setDnsPrimary] = useState(router.dnsPrimary);
  const [dnsSecondary, setDnsSecondary] = useState(router.dnsSecondary);
  const [qosMode, setQosMode] = useState<QosMode>(router.qosMode);

  const [copiedSsid, setCopiedSsid] = useState(false);

  useEffect(() => {
    setWifi24Enabled(router.wifi24Enabled);
    setWifi24Ssid(router.wifi24Ssid);
    setWifi24Channel(router.wifi24Channel);
    setWifi24Hidden(router.wifi24Hidden);
    setWifi5Enabled(router.wifi5Enabled);
    setWifi5Ssid(router.wifi5Ssid);
    setWifi5Channel(router.wifi5Channel);
    setWifi5Hidden(router.wifi5Hidden);
    setGuestEnabled(router.guestEnabled);
    setGuestSsid(router.guestSsid);
    setGuestSpeedLimitMbps(router.guestSpeedLimitMbps);
    setTxPowerPercent(router.txPowerPercent);
    setSecurityMode(router.securityMode);
    setWpsEnabled(router.wpsEnabled);
    setNewDeviceAlert(router.newDeviceAlert);
    setAutoBlockUnknown(router.autoBlockUnknown);
    setDnsPrimary(router.dnsPrimary);
    setDnsSecondary(router.dnsSecondary);
    setQosMode(router.qosMode);
  }, [router]);

  const handleSaveRadios = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWifiSettings({
      wifi24Enabled,
      wifi24Ssid: sanitizeString(wifi24Ssid, SCHEMA_LIMITS.SSID_MAX, 'Home_2.4G'),
      wifi24Channel: sanitizeString(wifi24Channel, 16, 'Auto'),
      wifi24Hidden,
      wifi5Enabled,
      wifi5Ssid: sanitizeString(wifi5Ssid, SCHEMA_LIMITS.SSID_MAX, 'Home_5G'),
      wifi5Channel: sanitizeString(wifi5Channel, 16, '36'),
      wifi5Hidden,
      guestEnabled,
      guestSsid: sanitizeString(guestSsid, SCHEMA_LIMITS.SSID_MAX, 'Home_Guests'),
      guestSpeedLimitMbps: clampNumber(Number(guestSpeedLimitMbps), 1, 10000),
      txPowerPercent,
      securityMode,
      wpsEnabled,
      newDeviceAlert,
      autoBlockUnknown,
    });
  };

  const handleSaveRouting = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNetworkRouting({
      dnsPrimary: sanitizeString(dnsPrimary, 45, '1.1.1.1'),
      dnsSecondary: sanitizeString(dnsSecondary, 45, '1.0.0.1'),
      qosMode,
    });
  };

  const handleExportConfig = () => {
    const payload = {
      routerName: router.name,
      brandModel: router.brandModel,
      gatewayIp: router.gatewayIp,
      wifi24: { enabled: wifi24Enabled, ssid: wifi24Ssid, channel: wifi24Channel, hidden: wifi24Hidden },
      wifi5: { enabled: wifi5Enabled, ssid: wifi5Ssid, channel: wifi5Channel, hidden: wifi5Hidden },
      guestWifi: { enabled: guestEnabled, ssid: guestSsid, speedLimitMbps: guestSpeedLimitMbps },
      security: { mode: securityMode, wpsEnabled, txPowerPercent, autoBlockUnknown },
      routing: { dnsPrimary, dnsSecondary, qosMode },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `router-wifi-profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    const text = `شبكة 2.4GHz: ${wifi24Ssid}\nشبكة 5GHz: ${wifi5Ssid}\nالتشفير: ${securityMode}\nDNS: ${dnsPrimary}`;
    navigator.clipboard?.writeText(text);
    setCopiedSsid(true);
    setTimeout(() => setCopiedSsid(false), 1800);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveRadios} className="space-y-6">
        {/* Wi-Fi Bands Control */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 2.4GHz Band */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wifi className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    شبكة 2.4 GHz (تغطية واسعة)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    مناسبة للمسافات البعيدة والأجهزة المنزلية الذكية
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={wifi24Enabled}
                  onChange={(e) => setWifi24Enabled(e.target.checked)}
                  className="w-4 h-4 accent-teal-700 rounded"
                />
                <span>{wifi24Enabled ? 'مفعّلة' : 'مغلقة'}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم الشبكة (SSID)
                </label>
                <input
                  type="text"
                  required
                  maxLength={SCHEMA_LIMITS.SSID_MAX}
                  value={wifi24Ssid}
                  onChange={(e) => setWifi24Ssid(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  القناة اللاسلكية (Channel)
                </label>
                <select
                  value={wifi24Channel}
                  onChange={(e) => setWifi24Channel(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="Auto">Auto (تلقائي)</option>
                  <option value="1">1 (الأقل تداخلاً)</option>
                  <option value="6">6 (متوازن)</option>
                  <option value="11">11 (الأفضل للمباني)</option>
                  <option value="13">13</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wifi24Hidden}
                onChange={(e) => setWifi24Hidden(e.target.checked)}
                className="w-4 h-4 accent-teal-700 rounded"
              />
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>إخفاء اسم الشبكة (Hidden SSID) عن المتطفلين</span>
            </label>
          </div>

          {/* 5GHz Band */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    شبكة 5 GHz (سرعة فائقة)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    مثالية للألعاب والبث بدقة 4K وتقليل التداخل
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={wifi5Enabled}
                  onChange={(e) => setWifi5Enabled(e.target.checked)}
                  className="w-4 h-4 accent-teal-700 rounded"
                />
                <span>{wifi5Enabled ? 'مفعّلة' : 'مغلقة'}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم الشبكة (SSID)
                </label>
                <input
                  type="text"
                  required
                  maxLength={SCHEMA_LIMITS.SSID_MAX}
                  value={wifi5Ssid}
                  onChange={(e) => setWifi5Ssid(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  القناة اللاسلكية (Channel)
                </label>
                <select
                  value={wifi5Channel}
                  onChange={(e) => setWifi5Channel(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="Auto">Auto (تلقائي)</option>
                  <option value="36">36 (نطاق نظيف)</option>
                  <option value="44">44</option>
                  <option value="149">149 (أداء عالٍ)</option>
                  <option value="161">161</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wifi5Hidden}
                onChange={(e) => setWifi5Hidden(e.target.checked)}
                className="w-4 h-4 accent-teal-700 rounded"
              />
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>إخفاء اسم شبكة 5 GHz عن الظهور العام</span>
            </label>
          </div>
        </div>

        {/* Guest Wi-Fi, Signal Power & Security Hardening */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  التحكم في التغطية وشبكة الضيوف وحماية الاختراق
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تحكم بقوة بث الإشارة لتقليل التسرب خارج المنزل، وعزل الضيوف عن أجهزتك الخاصة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
              >
                {copiedSsid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSsid ? 'تم النسخ' : 'نسخ بيانات الشبكة'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportConfig}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير الإعدادات</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Guest Wi-Fi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  شبكة الضيوف المعزولة
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guestEnabled}
                    onChange={(e) => setGuestEnabled(e.target.checked)}
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  <span>{guestEnabled ? 'مفعّلة' : 'مغلقة'}</span>
                </label>
              </div>
              <input
                type="text"
                maxLength={SCHEMA_LIMITS.SSID_MAX}
                value={guestSsid}
                onChange={(e) => setGuestSsid(e.target.value)}
                placeholder="اسم شبكة الضيوف"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  سقف سرعة الضيوف (Mbps)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={guestSpeedLimitMbps}
                  onChange={(e) => setGuestSpeedLimitMbps(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            {/* Tx Power & Security */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  قوة بث الإشارة (Tx Power)
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {([25, 50, 75, 100] as const).map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTxPowerPercent(pct)}
                      className={`py-1.5 text-xs font-mono tabular-nums font-medium rounded-md transition-colors ${
                        txPowerPercent === pct
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  خفض البث يقلل التقاط الإشارة من خارج الشقة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  بروتوكول التشفير
                </label>
                <select
                  value={securityMode}
                  onChange={(e) => setSecurityMode(e.target.value as SecurityMode)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="WPA3-SAE">WPA3-SAE (الأعلى أماناً)</option>
                  <option value="WPA2/WPA3">WPA2/WPA3 (متوافق وآمن)</option>
                  <option value="WPA2-PSK">WPA2-PSK (الأجهزة القديمة)</option>
                </select>
              </div>
            </div>

            {/* Intrusion Hardening Toggles */}
            <div className="space-y-3">
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                سياسات الحماية والإنذار
              </span>
              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!wpsEnabled}
                  onChange={(e) => setWpsEnabled(!e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-teal-700 rounded"
                />
                <span>تعطيل ثغرة WPS لمنع اختراق رمز PIN</span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDeviceAlert}
                  onChange={(e) => setNewDeviceAlert(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-teal-700 rounded"
                />
                <span>إرسال إشعار فوري عند اتصال أي جهاز جديد بالشبكة</span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBlockUnknown}
                  onChange={(e) => setAutoBlockUnknown(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-rose-600 rounded"
                />
                <span>حظر أي جهاز غريب غير معتمد تلقائياً فور اتصاله</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors"
            >
              حفظ وتطبيق إعدادات الواي فاي والحماية
            </button>
          </div>
        </div>
      </form>

      {/* DNS & QoS Form */}
      <form
        onSubmit={handleSaveRouting}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5"
      >
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            خوادم DNS الذكية وجودة الخدمة (QoS)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تسريع التصفح وحجب الإعلانات أو تفعيل فلترة العائلة مباشرة من الراوتر
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DNS_PRESETS.map((preset) => {
            const active = dnsPrimary === preset.primary;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDnsPrimary(preset.primary);
                  setDnsSecondary(preset.secondary);
                }}
                className={`text-right p-3.5 rounded-xl border transition-colors ${
                  active
                    ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {preset.name}
                </p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  {preset.primary} · {preset.secondary}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {preset.desc}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              DNS الأساسي
            </label>
            <input
              type="text"
              dir="ltr"
              required
              value={dnsPrimary}
              onChange={(e) => setDnsPrimary(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              DNS البديل
            </label>
            <input
              type="text"
              dir="ltr"
              required
              value={dnsSecondary}
              onChange={(e) => setDnsSecondary(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              وضع توزيع الأولوية (QoS)
            </label>
            <select
              value={qosMode}
              onChange={(e) => setQosMode(e.target.value as QosMode)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="fair">توزيع عادل تلقائي (Fair Queue)</option>
              <option value="gaming">أولوية الألعاب وتقليل البنج (Low Ping)</option>
              <option value="streaming">أولوية البث والاجتماعات</option>
              <option value="custom">مخصص حسب حدود المشتركين</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            <span>تطبيق فوري على مستوى البوابة الافتراضية ({router.gatewayIp})</span>
          </span>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            حفظ إعدادات DNS و QoS
          </button>
        </div>
      </form>
    </div>
  );
};
