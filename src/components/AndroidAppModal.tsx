import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Smartphone,
  Terminal,
  WifiOff,
  X,
} from 'lucide-react';

interface AndroidAppModalProps {
  onClose: () => void;
  canInstall: boolean;
  isInstalled: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  onTriggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const CAPACITOR_CONFIG = {
  appId: 'com.routercraft.wifi',
  appName: 'RouterCraft',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f172a',
  },
  server: {
    androidScheme: 'https',
  },
};

const APK_BUILD_COMMANDS = `npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npm run build
npx cap sync android
npx cap open android`;

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({
  onClose,
  canInstall,
  isInstalled,
  isAndroid,
  isIOS,
  onTriggerInstall,
}) => {
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');
  const [installing, setInstalling] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [copiedCommands, setCopiedCommands] = useState(false);

  const handleInstallNow = async () => {
    setInstalling(true);
    try {
      const result = await onTriggerInstall();
      if (result === 'accepted') {
        setInstallFeedback('تمت إضافة RouterCraft إلى شاشة هاتفك الرئيسية بنجاح.');
      } else if (result === 'dismissed') {
        setInstallFeedback('تم إلغاء التثبيت — يمكنك التثبيت في أي وقت من قائمة المتصفح.');
      } else {
        setInstallFeedback('استخدم قائمة المتصفح ⋮ ثم اختر "تثبيت التطبيق" لإضافته على الأندرويد.');
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDownloadCapacitorConfig = () => {
    const blob = new Blob([JSON.stringify(CAPACITOR_CONFIG, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'capacitor.config.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(APK_BUILD_COMMANDS);
      setCopiedCommands(true);
      window.setTimeout(() => setCopiedCommands(false), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="أيقونة RouterCraft"
              className="w-10 h-10 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700"
            />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                تطبيق أندرويد — RouterCraft
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                تثبيت فوري كتطبيق أندرويد مستقل أو تجهيز حزمة APK
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('pwa')}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'pwa'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>تثبيت مباشر (Android App)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('apk')}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'apk'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCode2 className="w-4 h-4 shrink-0" />
              <span>بناء ملف APK</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'pwa' ? (
            <>
              {/* Readiness Summary */}
              <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    جاهز للعمل كتطبيق أندرويد (PWA)
                  </span>
                  <span className="text-[11px] font-mono text-teal-700 dark:text-teal-300">
                    Standalone · RTL
                  </span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <WifiOff className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>تشغيل فوري وذاكرة تخزين أوفلاين</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>أيقونة أندرويد متكيفة بملء الشاشة</span>
                  </li>
                </ul>
              </div>

              {isInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span>
                    تطبيق RouterCraft مثبت حالياً ويعمل بوضع التطبيق المستقل على جهازك.
                  </span>
                </div>
              ) : canInstall ? (
                <button
                  type="button"
                  onClick={handleInstallNow}
                  disabled={installing}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>{installing ? 'جارٍ التثبيت...' : 'تثبيت تطبيق RouterCraft على هاتفك الآن'}</span>
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {isIOS
                      ? 'خطوات التثبيت على آيفون / آيباد (Safari):'
                      : isAndroid
                      ? 'خطوات التثبيت السريع على أندرويد (Chrome):'
                      : 'خطوات التثبيت على هاتفك الأندرويد:'}
                  </p>
                  {isIOS ? (
                    <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>افتح رابط التطبيق في متصفح Safari.</li>
                      <li>اضغط على أيقونة المشاركة (Share) في شريط المتصفح السفلي.</li>
                      <li>اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).</li>
                    </ol>
                  ) : (
                    <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>افتح رابط التطبيق في متصفح Google Chrome على هاتفك الأندرويد.</li>
                      <li>اضغط على قائمة الثلاث نقاط (⋮) في أعلى المتصفح.</li>
                      <li>اختر «تثبيت التطبيق» أو «الإضافة إلى الشاشة الرئيسية» وسيُنشأ تطبيق أندرويد كامل.</li>
                    </ol>
                  )}
                </div>
              )}

              {installFeedback && (
                <p className="text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 rounded-lg px-3.5 py-2.5">
                  {installFeedback}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                ملف إعداد Capacitor (<span className="font-mono">capacitor.config.json</span>) مدمج بالفعل داخل المشروع. لتوليد ملف{' '}
                <span className="font-mono font-semibold">.apk</span> نهائي قابل للتثبيت أو النشر على Google Play، نفّذ إحدى الطريقتين التاليتين:
              </div>

              {/* Method 1: Capacitor */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-teal-600 shrink-0" />
                    الطريقة 1: بناء APK عبر Capacitor و Android Studio
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadCapacitorConfig}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل capacitor.config.json</span>
                  </button>
                </div>

                <div className="relative">
                  <pre
                    dir="ltr"
                    className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed"
                  >
                    {APK_BUILD_COMMANDS}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyCommands}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] inline-flex items-center gap-1"
                  >
                    {copiedCommands ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  بعد فتح المشروع في Android Studio اختر: <span className="font-mono">Build → Build Bundle(s) / APK(s) → Build APK(s)</span>.
                </p>
              </div>

              {/* Method 2: PWABuilder */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-teal-600 shrink-0" />
                  الطريقة 2: تحويل تلقائي سحابي عبر PWABuilder (بدون تثبيت Android Studio)
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  بفضل تضمين <span className="font-mono">manifest.webmanifest</span> و <span className="font-mono">Service Worker</span> وأيقونات Android Maskable، يمكنك لصق رابط التطبيق المنشور في موقع{' '}
                  <span className="font-mono font-semibold text-teal-700 dark:text-teal-300">pwabuilder.com</span> وتنزيل حزمة Android APK/AAB جاهزة فوراً.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
