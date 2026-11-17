import React, { useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  DomainActivityLog,
  DomainCategory,
  NetworkDevice,
  ParentalRule,
  SCHEMA_LIMITS,
  SubscriberGroup,
} from '@/src/types/network';

interface ParentalControlSectionProps {
  devices: NetworkDevice[];
  subscribers: SubscriberGroup[];
  parentalRules: ParentalRule[];
  domainLogs: DomainActivityLog[];
  selectedDeviceFilter: string;
  onSelectDeviceFilter: (deviceId: string) => void;
  onSaveParentalRule: (rule: ParentalRule) => void;
  onCreateParentalRule: (payload: Omit<ParentalRule, 'id' | 'ownerId' | 'routerId'>) => void;
  onDeleteParentalRule: (rule: ParentalRule) => void;
  onBlockDomain: (domain: string, targetRuleId: string) => void;
  onUnblockDomain: (domain: string, rule: ParentalRule) => void;
  onSimulateDomainCheck: (simulateAdultAttempt: boolean) => void;
}

const CATEGORY_LABELS: Record<DomainCategory, string> = {
  video: 'فيديو وبث',
  social: 'تواصل اجتماعي',
  work: 'عمل وإنتاجية',
  gaming: 'ألعاب إلكترونية',
  education: 'تعليم وبحث',
  adult: 'محتوى غير لائق',
  shopping: 'تسوق إلكتروني',
  other: 'مواقع عامة',
};

export const ParentalControlSection: React.FC<ParentalControlSectionProps> = ({
  devices,
  subscribers,
  parentalRules,
  domainLogs,
  selectedDeviceFilter,
  onSelectDeviceFilter,
  onSaveParentalRule,
  onCreateParentalRule,
  onDeleteParentalRule,
  onBlockDomain,
  onUnblockDomain,
  onSimulateDomainCheck,
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    parentalRules[0]?.id || 'rule-router-global'
  );
  const [newDomainInput, setNewDomainInput] = useState('');
  const [domainSearch, setDomainSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'allowed' | 'blocked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DomainCategory>('all');
  const [newRuleTarget, setNewRuleTarget] = useState('');

  const activeRule = useMemo(() => {
    return parentalRules.find((r) => r.id === selectedRuleId) || parentalRules[0];
  }, [parentalRules, selectedRuleId]);

  const filteredLogs = useMemo(() => {
    const q = domainSearch.trim().toLowerCase();
    return domainLogs
      .filter((log) => {
        if (selectedDeviceFilter !== 'all' && log.deviceId !== selectedDeviceFilter) return false;
        if (statusFilter !== 'all' && log.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
        if (!q) return true;
        return (
          log.domain.toLowerCase().includes(q) ||
          log.deviceName.toLowerCase().includes(q) ||
          CATEGORY_LABELS[log.category].includes(q)
        );
      })
      .sort((a, b) => b.dataUsedMb - a.dataUsedMb);
  }, [domainLogs, selectedDeviceFilter, statusFilter, categoryFilter, domainSearch]);

  const blockedHitsCount = useMemo(
    () => domainLogs.filter((l) => l.status === 'blocked').length,
    [domainLogs]
  );

  const totalDomainsCount = domainLogs.length;

  const handleToggleRuleField = (
    field:
      | 'blockAdultContent'
      | 'safeSearchEnabled'
      | 'blockGambling'
      | 'blockSocialMedia'
      | 'blockGaming'
      | 'scheduleEnabled'
  ) => {
    if (!activeRule) return;
    onSaveParentalRule({
      ...activeRule,
      [field]: !activeRule[field],
    });
  };

  const handleBedtimeChange = (field: 'bedtimeStart' | 'bedtimeEnd', value: string) => {
    if (!activeRule) return;
    if (!SCHEMA_LIMITS.TIME_REGEX.test(value)) return;
    onSaveParentalRule({
      ...activeRule,
      [field]: value,
    });
  };

  const handleAddCustomDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRule) return;
    const cleaned = newDomainInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
    if (cleaned.length < 3 || !cleaned.includes('.')) return;
    onBlockDomain(cleaned, activeRule.id);
    setNewDomainInput('');
  };

  const handleCreateTargetRule = () => {
    if (!newRuleTarget) return;
    const [targetType, targetId] = newRuleTarget.split(':') as ['subscriber' | 'device', string];
    if (!targetId) return;

    const existing = parentalRules.find(
      (r) => r.targetType === targetType && r.targetId === targetId
    );
    if (existing) {
      setSelectedRuleId(existing.id);
      setNewRuleTarget('');
      return;
    }

    const targetName =
      targetType === 'subscriber'
        ? subscribers.find((s) => s.id === targetId)?.name || 'مشترك'
        : devices.find((d) => d.id === targetId)?.name || 'جهاز';

    onCreateParentalRule({
      targetType,
      targetId,
      targetName,
      blockAdultContent: true,
      safeSearchEnabled: true,
      blockGambling: true,
      blockSocialMedia: false,
      blockGaming: false,
      scheduleEnabled: false,
      bedtimeStart: '22:30',
      bedtimeEnd: '06:30',
      customBlockedDomains: [],
    });
    setNewRuleTarget('');
  };

  // Available targets that don't have a custom rule yet
  const availableTargets = useMemo(() => {
    const used = new Set(parentalRules.map((r) => `${r.targetType}:${r.targetId}`));
    const items: { value: string; label: string }[] = [];
    subscribers.forEach((s) => {
      if (!used.has(`subscriber:${s.id}`)) {
        items.push({ value: `subscriber:${s.id}`, label: `مجموعة: ${s.name}` });
      }
    });
    devices.forEach((d) => {
      if (!used.has(`device:${d.id}`)) {
        items.push({ value: `device:${d.id}`, label: `جهاز: ${d.name}` });
      }
    });
    return items;
  }, [parentalRules, subscribers, devices]);

  return (
    <div className="space-y-6">
      {/* Top Summary & Rule Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              الرقابة الأبوية ومنع المواقع الإباحية
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              حجب تلقائي للمحتوى غير اللائق عبر تصفية DNS، تفعيل البحث الآمن، ومتابعة المواقع التي يزورها كل جهاز
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSimulateDomainCheck(false)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              تحديث نشاط المواقع
            </button>
            <button
              type="button"
              onClick={() => onSimulateDomainCheck(true)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap"
            >
              اختبار صد موقع إباحي / محظور
            </button>
          </div>
        </div>

        {/* Rule Scope Tabs + Add Custom Rule */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {parentalRules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                onClick={() => setSelectedRuleId(rule.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeRule?.id === rule.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {rule.targetType === 'router' ? 'الشبكة بالكامل' : rule.targetName}
              </button>
            ))}
          </div>

          {availableTargets.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={newRuleTarget}
                onChange={(e) => setNewRuleTarget(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="">تخصيص قاعدة لجهاز أو مشترك...</option>
                {availableTargets.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!newRuleTarget}
                onClick={handleCreateTargetRule}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-40 whitespace-nowrap"
              >
                إضافة قاعدة
              </button>
            </div>
          )}
        </div>

        {/* Active Parental Rule Settings */}
        {activeRule && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Category Filters & Bedtime */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  فلاتر المحتوى المطبقة على: {activeRule.targetName}
                </h3>
                {activeRule.targetType !== 'router' && (
                  <button
                    type="button"
                    onClick={() => onDeleteParentalRule(activeRule)}
                    className="text-xs text-rose-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف التخصيص</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                      منع المواقع الإباحية والبالغين
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      حظر فوري عبر Family DNS وقوائم الحظر المحدثة
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeRule.blockAdultContent}
                    onChange={() => handleToggleRuleField('blockAdultContent')}
                    className="w-4 h-4 mt-0.5 accent-teal-700 rounded shrink-0"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                      إجبار البحث الآمن (SafeSearch)
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      تصفية نتائج Google وBing ووضع تقييد YouTube
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeRule.safeSearchEnabled}
                    onChange={() => handleToggleRuleField('safeSearchEnabled')}
                    className="w-4 h-4 mt-0.5 accent-teal-700 rounded shrink-0"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                      منع مواقع المراهنات والقمار
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      حماية من المواقع الضارة والاحتيالية
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeRule.blockGambling}
                    onChange={() => handleToggleRuleField('blockGambling')}
                    className="w-4 h-4 mt-0.5 accent-teal-700 rounded shrink-0"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                      تقييد منصات التواصل الاجتماعي
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      TikTok · Instagram · Facebook · Snapchat
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeRule.blockSocialMedia}
                    onChange={() => handleToggleRuleField('blockSocialMedia')}
                    className="w-4 h-4 mt-0.5 accent-teal-700 rounded shrink-0"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                      تقييد خوادم الألعاب الإلكترونية
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      Roblox · PUBG · Fortnite · Steam
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeRule.blockGaming}
                    onChange={() => handleToggleRuleField('blockGaming')}
                    className="w-4 h-4 mt-0.5 accent-teal-700 rounded shrink-0"
                  />
                </label>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>جدول النوم والدراسة</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={activeRule.scheduleEnabled}
                      onChange={() => handleToggleRuleField('scheduleEnabled')}
                      className="w-4 h-4 accent-teal-700 rounded"
                    />
                  </label>
                  {activeRule.scheduleEnabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input
                        type="time"
                        value={activeRule.bedtimeStart}
                        onChange={(e) => handleBedtimeChange('bedtimeStart', e.target.value)}
                        className="px-2 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                      />
                      <input
                        type="time"
                        value={activeRule.bedtimeEnd}
                        onChange={(e) => handleBedtimeChange('bedtimeEnd', e.target.value)}
                        className="px-2 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Blocked Domains List */}
            <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    قائمة النطاقات المحظورة يدوياً
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {activeRule.customBlockedDomains.length} / {SCHEMA_LIMITS.CUSTOM_DOMAINS_MAX}
                  </span>
                </div>

                <form onSubmit={handleAddCustomDomain} className="flex items-center gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={newDomainInput}
                    onChange={(e) => setNewDomainInput(e.target.value)}
                    placeholder="example.com"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 whitespace-nowrap inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>حظر موقع</span>
                  </button>
                </form>

                {activeRule.customBlockedDomains.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                    لم يتم إضافة نطاقات مخصصة بعد. يمكنك حظر أي موقع مباشرة من السجل بالأسفل.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                    {activeRule.customBlockedDomains.map((domain) => (
                      <div
                        key={domain}
                        className="py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                          {domain}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUnblockDomain(domain, activeRule)}
                          className="text-xs text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 whitespace-nowrap"
                        >
                          إلغاء الحظر
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  {activeRule.blockAdultContent ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                  )}
                  <span>
                    {activeRule.blockAdultContent
                      ? 'فلترة المحتوى الإباحي نشطة'
                      : 'فلترة المحتوى الإباحي متوقفة'}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  {blockedHitsCount} محاولة محظورة
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-Device Visited Websites & Apps Inspector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                سجل المواقع والخدمات المستخدمة لكل جهاز
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                متابعة النطاقات التي يتصل بها كل جهاز ({totalDomainsCount} نطاق مرصود) مع خيار الحظر الفوري
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDeviceFilter}
                onChange={(e) => onSelectDeviceFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">جميع الأجهزة ({devices.length})</option>
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'all' | DomainCategory)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">كل التصنيفات</option>
                {(Object.keys(CATEGORY_LABELS) as DomainCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'الكل' },
                    { id: 'allowed', label: 'مسموح' },
                    { id: 'blocked', label: 'تم الحظر' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      statusFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={domainSearch}
                  onChange={(e) => setDomainSearch(e.target.value)}
                  placeholder="بحث باسم الموقع..."
                  className="w-full pr-8 pl-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Globe className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              لا توجد مواقع مسجلة مطابقة للفلتر الحالي
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              جرّب اختيار جميع الأجهزة أو الضغط على تحديث نشاط المواقع.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">الموقع / النطاق</th>
                  <th className="py-3 px-4">الجهاز المستخدم</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">حجم البيانات والطلبات</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredLogs.map((log) => {
                  const isDomainInCustomBlock = activeRule?.customBlockedDomains.includes(
                    log.domain
                  );
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                            {log.domain}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {log.deviceName}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {CATEGORY_LABELS[log.category]}
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {log.dataUsedMb >= 1024
                          ? `${(log.dataUsedMb / 1024).toFixed(2)} GB`
                          : `${log.dataUsedMb.toFixed(0)} MB`}{' '}
                        · {log.requestsCount} طلب
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.status === 'blocked' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span>تم الحظر</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مسموح</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        {log.status === 'blocked' && isDomainInCustomBlock && activeRule ? (
                          <button
                            type="button"
                            onClick={() => onUnblockDomain(log.domain, activeRule)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            السماح بالموقع
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onBlockDomain(log.domain, activeRule?.id || 'rule-router-global')
                            }
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 inline-flex items-center gap-1"
                          >
                            <Ban className="w-3 h-3" />
                            <span>حظر الموقع</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
