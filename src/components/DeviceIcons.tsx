import {
  Gamepad2,
  Laptop,
  Router,
  Smartphone,
  Tablet,
  Tv,
  Wifi,
} from 'lucide-react';
import { DeviceType } from '@/src/types/network';

export function DeviceTypeIcon({
  type,
  className = 'w-4 h-4',
}: {
  type: DeviceType;
  className?: string;
}) {
  switch (type) {
    case 'phone':
      return <Smartphone className={className} />;
    case 'laptop':
      return <Laptop className={className} />;
    case 'tv':
      return <Tv className={className} />;
    case 'console':
      return <Gamepad2 className={className} />;
    case 'tablet':
      return <Tablet className={className} />;
    case 'iot':
      return <Wifi className={className} />;
    default:
      return <Router className={className} />;
  }
}

export function getDeviceTypeLabel(type: DeviceType): string {
  const labels: Record<DeviceType, string> = {
    phone: 'هاتف ذكي',
    laptop: 'حاسوب محمول',
    tv: 'تلفاز ذكي',
    console: 'منصة ألعاب',
    iot: 'جهاز ذكي IoT',
    tablet: 'جهاز لوحي',
    other: 'جهاز شبكة',
  };
  return labels[type];
}

export function getSignalLabel(rssi: number, band: string): {
  label: string;
  tone: 'good' | 'fair' | 'weak';
} {
  if (band === 'LAN') {
    return { label: 'كابل مباشر', tone: 'good' };
  }
  if (rssi >= -55) return { label: 'ممتازة', tone: 'good' };
  if (rssi >= -70) return { label: 'متوسطة', tone: 'fair' };
  return { label: 'ضعيفة', tone: 'weak' };
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} يوم · ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة · ${mins} دقيقة`;
  return `${mins} دقيقة`;
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'الآن';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
