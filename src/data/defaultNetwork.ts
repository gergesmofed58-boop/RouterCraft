import {
  DomainActivityLog,
  DomainCategory,
  NetworkAlert,
  NetworkDevice,
  ParentalRule,
  RouterProfile,
  SubscriberGroup,
} from '@/src/types/network';

export const ROUTER_MODEL_PRESETS = [
  { label: 'Huawei DG8045 (WE VDSL)', gatewayIp: '192.168.1.1' },
  { label: 'ZTE H168N V3.5 (WE)', gatewayIp: '192.168.1.1' },
  { label: 'ZTE H188A (VDSL2 Dual-Band)', gatewayIp: '192.168.1.1' },
  { label: 'TP-Link Archer AX55 (Wi-Fi 6)', gatewayIp: '192.168.0.1' },
  { label: 'MikroTik hAP ax2 (RouterOS)', gatewayIp: '192.168.88.1' },
  { label: 'ASUS RT-AX58U', gatewayIp: '192.168.50.1' },
] as const;

export const DNS_PRESETS = [
  { id: 'cloudflare', name: 'Cloudflare السريع', primary: '1.1.1.1', secondary: '1.0.0.1', desc: 'أسرع استجابة وتصفح آمن' },
  { id: 'adguard', name: 'AdGuard حجب الإعلانات', primary: '94.140.14.14', secondary: '94.140.15.15', desc: 'منع الإعلانات والنوافذ المزعجة' },
  { id: 'family', name: 'فلترة العائلة الآمنة', primary: '1.1.1.3', secondary: '1.0.0.3', desc: 'حماية الأطفال وحظر المواقع الضارة' },
  { id: 'google', name: 'Google DNS', primary: '8.8.8.8', secondary: '8.8.4.4', desc: 'استقرار عالمي موثوق' },
] as const;

export function createDefaultRouter(ownerId: string, routerId = 'router-main'): RouterProfile {
  return {
    id: routerId,
    ownerId,
    name: 'راوتر المنزل الرئيسي',
    brandModel: 'Huawei DG8045 (WE VDSL)',
    gatewayIp: '192.168.1.1',
    wanDownloadMbps: 70,
    wanUploadMbps: 15,
    monthlyQuotaGb: 400,
    usedQuotaGb: 184.6,
    billingDay: 1,
    wifi24Enabled: true,
    wifi24Ssid: 'Home_Fiber_2.4G',
    wifi24Channel: '6',
    wifi24Hidden: false,
    wifi5Enabled: true,
    wifi5Ssid: 'Home_Fiber_5G',
    wifi5Channel: '36',
    wifi5Hidden: false,
    guestEnabled: true,
    guestSsid: 'Home_Guests',
    guestSpeedLimitMbps: 8,
    txPowerPercent: 75,
    securityMode: 'WPA2/WPA3',
    dnsPrimary: '1.1.1.1',
    dnsSecondary: '1.0.0.1',
    wpsEnabled: false,
    qosMode: 'fair',
    newDeviceAlert: true,
    autoBlockUnknown: false,
    lineAttenuationDown: 11.4,
    snrMarginDown: 16.8,
    uptimeSeconds: 412850,
  };
}

export function createDefaultSubscribers(ownerId: string, routerId: string): SubscriberGroup[] {
  return [
    {
      id: 'sub-family',
      ownerId,
      routerId,
      name: 'العائلة والهواتف الرئيسية',
      speedLimitMbps: 35,
      uploadLimitMbps: 10,
      quotaLimitGb: 160,
      usedGb: 78.4,
      priority: 'high',
      paused: false,
      scheduleEnabled: false,
      scheduleStart: '00:00',
      scheduleEnd: '06:00',
    },
    {
      id: 'sub-work',
      ownerId,
      routerId,
      name: 'مكتب العمل واللابتوب',
      speedLimitMbps: 45,
      uploadLimitMbps: 15,
      quotaLimitGb: 120,
      usedGb: 52.8,
      priority: 'high',
      paused: false,
      scheduleEnabled: false,
      scheduleStart: '23:00',
      scheduleEnd: '07:00',
    },
    {
      id: 'sub-kids',
      ownerId,
      routerId,
      name: 'الأولاد والألعاب',
      speedLimitMbps: 15,
      uploadLimitMbps: 5,
      quotaLimitGb: 80,
      usedGb: 43.2,
      priority: 'normal',
      paused: false,
      scheduleEnabled: true,
      scheduleStart: '23:00',
      scheduleEnd: '07:00',
    },
    {
      id: 'sub-guests',
      ownerId,
      routerId,
      name: 'الضيوف والزوار',
      speedLimitMbps: 8,
      uploadLimitMbps: 2,
      quotaLimitGb: 40,
      usedGb: 10.2,
      priority: 'low',
      paused: false,
      scheduleEnabled: false,
      scheduleStart: '01:00',
      scheduleEnd: '08:00',
    },
  ];
}

export function createDefaultDevices(ownerId: string, routerId: string): NetworkDevice[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'dev-iphone15',
      ownerId,
      routerId,
      subscriberId: 'sub-family',
      name: 'آيفون 15 برو — أحمد',
      hostname: 'Ahmed-iPhone15Pro',
      macAddress: 'A4:83:E7:4C:19:22',
      ipAddress: '192.168.1.10',
      vendor: 'Apple',
      deviceType: 'phone',
      band: '5GHz',
      rssi: -46,
      online: true,
      blocked: false,
      trusted: true,
      speedLimitDownMbps: 30,
      speedLimitUpMbps: 10,
      quotaLimitGb: 70,
      usedGb: 34.2,
      currentDownMbps: 12.4,
      currentUpMbps: 2.1,
      lastSeenAt: now,
      firstSeenAt: '2026-11-01T08:15:00.000Z',
    },
    {
      id: 'dev-dellxps',
      ownerId,
      routerId,
      subscriberId: 'sub-work',
      name: 'لابتوب العمل Dell XPS',
      hostname: 'WORKSTATION-XPS15',
      macAddress: 'D8:BB:C1:9A:04:77',
      ipAddress: '192.168.1.14',
      vendor: 'Dell Inc.',
      deviceType: 'laptop',
      band: '5GHz',
      rssi: -42,
      online: true,
      blocked: false,
      trusted: true,
      speedLimitDownMbps: 45,
      speedLimitUpMbps: 15,
      quotaLimitGb: 120,
      usedGb: 52.8,
      currentDownMbps: 18.6,
      currentUpMbps: 4.5,
      lastSeenAt: now,
      firstSeenAt: '2026-11-01T09:00:00.000Z',
    },
    {
      id: 'dev-lgtv',
      ownerId,
      routerId,
      subscriberId: 'sub-family',
      name: 'تلفاز الصالة LG OLED',
      hostname: 'LGwebOSTV-OLED',
      macAddress: '64:95:6C:2E:81:09',
      ipAddress: '192.168.1.18',
      vendor: 'LG Electronics',
      deviceType: 'tv',
      band: 'LAN',
      rssi: -30,
      online: true,
      blocked: false,
      trusted: true,
      speedLimitDownMbps: 25,
      speedLimitUpMbps: 4,
      quotaLimitGb: 90,
      usedGb: 44.2,
      currentDownMbps: 14.8,
      currentUpMbps: 0.4,
      lastSeenAt: now,
      firstSeenAt: '2026-11-01T10:12:00.000Z',
    },
    {
      id: 'dev-ps5',
      ownerId,
      routerId,
      subscriberId: 'sub-kids',
      name: 'بلايستيشن 5 — غرفة الأولاد',
      hostname: 'PS5-LivingRoom',
      macAddress: '7C:BB:8A:31:D4:50',
      ipAddress: '192.168.1.22',
      vendor: 'Sony Interactive',
      deviceType: 'console',
      band: '5GHz',
      rssi: -58,
      online: true,
      blocked: false,
      trusted: true,
      speedLimitDownMbps: 15,
      speedLimitUpMbps: 5,
      quotaLimitGb: 50,
      usedGb: 29.7,
      currentDownMbps: 5.2,
      currentUpMbps: 1.3,
      lastSeenAt: now,
      firstSeenAt: '2026-11-02T14:20:00.000Z',
    },
    {
      id: 'dev-xiaomi',
      ownerId,
      routerId,
      subscriberId: 'sub-kids',
      name: 'تابلت الدراسة Xiaomi Pad',
      hostname: 'XiaomiPad-6',
      macAddress: '50:EC:50:7B:21:6A',
      ipAddress: '192.168.1.27',
      vendor: 'Xiaomi',
      deviceType: 'tablet',
      band: '2.4GHz',
      rssi: -61,
      online: true,
      blocked: false,
      trusted: true,
      speedLimitDownMbps: 10,
      speedLimitUpMbps: 3,
      quotaLimitGb: 30,
      usedGb: 13.5,
      currentDownMbps: 3.1,
      currentUpMbps: 0.6,
      lastSeenAt: now,
      firstSeenAt: '2026-11-03T11:40:00.000Z',
    },
    {
      id: 'dev-guest-s23',
      ownerId,
      routerId,
      subscriberId: 'sub-guests',
      name: 'هاتف زائر Samsung S23',
      hostname: 'Galaxy-S23-Guest',
      macAddress: 'BC:7F:A4:11:90:E3',
      ipAddress: '192.168.1.45',
      vendor: 'Samsung',
      deviceType: 'phone',
      band: '2.4GHz',
      rssi: -67,
      online: false,
      blocked: false,
      trusted: false,
      speedLimitDownMbps: 8,
      speedLimitUpMbps: 2,
      quotaLimitGb: 15,
      usedGb: 6.8,
      currentDownMbps: 0,
      currentUpMbps: 0,
      lastSeenAt: now,
      firstSeenAt: '2026-11-10T17:05:00.000Z',
    },
    {
      id: 'dev-blocked-01',
      ownerId,
      routerId,
      subscriberId: '',
      name: 'جهاز غير معروف (محظور)',
      hostname: 'android-9f31c8b2',
      macAddress: '3C:5A:B4:88:12:F9',
      ipAddress: '192.168.1.89',
      vendor: 'Oppo Mobile',
      deviceType: 'phone',
      band: '2.4GHz',
      rssi: -79,
      online: false,
      blocked: true,
      trusted: false,
      speedLimitDownMbps: 0,
      speedLimitUpMbps: 0,
      quotaLimitGb: 0,
      usedGb: 3.4,
      currentDownMbps: 0,
      currentUpMbps: 0,
      lastSeenAt: now,
      firstSeenAt: '2026-11-14T21:30:00.000Z',
    },
  ];
}

export function createDefaultAlerts(ownerId: string, routerId: string): NetworkAlert[] {
  return [
    {
      id: 'alert-init-1',
      ownerId,
      routerId,
      type: 'device_blocked',
      title: 'تم حظر جهاز غريب تلقائياً',
      message: 'تم حظر الجهاز android-9f31c8b2 (3C:5A:B4:88:12:F9) ومنعه من استهلاك باقة الشبكة.',
      deviceId: 'dev-blocked-01',
      macAddress: '3C:5A:B4:88:12:F9',
      ipAddress: '192.168.1.89',
      read: false,
      severity: 'critical',
      createdAtIso: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
    {
      id: 'alert-init-2',
      ownerId,
      routerId,
      type: 'quota_warning',
      title: 'اقترب مشترك "الأولاد والألعاب" من حد الباقة',
      message: 'تم استهلاك 43.2 جيجابايت من أصل 80 جيجابايت المخصصة لهذه المجموعة.',
      deviceId: '',
      macAddress: '',
      ipAddress: '',
      read: false,
      severity: 'warning',
      createdAtIso: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: 'alert-init-3',
      ownerId,
      routerId,
      type: 'new_device',
      title: 'دخول جهاز جديد إلى شبكة 2.4GHz',
      message: 'انضم الهاتف Galaxy-S23-Guest عبر شبكة الضيوف بسرعة محددة 8 ميجابت/ث.',
      deviceId: 'dev-guest-s23',
      macAddress: 'BC:7F:A4:11:90:E3',
      ipAddress: '192.168.1.45',
      read: true,
      severity: 'info',
      createdAtIso: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
  ];
}

const SAMPLE_INTRUDERS = [
  { name: 'هاتف Realme جديد', hostname: 'RMX3710-Phone', vendor: 'Realme', deviceType: 'phone' as const, band: '2.4GHz' as const },
  { name: 'لابتوب Asus غير معروف', hostname: 'DESKTOP-8K21M9', vendor: 'ASUSTek', deviceType: 'laptop' as const, band: '5GHz' as const },
  { name: 'جهاز TV Box غير معروف', hostname: 'MiBox-S-4K', vendor: 'Xiaomi', deviceType: 'tv' as const, band: '2.4GHz' as const },
  { name: 'هاتف Vivo غريب', hostname: 'vivo-V2310', vendor: 'Vivo Mobile', deviceType: 'phone' as const, band: '2.4GHz' as const },
  { name: 'آيباد غير مسجل', hostname: 'iPad-Air-New', vendor: 'Apple', deviceType: 'tablet' as const, band: '5GHz' as const },
];

export function generateRandomNewDevice(ownerId: string, routerId: string, autoBlock: boolean): NetworkDevice {
  const pick = SAMPLE_INTRUDERS[Math.floor(Math.random() * SAMPLE_INTRUDERS.length)];
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  const macAddress = `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
  const lastOctet = Math.floor(Math.random() * 140) + 100;
  const now = new Date().toISOString();
  const id = `dev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    id,
    ownerId,
    routerId,
    subscriberId: '',
    name: pick.name,
    hostname: pick.hostname,
    macAddress,
    ipAddress: `192.168.1.${lastOctet}`,
    vendor: pick.vendor,
    deviceType: pick.deviceType,
    band: pick.band,
    rssi: -Math.floor(Math.random() * 28 + 52),
    online: !autoBlock,
    blocked: autoBlock,
    trusted: false,
    speedLimitDownMbps: autoBlock ? 0 : 10,
    speedLimitUpMbps: autoBlock ? 0 : 2,
    quotaLimitGb: 10,
    usedGb: 0.1,
    currentDownMbps: autoBlock ? 0 : Number((Math.random() * 4.5 + 1.2).toFixed(1)),
    currentUpMbps: autoBlock ? 0 : Number((Math.random() * 1.1 + 0.2).toFixed(1)),
    lastSeenAt: now,
    firstSeenAt: now,
  };
}

export function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Ignore audio context block before user gesture
  }
}

export function createDefaultParentalRules(ownerId: string, routerId: string): ParentalRule[] {
  return [
    {
      id: 'rule-router-global',
      ownerId,
      routerId,
      targetType: 'router',
      targetId: '',
      targetName: 'الشبكة بالكامل',
      blockAdultContent: true,
      safeSearchEnabled: true,
      blockGambling: true,
      blockSocialMedia: false,
      blockGaming: false,
      scheduleEnabled: false,
      bedtimeStart: '23:00',
      bedtimeEnd: '06:30',
      customBlockedDomains: ['pornhub.com', 'xvideos.com', 'bet365.com'],
    },
    {
      id: 'rule-sub-kids',
      ownerId,
      routerId,
      targetType: 'subscriber',
      targetId: 'sub-kids',
      targetName: 'الأولاد والألعاب',
      blockAdultContent: true,
      safeSearchEnabled: true,
      blockGambling: true,
      blockSocialMedia: true,
      blockGaming: false,
      scheduleEnabled: true,
      bedtimeStart: '22:30',
      bedtimeEnd: '07:00',
      customBlockedDomains: ['tiktok.com', 'omegle.com'],
    },
  ];
}

export function createDefaultDomainLogs(ownerId: string, routerId: string): DomainActivityLog[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'dom-1',
      ownerId,
      routerId,
      deviceId: 'dev-lgtv',
      deviceName: 'تلفاز الصالة LG OLED',
      domain: 'youtube.com',
      category: 'video',
      status: 'allowed',
      requestsCount: 842,
      dataUsedMb: 18420,
      lastVisitedAt: now,
    },
    {
      id: 'dom-2',
      ownerId,
      routerId,
      deviceId: 'dev-lgtv',
      deviceName: 'تلفاز الصالة LG OLED',
      domain: 'netflix.com',
      category: 'video',
      status: 'allowed',
      requestsCount: 415,
      dataUsedMb: 14950,
      lastVisitedAt: now,
    },
    {
      id: 'dom-3',
      ownerId,
      routerId,
      deviceId: 'dev-dellxps',
      deviceName: 'لابتوب العمل Dell XPS',
      domain: 'github.com',
      category: 'work',
      status: 'allowed',
      requestsCount: 1290,
      dataUsedMb: 4210,
      lastVisitedAt: now,
    },
    {
      id: 'dom-4',
      ownerId,
      routerId,
      deviceId: 'dev-dellxps',
      deviceName: 'لابتوب العمل Dell XPS',
      domain: 'chatgpt.com',
      category: 'work',
      status: 'allowed',
      requestsCount: 618,
      dataUsedMb: 1890,
      lastVisitedAt: now,
    },
    {
      id: 'dom-5',
      ownerId,
      routerId,
      deviceId: 'dev-iphone15',
      deviceName: 'آيفون 15 برو — أحمد',
      domain: 'whatsapp.net',
      category: 'social',
      status: 'allowed',
      requestsCount: 2410,
      dataUsedMb: 3120,
      lastVisitedAt: now,
    },
    {
      id: 'dom-6',
      ownerId,
      routerId,
      deviceId: 'dev-iphone15',
      deviceName: 'آيفون 15 برو — أحمد',
      domain: 'instagram.com',
      category: 'social',
      status: 'allowed',
      requestsCount: 930,
      dataUsedMb: 5480,
      lastVisitedAt: now,
    },
    {
      id: 'dom-7',
      ownerId,
      routerId,
      deviceId: 'dev-ps5',
      deviceName: 'بلايستيشن 5 — غرفة الأولاد',
      domain: 'playstation.net',
      category: 'gaming',
      status: 'allowed',
      requestsCount: 1540,
      dataUsedMb: 12600,
      lastVisitedAt: now,
    },
    {
      id: 'dom-8',
      ownerId,
      routerId,
      deviceId: 'dev-xiaomi',
      deviceName: 'تابلت الدراسة Xiaomi Pad',
      domain: 'classroom.google.com',
      category: 'education',
      status: 'allowed',
      requestsCount: 380,
      dataUsedMb: 1450,
      lastVisitedAt: now,
    },
    {
      id: 'dom-9',
      ownerId,
      routerId,
      deviceId: 'dev-xiaomi',
      deviceName: 'تابلت الدراسة Xiaomi Pad',
      domain: 'tiktok.com',
      category: 'social',
      status: 'blocked',
      requestsCount: 24,
      dataUsedMb: 0,
      lastVisitedAt: now,
    },
    {
      id: 'dom-10',
      ownerId,
      routerId,
      deviceId: 'dev-guest-s23',
      deviceName: 'هاتف زائر Samsung S23',
      domain: 'adult-filtered-site.xxx',
      category: 'adult',
      status: 'blocked',
      requestsCount: 7,
      dataUsedMb: 0,
      lastVisitedAt: now,
    },
  ];
}

const SAMPLE_SAFE_DOMAINS: { domain: string; category: DomainCategory }[] = [
  { domain: 'google.com', category: 'education' },
  { domain: 'youtube.com', category: 'video' },
  { domain: 'amazon.eg', category: 'shopping' },
  { domain: 'roblox.com', category: 'gaming' },
  { domain: 'facebook.com', category: 'social' },
  { domain: 'coursera.org', category: 'education' },
];

const SAMPLE_ADULT_DOMAINS: { domain: string; category: DomainCategory }[] = [
  { domain: 'adult-stream-blocked.xxx', category: 'adult' },
  { domain: 'explicit-portal-filter.net', category: 'adult' },
  { domain: 'casino-betting-blocked.com', category: 'adult' },
];

export function generateDomainVisitEvent(
  ownerId: string,
  routerId: string,
  devices: NetworkDevice[],
  simulateAdultAttempt: boolean
): {
  log: DomainActivityLog;
  pickedDevice: NetworkDevice | null;
} {
  const active = devices.filter((d) => !d.blocked);
  const pool = active.length > 0 ? active : devices;
  if (pool.length === 0) {
    throw new Error('No devices available');
  }
  const pickedDevice = pool[Math.floor(Math.random() * pool.length)];
  const samplePool = simulateAdultAttempt ? SAMPLE_ADULT_DOMAINS : SAMPLE_SAFE_DOMAINS;
  const site = samplePool[Math.floor(Math.random() * samplePool.length)];
  const now = new Date().toISOString();

  return {
    pickedDevice,
    log: {
      id: `dom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId,
      routerId,
      deviceId: pickedDevice.id,
      deviceName: pickedDevice.name,
      domain: site.domain,
      category: site.category,
      status: simulateAdultAttempt ? 'blocked' : 'allowed',
      requestsCount: simulateAdultAttempt ? 1 : Math.floor(Math.random() * 45 + 5),
      dataUsedMb: simulateAdultAttempt ? 0 : Math.floor(Math.random() * 180 + 12),
      lastVisitedAt: now,
    },
  };
}

