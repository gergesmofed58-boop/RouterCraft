export type DeviceType = 'phone' | 'laptop' | 'tv' | 'console' | 'iot' | 'tablet' | 'other';
export type WifiBand = '2.4GHz' | '5GHz' | 'LAN';
export type SecurityMode = 'WPA3-SAE' | 'WPA2/WPA3' | 'WPA2-PSK';
export type QosMode = 'fair' | 'gaming' | 'streaming' | 'custom';
export type SubscriberPriority = 'high' | 'normal' | 'low';
export type AlertType =
  | 'new_device'
  | 'quota_warning'
  | 'quota_exceeded'
  | 'device_blocked'
  | 'speed_throttled'
  | 'security'
  | 'parental_blocked';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export type ActiveTab =
  | 'overview'
  | 'devices'
  | 'subscribers'
  | 'parental'
  | 'wifi'
  | 'alerts';

export type DomainCategory =
  | 'video'
  | 'social'
  | 'work'
  | 'gaming'
  | 'education'
  | 'adult'
  | 'shopping'
  | 'other';

export type DomainStatus = 'allowed' | 'blocked';

export interface UserSettings {
  ownerId: string;
  displayName: string;
  notificationsEnabled: boolean;
  soundAlerts: boolean;
  activeRouterId: string;
}

export interface RouterProfile {
  id: string;
  ownerId: string;
  name: string;
  brandModel: string;
  gatewayIp: string;
  wanDownloadMbps: number;
  wanUploadMbps: number;
  monthlyQuotaGb: number;
  usedQuotaGb: number;
  billingDay: number;
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
  dnsPrimary: string;
  dnsSecondary: string;
  wpsEnabled: boolean;
  qosMode: QosMode;
  newDeviceAlert: boolean;
  autoBlockUnknown: boolean;
  lineAttenuationDown: number;
  snrMarginDown: number;
  uptimeSeconds: number;
}

export interface SubscriberGroup {
  id: string;
  ownerId: string;
  routerId: string;
  name: string;
  speedLimitMbps: number;
  uploadLimitMbps: number;
  quotaLimitGb: number;
  usedGb: number;
  priority: SubscriberPriority;
  paused: boolean;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
}

export interface NetworkDevice {
  id: string;
  ownerId: string;
  routerId: string;
  subscriberId: string;
  name: string;
  hostname: string;
  macAddress: string;
  ipAddress: string;
  vendor: string;
  deviceType: DeviceType;
  band: WifiBand;
  rssi: number;
  online: boolean;
  blocked: boolean;
  trusted: boolean;
  speedLimitDownMbps: number;
  speedLimitUpMbps: number;
  quotaLimitGb: number;
  usedGb: number;
  currentDownMbps: number;
  currentUpMbps: number;
  lastSeenAt: string;
  firstSeenAt: string;
}

export interface NetworkAlert {
  id: string;
  ownerId: string;
  routerId: string;
  type: AlertType;
  title: string;
  message: string;
  deviceId: string;
  macAddress: string;
  ipAddress: string;
  read: boolean;
  severity: AlertSeverity;
  createdAtIso?: string;
}

export interface ParentalRule {
  id: string;
  ownerId: string;
  routerId: string;
  targetType: 'router' | 'subscriber' | 'device';
  targetId: string;
  targetName: string;
  blockAdultContent: boolean;
  safeSearchEnabled: boolean;
  blockGambling: boolean;
  blockSocialMedia: boolean;
  blockGaming: boolean;
  scheduleEnabled: boolean;
  bedtimeStart: string;
  bedtimeEnd: string;
  customBlockedDomains: string[];
}

export interface DomainActivityLog {
  id: string;
  ownerId: string;
  routerId: string;
  deviceId: string;
  deviceName: string;
  domain: string;
  category: DomainCategory;
  status: DomainStatus;
  requestsCount: number;
  dataUsedMb: number;
  lastVisitedAt: string;
}

export const SCHEMA_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  MAC_REGEX: /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
  TIME_REGEX: /^([01]\d|2[0-3]):[0-5]\d$/,
  ROUTER_NAME_MAX: 80,
  SSID_MAX: 32,
  SUBSCRIBER_NAME_MAX: 60,
  DEVICE_NAME_MAX: 80,
  ALERT_TITLE_MAX: 120,
  ALERT_MSG_MAX: 300,
  DOMAIN_MAX: 120,
  CUSTOM_DOMAINS_MAX: 30,
} as const;

export function sanitizeString(value: string, maxLength: number, fallback: string): string {
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : fallback;
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
