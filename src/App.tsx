import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Bell,
  Cloud,
  CloudOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Radio,
  Router as RouterIcon,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  DeviceType,
  DomainActivityLog,
  NetworkAlert,
  NetworkDevice,
  ParentalRule,
  QosMode,
  RouterProfile,
  SCHEMA_LIMITS,
  SecurityMode,
  SubscriberGroup,
} from '@/src/types/network';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '@/src/lib/firebase';
import {
  createDefaultAlerts,
  createDefaultDevices,
  createDefaultDomainLogs,
  createDefaultParentalRules,
  createDefaultRouter,
  createDefaultSubscribers,
  generateDomainVisitEvent,
  generateRandomNewDevice,
  playAlertChime,
} from '@/src/data/defaultNetwork';
import { OverviewSection } from '@/src/components/OverviewSection';
import { DevicesSection } from '@/src/components/DevicesSection';
import { SubscribersSection } from '@/src/components/SubscribersSection';
import { ParentalControlSection } from '@/src/components/ParentalControlSection';
import { WifiControlSection } from '@/src/components/WifiControlSection';
import { AlertsSection } from '@/src/components/AlertsSection';
import { ThroughputPoint } from '@/src/components/BandwidthChart';
import { RouterGatewayModal } from '@/src/components/RouterGatewayModal';
import { AndroidAppModal } from '@/src/components/AndroidAppModal';
import { useOnlineStatus, usePWAInstall } from '@/src/hooks/usePWAInstall';

const LOCAL_STORAGE_KEY = 'router_pro_workspace_v1';

interface LocalWorkspace {
  router: RouterProfile;
  subscribers: SubscriberGroup[];
  devices: NetworkDevice[];
  alerts: NetworkAlert[];
  parentalRules: ParentalRule[];
  domainLogs: DomainActivityLog[];
  soundAlerts: boolean;
}

function loadLocalWorkspace(): LocalWorkspace {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalWorkspace>;
      if (parsed && parsed.router && Array.isArray(parsed.devices)) {
        const routerId = parsed.router.id || 'router-main';
        return {
          router: parsed.router,
          subscribers: parsed.subscribers || createDefaultSubscribers('local-user', routerId),
          devices: parsed.devices,
          alerts: parsed.alerts || createDefaultAlerts('local-user', routerId),
          parentalRules:
            Array.isArray(parsed.parentalRules) && parsed.parentalRules.length > 0
              ? parsed.parentalRules
              : createDefaultParentalRules('local-user', routerId),
          domainLogs:
            Array.isArray(parsed.domainLogs) && parsed.domainLogs.length > 0
              ? parsed.domainLogs
              : createDefaultDomainLogs('local-user', routerId),
          soundAlerts: typeof parsed.soundAlerts === 'boolean' ? parsed.soundAlerts : true,
        };
      }
    }
  } catch {
    // Fallback to fresh defaults
  }
  const router = createDefaultRouter('local-user', 'router-main');
  return {
    router,
    subscribers: createDefaultSubscribers('local-user', router.id),
    devices: createDefaultDevices('local-user', router.id),
    alerts: createDefaultAlerts('local-user', router.id),
    parentalRules: createDefaultParentalRules('local-user', router.id),
    domainLogs: createDefaultDomainLogs('local-user', router.id),
    soundAlerts: true,
  };
}

function buildInitialHistory(devices: NetworkDevice[]): ThroughputPoint[] {
  const activeDown = devices
    .filter((d) => d.online && !d.blocked)
    .reduce((acc, d) => acc + d.currentDownMbps, 0);
  const activeUp = devices
    .filter((d) => d.online && !d.blocked)
    .reduce((acc, d) => acc + d.currentUpMbps, 0);

  const now = Date.now();
  return Array.from({ length: 12 }, (_, idx) => {
    const t = new Date(now - (11 - idx) * 4000);
    const label = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`;
    const wave = Math.sin(idx * 0.7) * 4.5;
    return {
      timeLabel: label,
      downloadMbps: Number(Math.max(2, activeDown + wave).toFixed(1)),
      uploadMbps: Number(Math.max(0.8, activeUp + wave * 0.25).toFixed(1)),
    };
  });
}

export default function App() {
  const initialLocal = useMemo(() => loadLocalWorkspace(), []);

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('router_pro_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('router_pro_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('router_pro_theme', 'light');
    }
  }, [darkMode]);

  // Auth & Cloud State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Workspace State
  const [router, setRouter] = useState<RouterProfile>(initialLocal.router);
  const [subscribers, setSubscribers] = useState<SubscriberGroup[]>(initialLocal.subscribers);
  const [devices, setDevices] = useState<NetworkDevice[]>(initialLocal.devices);
  const [alerts, setAlerts] = useState<NetworkAlert[]>(initialLocal.alerts);
  const [parentalRules, setParentalRules] = useState<ParentalRule[]>(initialLocal.parentalRules);
  const [domainLogs, setDomainLogs] = useState<DomainActivityLog[]>(initialLocal.domainLogs);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(initialLocal.soundAlerts);

  // UI Navigation & Feedback
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedDomainDeviceFilter, setSelectedDomainDeviceFilter] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [routerModalOpen, setRouterModalOpen] = useState(false);
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const [liveTrafficEnabled, setLiveTrafficEnabled] = useState(true);
  const isOnline = useOnlineStatus();
  const { canInstall, isInstalled, isAndroid, isIOS, triggerInstall } = usePWAInstall();
  const [history, setHistory] = useState<ThroughputPoint[]>(() =>
    buildInitialHistory(initialLocal.devices)
  );
  const [toast, setToast] = useState<{
    id: string;
    title: string;
    message: string;
    tone: 'info' | 'warning' | 'critical' | 'success';
    deviceId?: string;
  } | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback(
    (
      title: string,
      message: string,
      tone: 'info' | 'warning' | 'critical' | 'success' = 'info',
      deviceId?: string
    ) => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      setToast({ id: String(Date.now()), title, message, tone, deviceId });
      toastTimerRef.current = window.setTimeout(() => setToast(null), 6500);
    },
    []
  );

  // Persist locally when not signed in
  useEffect(() => {
    if (user) return;
    try {
      const payload: LocalWorkspace = {
        router,
        subscribers,
        devices,
        alerts,
        parentalRules,
        domainLogs,
        soundAlerts,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [user, router, subscribers, devices, alerts, parentalRules, domainLogs, soundAlerts]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Seed or load Firestore workspace when signed in
  const activeRouterId = router.id;
  const activeUid = user?.uid || null;

  useEffect(() => {
    if (!authReady || !user) return;

    let unsubRouter: (() => void) | undefined;
    let unsubSubs: (() => void) | undefined;
    let unsubDevs: (() => void) | undefined;
    let unsubAlerts: (() => void) | undefined;
    let unsubParental: (() => void) | undefined;
    let unsubDomainLogs: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let cancelled = false;

    const initCloudWorkspace = async () => {
      setCloudLoading(true);
      try {
        const routersRef = collection(db, 'routers');
        const qRouters = query(routersRef, where('ownerId', '==', user.uid));
        let snap;
        try {
          snap = await getDocs(qRouters);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'routers');
          return;
        }

        let targetRouterId = 'router-main';

        if (snap.empty) {
          // Seed Firestore from user's current workspace so no work is lost
          const batch = writeBatch(db);
          const seedRouter: RouterProfile = {
            ...router,
            id: targetRouterId,
            ownerId: user.uid,
          };
          const { id: _rid, ...routerData } = seedRouter;
          batch.set(doc(db, 'routers', targetRouterId), {
            ...routerData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          subscribers.forEach((s) => {
            const { id: sid, ...subData } = s;
            batch.set(doc(db, 'routers', targetRouterId, 'subscribers', sid), {
              ...subData,
              ownerId: user.uid,
              routerId: targetRouterId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          devices.forEach((d) => {
            const { id: did, ...devData } = d;
            batch.set(doc(db, 'routers', targetRouterId, 'devices', did), {
              ...devData,
              ownerId: user.uid,
              routerId: targetRouterId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          alerts.forEach((a) => {
            const { id: aid, createdAtIso: _iso, ...alertData } = a;
            batch.set(doc(db, 'routers', targetRouterId, 'alerts', aid), {
              ...alertData,
              ownerId: user.uid,
              routerId: targetRouterId,
              createdAt: serverTimestamp(),
            });
          });

          parentalRules.forEach((r) => {
            const { id: rid, ...ruleData } = r;
            batch.set(doc(db, 'routers', targetRouterId, 'parentalRules', rid), {
              ...ruleData,
              ownerId: user.uid,
              routerId: targetRouterId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          domainLogs.forEach((l) => {
            const { id: lid, ...logData } = l;
            batch.set(doc(db, 'routers', targetRouterId, 'domainLogs', lid), {
              ...logData,
              ownerId: user.uid,
              routerId: targetRouterId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });

          batch.set(doc(db, 'userSettings', user.uid), {
            ownerId: user.uid,
            displayName: (user.displayName || 'مدير الشبكة').slice(0, 80),
            notificationsEnabled: router.newDeviceAlert,
            soundAlerts,
            activeRouterId: targetRouterId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          try {
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `routers/${targetRouterId}`);
          }
        } else {
          targetRouterId = snap.docs[0].id;
          // Ensure existing cloud users get parentalRules & domainLogs seeded if not present yet
          try {
            const existingRulesSnap = await getDocs(
              query(
                collection(db, 'routers', targetRouterId, 'parentalRules'),
                where('ownerId', '==', user.uid)
              )
            );
            if (existingRulesSnap.empty) {
              const seedBatch = writeBatch(db);
              createDefaultParentalRules(user.uid, targetRouterId).forEach((r) => {
                const { id: rid, ...ruleData } = r;
                seedBatch.set(doc(db, 'routers', targetRouterId, 'parentalRules', rid), {
                  ...ruleData,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              });
              createDefaultDomainLogs(user.uid, targetRouterId).forEach((l) => {
                const { id: lid, ...logData } = l;
                seedBatch.set(doc(db, 'routers', targetRouterId, 'domainLogs', lid), {
                  ...logData,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              });
              await seedBatch.commit();
            }
          } catch (err) {
            handleFirestoreError(
              err,
              OperationType.LIST,
              `routers/${targetRouterId}/parentalRules`
            );
          }
        }

        if (cancelled) return;

        // Subscribe to Router Document
        unsubRouter = onSnapshot(
          query(collection(db, 'routers'), where('ownerId', '==', user.uid)),
          (rSnap) => {
            if (!rSnap.empty) {
              const first = rSnap.docs[0];
              setRouter({ id: first.id, ...(first.data() as Omit<RouterProfile, 'id'>) });
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'routers')
        );

        // Subscribe to Subscribers
        unsubSubs = onSnapshot(
          query(
            collection(db, 'routers', targetRouterId, 'subscribers'),
            where('ownerId', '==', user.uid)
          ),
          (sSnap) => {
            const list = sSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<SubscriberGroup, 'id'>),
            }));
            setSubscribers(list);
          },
          (err) =>
            handleFirestoreError(
              err,
              OperationType.LIST,
              `routers/${targetRouterId}/subscribers`
            )
        );

        // Subscribe to Devices
        unsubDevs = onSnapshot(
          query(
            collection(db, 'routers', targetRouterId, 'devices'),
            where('ownerId', '==', user.uid)
          ),
          (dSnap) => {
            const list = dSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<NetworkDevice, 'id'>),
            }));
            setDevices(list);
          },
          (err) =>
            handleFirestoreError(
              err,
              OperationType.LIST,
              `routers/${targetRouterId}/devices`
            )
        );

        // Subscribe to Alerts
        unsubAlerts = onSnapshot(
          query(
            collection(db, 'routers', targetRouterId, 'alerts'),
            where('ownerId', '==', user.uid)
          ),
          (aSnap) => {
            const list = aSnap.docs
              .map((d) => {
                const raw = d.data() as Omit<NetworkAlert, 'id'> & {
                  createdAt?: { toDate?: () => Date };
                };
                return {
                  ...raw,
                  id: d.id,
                  createdAtIso: raw.createdAt?.toDate
                    ? raw.createdAt.toDate().toISOString()
                    : new Date().toISOString(),
                };
              })
              .sort(
                (a, b) =>
                  new Date(b.createdAtIso || 0).getTime() -
                  new Date(a.createdAtIso || 0).getTime()
              );
            setAlerts(list);
          },
          (err) =>
            handleFirestoreError(
              err,
              OperationType.LIST,
              `routers/${targetRouterId}/alerts`
            )
        );

        // Subscribe to Parental Rules
        unsubParental = onSnapshot(
          query(
            collection(db, 'routers', targetRouterId, 'parentalRules'),
            where('ownerId', '==', user.uid)
          ),
          (pSnap) => {
            const list = pSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<ParentalRule, 'id'>),
            }));
            setParentalRules(list);
          },
          (err) =>
            handleFirestoreError(
              err,
              OperationType.LIST,
              `routers/${targetRouterId}/parentalRules`
            )
        );

        // Subscribe to Domain Activity Logs
        unsubDomainLogs = onSnapshot(
          query(
            collection(db, 'routers', targetRouterId, 'domainLogs'),
            where('ownerId', '==', user.uid)
          ),
          (lSnap) => {
            const list = lSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<DomainActivityLog, 'id'>),
            }));
            setDomainLogs(list);
          },
          (err) =>
            handleFirestoreError(
              err,
              OperationType.LIST,
              `routers/${targetRouterId}/domainLogs`
            )
        );

        // Subscribe to User Settings
        unsubSettings = onSnapshot(
          doc(db, 'userSettings', user.uid),
          (uSnap) => {
            if (uSnap.exists()) {
              const data = uSnap.data() as { soundAlerts?: boolean };
              if (typeof data.soundAlerts === 'boolean') {
                setSoundAlerts(data.soundAlerts);
              }
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `userSettings/${user.uid}`)
        );
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    };

    void initCloudWorkspace();

    return () => {
      cancelled = true;
      unsubRouter?.();
      unsubSubs?.();
      unsubDevs?.();
      unsubAlerts?.();
      unsubParental?.();
      unsubDomainLogs?.();
      unsubSettings?.();
    };
  }, [authReady, user]);

  // Live traffic & throughput chart simulation loop
  useEffect(() => {
    if (!liveTrafficEnabled) return;

    const timer = window.setInterval(() => {
      setDevices((prevDevices) => {
        const subMap = new Map(subscribers.map((s) => [s.id, s]));
        let totalDown = 0;
        let totalUp = 0;

        const nextDevices = prevDevices.map((dev) => {
          if (dev.blocked || !dev.online) {
            return { ...dev, currentDownMbps: 0, currentUpMbps: 0 };
          }
          const sub = dev.subscriberId ? subMap.get(dev.subscriberId) : undefined;
          if (sub?.paused) {
            return { ...dev, currentDownMbps: 0, currentUpMbps: 0 };
          }

          const capDown = Math.min(
            dev.speedLimitDownMbps > 0 ? dev.speedLimitDownMbps : router.wanDownloadMbps,
            sub && sub.speedLimitMbps > 0 ? sub.speedLimitMbps : router.wanDownloadMbps
          );
          const capUp = Math.min(
            dev.speedLimitUpMbps > 0 ? dev.speedLimitUpMbps : router.wanUploadMbps,
            sub && sub.uploadLimitMbps > 0 ? sub.uploadLimitMbps : router.wanUploadMbps
          );

          const jitterDown = (Math.random() - 0.48) * 3.2;
          const jitterUp = (Math.random() - 0.48) * 0.8;

          const nextDown = Number(
            Math.max(0.2, Math.min(capDown, dev.currentDownMbps + jitterDown)).toFixed(1)
          );
          const nextUp = Number(
            Math.max(0.1, Math.min(capUp, dev.currentUpMbps + jitterUp)).toFixed(1)
          );

          totalDown += nextDown;
          totalUp += nextUp;

          // Incremental GB accumulation (scaled gently so user sees real counter progression)
          const deltaGb = (nextDown + nextUp) * 0.00045;
          return {
            ...dev,
            currentDownMbps: nextDown,
            currentUpMbps: nextUp,
            usedGb: Number((dev.usedGb + deltaGb).toFixed(2)),
          };
        });

        const now = new Date();
        const label = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        setHistory((prevHist) => [
          ...prevHist.slice(-17),
          {
            timeLabel: label,
            downloadMbps: Number(Math.min(router.wanDownloadMbps, totalDown).toFixed(1)),
            uploadMbps: Number(Math.min(router.wanUploadMbps, totalUp).toFixed(1)),
          },
        ]);

        return nextDevices;
      });

      setRouter((prevRouter) => ({
        ...prevRouter,
        uptimeSeconds: prevRouter.uptimeSeconds + 3,
        usedQuotaGb: Number((prevRouter.usedQuotaGb + 0.01).toFixed(2)),
      }));
    }, 3000);

    return () => window.clearInterval(timer);
  }, [liveTrafficEnabled, router.wanDownloadMbps, router.wanUploadMbps, subscribers]);

  // Auth Actions
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('تم تفعيل المزامنة السحابية', 'يتم الآن حفظ جميع إعدادات الراوتر والأجهزة في حسابك.', 'success');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'تعذّر تسجيل الدخول.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast('تم تسجيل الخروج', 'تم الرجوع لوضع الحفظ المحلي على المتصفح.', 'info');
  };

  // Helper to create alert in local or Firestore
  const pushAlert = useCallback(
    async (
      alertInput: Omit<NetworkAlert, 'id' | 'ownerId' | 'routerId' | 'createdAtIso'>
    ) => {
      const alertId = `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const ownerId = activeUid || 'local-user';
      const newAlert: NetworkAlert = {
        ...alertInput,
        id: alertId,
        ownerId,
        routerId: activeRouterId,
        createdAtIso: new Date().toISOString(),
      };

      if (!activeUid) {
        setAlerts((prev) => [newAlert, ...prev]);
        return;
      }

      const path = `routers/${activeRouterId}/alerts/${alertId}`;
      try {
        const { id: _id, createdAtIso: _iso, ...docPayload } = newAlert;
        await setDoc(doc(db, 'routers', activeRouterId, 'alerts', alertId), {
          ...docPayload,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [activeUid, activeRouterId]
  );

  // Device Actions
  const handleToggleBlockDevice = async (device: NetworkDevice) => {
    const nextBlocked = !device.blocked;
    const patch = {
      blocked: nextBlocked,
      trusted: nextBlocked ? false : device.trusted,
      online: !nextBlocked,
      currentDownMbps: nextBlocked ? 0 : 2.4,
      currentUpMbps: nextBlocked ? 0 : 0.6,
    };

    if (!activeUid) {
      setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, ...patch } : d)));
    } else {
      const path = `routers/${activeRouterId}/devices/${device.id}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId, 'devices', device.id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    if (nextBlocked) {
      await pushAlert({
        type: 'device_blocked',
        title: `تم حظر الجهاز: ${device.name}`,
        message: `تم قطع الاتصال وحظر عنوان MAC (${device.macAddress}) من دخول الشبكة.`,
        deviceId: device.id,
        macAddress: device.macAddress,
        ipAddress: device.ipAddress,
        read: false,
        severity: 'warning',
      });
      showToast('تم حظر الجهاز', `${device.name} لم يعد قادراً على استخدام الشبكة.`, 'warning');
    } else {
      showToast('تم فك الحظر', `أصبح بإمكان ${device.name} الاتصال بالواي فاي مجدداً.`, 'success');
    }
  };

  const handleTrustDevice = async (device: NetworkDevice) => {
    const patch = {
      blocked: false,
      trusted: true,
      online: true,
      currentDownMbps: device.currentDownMbps || 3.2,
      currentUpMbps: device.currentUpMbps || 0.8,
    };

    if (!activeUid) {
      setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, ...patch } : d)));
    } else {
      const path = `routers/${activeRouterId}/devices/${device.id}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId, 'devices', device.id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
    showToast('تم اعتماد الجهاز', `أصبح ${device.name} جهازاً موثوقاً في الشبكة.`, 'success');
  };

  const handleUpdateDevicePolicy = async (
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
  ) => {
    if (!activeUid) {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id
            ? {
                ...d,
                ...patch,
                online: patch.blocked ? false : d.online,
                currentDownMbps: patch.blocked ? 0 : d.currentDownMbps,
                currentUpMbps: patch.blocked ? 0 : d.currentUpMbps,
              }
            : d
        )
      );
    } else {
      const path = `routers/${activeRouterId}/devices/${device.id}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId, 'devices', device.id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
    showToast('تم تحديث سياسة الجهاز', `تم حفظ حدود السرعة والجيجات لـ ${patch.name}.`, 'success');
  };

  const handleAddManualMacBlock = async ({
    name,
    macAddress,
  }: {
    name: string;
    macAddress: string;
  }) => {
    const id = `dev-mac-${Date.now()}`;
    const now = new Date().toISOString();
    const newDevice: NetworkDevice = {
      id,
      ownerId: activeUid || 'local-user',
      routerId: activeRouterId,
      subscriberId: '',
      name,
      hostname: `blocked-${macAddress.slice(-5).replace(':', '')}`,
      macAddress,
      ipAddress: '192.168.1.250',
      vendor: 'MAC Blacklist',
      deviceType: 'other',
      band: '2.4GHz',
      rssi: -80,
      online: false,
      blocked: true,
      trusted: false,
      speedLimitDownMbps: 0,
      speedLimitUpMbps: 0,
      quotaLimitGb: 0,
      usedGb: 0,
      currentDownMbps: 0,
      currentUpMbps: 0,
      lastSeenAt: now,
      firstSeenAt: now,
    };

    if (!activeUid) {
      setDevices((prev) => [newDevice, ...prev]);
    } else {
      const path = `routers/${activeRouterId}/devices/${id}`;
      try {
        const { id: _id, ...payload } = newDevice;
        await setDoc(doc(db, 'routers', activeRouterId, 'devices', id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    await pushAlert({
      type: 'device_blocked',
      title: `حظر يدوي لعنوان MAC`,
      message: `تمت إضافة ${name} (${macAddress}) إلى قائمة الحظر الدائمة.`,
      deviceId: id,
      macAddress,
      ipAddress: '192.168.1.250',
      read: false,
      severity: 'critical',
    });
    showToast('تم حظر MAC', `تم منع ${macAddress} من الاتصال بالراوتر.`, 'warning');
  };

  const handleDeleteDevice = async (device: NetworkDevice) => {
    if (!activeUid) {
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
    } else {
      const path = `routers/${activeRouterId}/devices/${device.id}`;
      try {
        await deleteDoc(doc(db, 'routers', activeRouterId, 'devices', device.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
    showToast('تم إزالة الجهاز', `تم حذف ${device.name} من السجل.`, 'info');
  };

  // Simulate New Device Entering Network
  const handleSimulateNewDevice = async () => {
    const newDev = generateRandomNewDevice(
      activeUid || 'local-user',
      activeRouterId,
      router.autoBlockUnknown
    );

    if (!activeUid) {
      setDevices((prev) => [newDev, ...prev]);
    } else {
      const path = `routers/${activeRouterId}/devices/${newDev.id}`;
      try {
        const { id: _id, ...payload } = newDev;
        await setDoc(doc(db, 'routers', activeRouterId, 'devices', newDev.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    if (router.newDeviceAlert) {
      if (soundAlerts) playAlertChime();

      const alertTitle = router.autoBlockUnknown
        ? `تم رصد وحظر جهاز جديد تلقائياً: ${newDev.name}`
        : `تنبيه: دخول جهاز جديد للشبكة (${newDev.name})`;
      const alertMsg = router.autoBlockUnknown
        ? `حاول الجهاز ${newDev.hostname} (${newDev.macAddress}) الاتصال بشبكة ${newDev.band} وتم حظره فوراً.`
        : `اتصل الجهاز ${newDev.hostname} (${newDev.ipAddress}) على نطاق ${newDev.band}. يمكنك اعتماده أو حظره الآن.`;

      await pushAlert({
        type: router.autoBlockUnknown ? 'device_blocked' : 'new_device',
        title: alertTitle,
        message: alertMsg,
        deviceId: newDev.id,
        macAddress: newDev.macAddress,
        ipAddress: newDev.ipAddress,
        read: false,
        severity: router.autoBlockUnknown ? 'critical' : 'warning',
      });

      showToast(
        alertTitle,
        alertMsg,
        router.autoBlockUnknown ? 'critical' : 'warning',
        newDev.id
      );
    }
  };

  // Subscriber Actions
  const handleCreateSubscriber = async (
    payload: Omit<SubscriberGroup, 'id' | 'ownerId' | 'routerId'>
  ) => {
    const id = `sub-${Date.now()}`;
    const newSub: SubscriberGroup = {
      ...payload,
      id,
      ownerId: activeUid || 'local-user',
      routerId: activeRouterId,
    };

    if (!activeUid) {
      setSubscribers((prev) => [...prev, newSub]);
    } else {
      const path = `routers/${activeRouterId}/subscribers/${id}`;
      try {
        const { id: _id, ...docData } = newSub;
        await setDoc(doc(db, 'routers', activeRouterId, 'subscribers', id), {
          ...docData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
    showToast('تمت إضافة المشترك', `تم إنشاء مجموعة "${payload.name}" بنجاح.`, 'success');
  };

  const handleUpdateSubscriber = async (
    subscriber: SubscriberGroup,
    patch: Omit<SubscriberGroup, 'id' | 'ownerId' | 'routerId'>
  ) => {
    if (!activeUid) {
      setSubscribers((prev) =>
        prev.map((s) => (s.id === subscriber.id ? { ...s, ...patch } : s))
      );
    } else {
      const path = `routers/${activeRouterId}/subscribers/${subscriber.id}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId, 'subscribers', subscriber.id), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
    showToast('تم تحديث المشترك', `تم حفظ حدود "${patch.name}".`, 'success');
  };

  const handleDeleteSubscriber = async (subscriber: SubscriberGroup) => {
    if (!activeUid) {
      setSubscribers((prev) => prev.filter((s) => s.id !== subscriber.id));
      setDevices((prev) =>
        prev.map((d) => (d.subscriberId === subscriber.id ? { ...d, subscriberId: '' } : d))
      );
    } else {
      const path = `routers/${activeRouterId}/subscribers/${subscriber.id}`;
      try {
        await deleteDoc(doc(db, 'routers', activeRouterId, 'subscribers', subscriber.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
    showToast('تم حذف المشترك', `تمت إزالة مجموعة "${subscriber.name}".`, 'info');
  };

  const handleAutoBalanceSubscribers = async () => {
    if (subscribers.length === 0) return;
    const weights = subscribers.map((s) =>
      s.priority === 'high' ? 2 : s.priority === 'normal' ? 1.2 : 0.6
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const updated = subscribers.map((s, idx) => {
      const share = weights[idx] / totalWeight;
      const quotaLimitGb = Math.max(5, Math.round(router.monthlyQuotaGb * share));
      const speedLimitMbps = Math.max(2, Math.round(router.wanDownloadMbps * share));
      const uploadLimitMbps = Math.max(1, Math.round(router.wanUploadMbps * share));
      return { ...s, quotaLimitGb, speedLimitMbps, uploadLimitMbps };
    });

    if (!activeUid) {
      setSubscribers(updated);
    } else {
      const batch = writeBatch(db);
      updated.forEach((s) => {
        batch.update(doc(db, 'routers', activeRouterId, 'subscribers', s.id), {
          quotaLimitGb: s.quotaLimitGb,
          speedLimitMbps: s.speedLimitMbps,
          uploadLimitMbps: s.uploadLimitMbps,
          updatedAt: serverTimestamp(),
        });
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `routers/${activeRouterId}/subscribers`);
      }
    }
    showToast(
      'تم التوزيع العادل',
      `تم تقسيم ${router.monthlyQuotaGb} GB وسرعة ${router.wanDownloadMbps} Mbps وفق الأولويات.`,
      'success'
    );
  };

  // Router & Wi-Fi Updates
  const handleSaveWifiSettings = async (patch: {
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
  }) => {
    if (!activeUid) {
      setRouter((prev) => ({ ...prev, ...patch }));
    } else {
      const path = `routers/${activeRouterId}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
    showToast('تم حفظ إعدادات الواي فاي', 'تم تطبيق إعدادات البث والحماية على الراوتر.', 'success');
  };

  const handleSaveNetworkRouting = async (patch: {
    dnsPrimary: string;
    dnsSecondary: string;
    qosMode: QosMode;
  }) => {
    if (!activeUid) {
      setRouter((prev) => ({ ...prev, ...patch }));
    } else {
      const path = `routers/${activeRouterId}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
    showToast('تم تحديث DNS و QoS', 'تم تطبيق خوادم DNS وأولوية التوجيه الجديدة.', 'success');
  };

  const handleSaveRouterGateway = async (patch: {
    name: string;
    brandModel: string;
    gatewayIp: string;
    wanDownloadMbps: number;
    wanUploadMbps: number;
    monthlyQuotaGb: number;
    billingDay: number;
  }) => {
    if (!activeUid) {
      setRouter((prev) => ({ ...prev, ...patch }));
    } else {
      const path = `routers/${activeRouterId}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
    showToast('تم حفظ بيانات الراوتر', 'تم تحديث مواصفات الخط والباقة الشهرية.', 'success');
  };

  const handleResetMonthlyQuota = async () => {
    if (!activeUid) {
      setRouter((prev) => ({ ...prev, usedQuotaGb: 0 }));
      setSubscribers((prev) => prev.map((s) => ({ ...s, usedGb: 0 })));
      setDevices((prev) => prev.map((d) => ({ ...d, usedGb: 0 })));
    } else {
      const batch = writeBatch(db);
      batch.update(doc(db, 'routers', activeRouterId), {
        usedQuotaGb: 0,
        updatedAt: serverTimestamp(),
      });
      subscribers.forEach((s) => {
        batch.update(doc(db, 'routers', activeRouterId, 'subscribers', s.id), {
          usedGb: 0,
          updatedAt: serverTimestamp(),
        });
      });
      devices.forEach((d) => {
        batch.update(doc(db, 'routers', activeRouterId, 'devices', d.id), {
          usedGb: 0,
          currentDownMbps: d.currentDownMbps,
          currentUpMbps: d.currentUpMbps,
          online: d.online,
          rssi: d.rssi,
          lastSeenAt: d.lastSeenAt,
          updatedAt: serverTimestamp(),
        });
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `routers/${activeRouterId}`);
      }
    }
    showToast('تم تصفير العدادات', 'بدأت دورة استهلاك شهرية جديدة بنجاح.', 'success');
  };

  // Alerts Actions
  const handleMarkAlertRead = async (alert: NetworkAlert) => {
    if (!activeUid) {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, read: true } : a)));
    } else {
      const path = `routers/${activeRouterId}/alerts/${alert.id}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId, 'alerts', alert.id), { read: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  };

  const handleMarkAllAlertsRead = async () => {
    const unread = alerts.filter((a) => !a.read);
    if (unread.length === 0) return;

    if (!activeUid) {
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } else {
      const batch = writeBatch(db);
      unread.forEach((a) => {
        batch.update(doc(db, 'routers', activeRouterId, 'alerts', a.id), { read: true });
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `routers/${activeRouterId}/alerts`);
      }
    }
  };

  const handleDeleteAlert = async (alert: NetworkAlert) => {
    if (!activeUid) {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } else {
      const path = `routers/${activeRouterId}/alerts/${alert.id}`;
      try {
        await deleteDoc(doc(db, 'routers', activeRouterId, 'alerts', alert.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  const handleToggleSound = async () => {
    const next = !soundAlerts;
    setSoundAlerts(next);
    if (activeUid) {
      const path = `userSettings/${activeUid}`;
      try {
        await updateDoc(doc(db, 'userSettings', activeUid), {
          soundAlerts: next,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  };

  const handleQuickRouterToggle = async (
    field: 'newDeviceAlert' | 'autoBlockUnknown',
    nextVal: boolean
  ) => {
    if (!activeUid) {
      setRouter((prev) => ({ ...prev, [field]: nextVal }));
    } else {
      const path = `routers/${activeRouterId}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId), {
          [field]: nextVal,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  };

  // Parental Control & Domain Tracking Handlers
  const handleSaveParentalRule = async (updatedRule: ParentalRule) => {
    if (!activeUid) {
      setParentalRules((prev) =>
        prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
      );
      if (updatedRule.targetType === 'router') {
        setRouter((prev) => ({
          ...prev,
          dnsPrimary: updatedRule.blockAdultContent ? '1.1.1.3' : prev.dnsPrimary,
          dnsSecondary: updatedRule.blockAdultContent ? '1.0.0.3' : prev.dnsSecondary,
        }));
      }
    } else {
      const path = `routers/${activeRouterId}/parentalRules/${updatedRule.id}`;
      try {
        await updateDoc(doc(db, 'routers', activeRouterId, 'parentalRules', updatedRule.id), {
          targetType: updatedRule.targetType,
          targetId: updatedRule.targetId,
          targetName: updatedRule.targetName,
          blockAdultContent: updatedRule.blockAdultContent,
          safeSearchEnabled: updatedRule.safeSearchEnabled,
          blockGambling: updatedRule.blockGambling,
          blockSocialMedia: updatedRule.blockSocialMedia,
          blockGaming: updatedRule.blockGaming,
          scheduleEnabled: updatedRule.scheduleEnabled,
          bedtimeStart: updatedRule.bedtimeStart,
          bedtimeEnd: updatedRule.bedtimeEnd,
          customBlockedDomains: updatedRule.customBlockedDomains,
          updatedAt: serverTimestamp(),
        });
        if (updatedRule.targetType === 'router' && updatedRule.blockAdultContent) {
          await updateDoc(doc(db, 'routers', activeRouterId), {
            dnsPrimary: '1.1.1.3',
            dnsSecondary: '1.0.0.3',
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
    showToast(
      'تم تحديث الرقابة الأبوية',
      `تم حفظ إعدادات التصفية والحماية لـ "${updatedRule.targetName}".`,
      'success'
    );
  };

  const handleCreateParentalRule = async (
    payload: Omit<ParentalRule, 'id' | 'ownerId' | 'routerId'>
  ) => {
    const id = `rule-${Date.now()}`;
    const newRule: ParentalRule = {
      ...payload,
      id,
      ownerId: activeUid || 'local-user',
      routerId: activeRouterId,
    };

    if (!activeUid) {
      setParentalRules((prev) => [...prev, newRule]);
    } else {
      const path = `routers/${activeRouterId}/parentalRules/${id}`;
      try {
        const { id: _id, ...docData } = newRule;
        await setDoc(doc(db, 'routers', activeRouterId, 'parentalRules', id), {
          ...docData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
    showToast('تمت إضافة قاعدة رقابة', `تم إنشاء قاعدة مخصصة لـ "${payload.targetName}".`, 'success');
  };

  const handleDeleteParentalRule = async (rule: ParentalRule) => {
    if (rule.targetType === 'router') return;
    if (!activeUid) {
      setParentalRules((prev) => prev.filter((r) => r.id !== rule.id));
    } else {
      const path = `routers/${activeRouterId}/parentalRules/${rule.id}`;
      try {
        await deleteDoc(doc(db, 'routers', activeRouterId, 'parentalRules', rule.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
    showToast('تم حذف القاعدة', `تمت إزالة التخصيص عن "${rule.targetName}".`, 'info');
  };

  const handleBlockDomain = async (domain: string, targetRuleId: string) => {
    const targetRule = parentalRules.find((r) => r.id === targetRuleId) || parentalRules[0];
    if (!targetRule) return;
    if (targetRule.customBlockedDomains.includes(domain)) {
      showToast('النطاق محظور بالفعل', `${domain} موجود في قائمة الحظر.`, 'info');
      return;
    }
    if (targetRule.customBlockedDomains.length >= SCHEMA_LIMITS.CUSTOM_DOMAINS_MAX) {
      showToast('تم بلوغ الحد الأقصى', 'يمكن إضافة حتى 30 نطاقاً مخصصاً لكل قاعدة.', 'warning');
      return;
    }

    const nextDomains = [domain, ...targetRule.customBlockedDomains];
    await handleSaveParentalRule({
      ...targetRule,
      customBlockedDomains: nextDomains,
    });

    // Mark matching domainLogs as blocked
    if (!activeUid) {
      setDomainLogs((prev) =>
        prev.map((l) => (l.domain === domain ? { ...l, status: 'blocked' } : l))
      );
    } else {
      const matching = domainLogs.filter((l) => l.domain === domain && l.status !== 'blocked');
      if (matching.length > 0) {
        const batch = writeBatch(db);
        matching.forEach((m) => {
          batch.update(doc(db, 'routers', activeRouterId, 'domainLogs', m.id), {
            status: 'blocked',
            updatedAt: serverTimestamp(),
          });
        });
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `routers/${activeRouterId}/domainLogs`);
        }
      }
    }
  };

  const handleUnblockDomain = async (domain: string, rule: ParentalRule) => {
    const nextDomains = rule.customBlockedDomains.filter((d) => d !== domain);
    await handleSaveParentalRule({
      ...rule,
      customBlockedDomains: nextDomains,
    });

    if (!activeUid) {
      setDomainLogs((prev) =>
        prev.map((l) =>
          l.domain === domain && l.category !== 'adult' ? { ...l, status: 'allowed' } : l
        )
      );
    }
  };

  const handleSimulateDomainCheck = async (simulateAdultAttempt: boolean) => {
    if (devices.length === 0) return;
    const { log, pickedDevice } = generateDomainVisitEvent(
      activeUid || 'local-user',
      activeRouterId,
      devices,
      simulateAdultAttempt
    );

    if (!activeUid) {
      setDomainLogs((prev) => [log, ...prev]);
    } else {
      const path = `routers/${activeRouterId}/domainLogs/${log.id}`;
      try {
        const { id: _id, ...payload } = log;
        await setDoc(doc(db, 'routers', activeRouterId, 'domainLogs', log.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    if (simulateAdultAttempt && pickedDevice) {
      if (soundAlerts) playAlertChime();
      await pushAlert({
        type: 'parental_blocked',
        title: `تم صد موقع غير لائق على جهاز ${pickedDevice.name}`,
        message: `منعت الرقابة الأبوية محاولة الوصول إلى ${log.domain} عبر حماية DNS العائلية.`,
        deviceId: pickedDevice.id,
        macAddress: pickedDevice.macAddress,
        ipAddress: pickedDevice.ipAddress,
        read: false,
        severity: 'critical',
      });
      showToast(
        `تم حظر موقع إباحي/ضار`,
        `تم منع ${pickedDevice.name} من فتح ${log.domain}.`,
        'critical'
      );
    } else {
      showToast(
        'تم تسجيل نشاط جديد',
        `تم رصد استخدام ${log.domain} على جهاز ${log.deviceName}.`,
        'info'
      );
    }
  };

  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'devices', label: 'الأجهزة والحظر', icon: Wifi, count: devices.length },
    { id: 'subscribers', label: 'تقسيم السرعة والجيجات', icon: Users, count: subscribers.length },
    { id: 'parental', label: 'الرقابة الأبوية والمواقع', icon: ShieldCheck },
    { id: 'wifi', label: 'التحكم بالواي فاي', icon: Radio },
    { id: 'alerts', label: 'الإشعارات والأمان', icon: Bell, count: unreadAlertsCount },
  ];

  const tabTitles: Record<ActiveTab, string> = {
    overview: 'نظرة عامة على الشبكة',
    devices: 'إدارة الأجهزة وحظر المتطفلين',
    subscribers: 'تقسيم السرعة والجيجات للمشتركين',
    parental: 'الرقابة الأبوية ومراقبة المواقع',
    wifi: 'التحكم الكامل بالواي فاي والحماية',
    alerts: 'مركز إشعارات الدخول والأمان',
  };

  const toastDevice = toast?.deviceId
    ? devices.find((d) => d.id === toast.deviceId)
    : undefined;

  return (
    <div dir="rtl" className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-30">
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800">
          <RouterIcon className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
          <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
            RouterCraft
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
              {router.name}
            </p>
            <p className="font-mono tabular-nums truncate">
              {router.gatewayIp} · {router.wanDownloadMbps} Mbps
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRouterModalOpen(true)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            تبديل / إعدادات الراوتر
          </button>
          <button
            type="button"
            onClick={() => setAndroidModalOpen(true)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-950 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>{isInstalled ? 'تطبيق الأندرويد (مثبت)' : 'تطبيق أندرويد / APK'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RouterIcon className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
                  RouterCraft
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="text-xs font-mono tabular-nums">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setRouterModalOpen(true);
                }}
                className="w-full min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                تبديل / إعدادات الراوتر
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAndroidModalOpen(true);
                }}
                className="w-full min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>تثبيت تطبيق أندرويد / APK</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pr-64 flex flex-col min-w-0">
        {/* Clean Top Header */}
        <header className="h-14 lg:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="فتح القائمة"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                {router.name}
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {tabTitles[activeTab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isInstalled && (
              <button
                type="button"
                onClick={() => setAndroidModalOpen(true)}
                className="min-h-[40px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-950 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {canInstall ? 'تثبيت للأندرويد' : 'تطبيق أندرويد'}
                </span>
                <span className="sm:hidden">APK</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              aria-label="إشعارات الشبكة"
              className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono tabular-nums flex items-center justify-center">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{cloudLoading ? 'جارٍ المزامنة...' : 'متصل بالسحابة'}</span>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="min-h-[40px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="min-h-[40px] px-2.5 sm:px-3.5 py-1.5 text-xs font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
              >
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مزامنة سحابية</span>
              </button>
            )}
          </div>
        </header>

        {!isOnline && (
          <div className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>أنت الآن في وضع عدم الاتصال (Offline) — يعمل التطبيق من الذاكرة المحلية وسيتم مزامنة التغييرات عند عودة الإنترنت.</span>
          </div>
        )}

        {authError && (
          <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
            <span>{authError}</span>
            <button type="button" onClick={() => setAuthError(null)} className="underline">
              إغلاق
            </button>
          </div>
        )}

        {/* Active Section Viewport */}
        <main className="flex-1 p-4 pb-20 sm:p-6 lg:pb-6 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewSection
              router={router}
              devices={devices}
              subscribers={subscribers}
              alerts={alerts}
              history={history}
              liveTrafficEnabled={liveTrafficEnabled}
              onToggleLiveTraffic={() => setLiveTrafficEnabled((v) => !v)}
              onSimulateNewDevice={handleSimulateNewDevice}
              onOpenRouterModal={() => setRouterModalOpen(true)}
              onNavigateTab={(t) => setActiveTab(t)}
              onToggleBlockDevice={handleToggleBlockDevice}
              onTrustDevice={handleTrustDevice}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesSection
              devices={devices}
              subscribers={subscribers}
              maxWanDownMbps={router.wanDownloadMbps}
              maxWanUpMbps={router.wanUploadMbps}
              onToggleBlock={handleToggleBlockDevice}
              onTrustDevice={handleTrustDevice}
              onUpdateDevicePolicy={handleUpdateDevicePolicy}
              onAddManualMacBlock={handleAddManualMacBlock}
              onDeleteDevice={handleDeleteDevice}
              onSimulateNewDevice={handleSimulateNewDevice}
              onInspectDomains={(dev) => {
                setSelectedDomainDeviceFilter(dev.id);
                setActiveTab('parental');
              }}
            />
          )}

          {activeTab === 'subscribers' && (
            <SubscribersSection
              router={router}
              subscribers={subscribers}
              devices={devices}
              onCreateSubscriber={handleCreateSubscriber}
              onUpdateSubscriber={handleUpdateSubscriber}
              onDeleteSubscriber={handleDeleteSubscriber}
              onAutoBalance={handleAutoBalanceSubscribers}
            />
          )}

          {activeTab === 'parental' && (
            <ParentalControlSection
              devices={devices}
              subscribers={subscribers}
              parentalRules={parentalRules}
              domainLogs={domainLogs}
              selectedDeviceFilter={selectedDomainDeviceFilter}
              onSelectDeviceFilter={setSelectedDomainDeviceFilter}
              onSaveParentalRule={handleSaveParentalRule}
              onCreateParentalRule={handleCreateParentalRule}
              onDeleteParentalRule={handleDeleteParentalRule}
              onBlockDomain={handleBlockDomain}
              onUnblockDomain={handleUnblockDomain}
              onSimulateDomainCheck={handleSimulateDomainCheck}
            />
          )}

          {activeTab === 'wifi' && (
            <WifiControlSection
              router={router}
              onSaveWifiSettings={handleSaveWifiSettings}
              onSaveNetworkRouting={handleSaveNetworkRouting}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsSection
              alerts={alerts}
              devices={devices}
              soundAlerts={soundAlerts}
              newDeviceAlert={router.newDeviceAlert}
              autoBlockUnknown={router.autoBlockUnknown}
              onToggleSound={handleToggleSound}
              onToggleNewDeviceAlert={() =>
                handleQuickRouterToggle('newDeviceAlert', !router.newDeviceAlert)
              }
              onToggleAutoBlock={() =>
                handleQuickRouterToggle('autoBlockUnknown', !router.autoBlockUnknown)
              }
              onMarkRead={handleMarkAlertRead}
              onMarkAllRead={handleMarkAllAlertsRead}
              onDeleteAlert={handleDeleteAlert}
              onBlockFromAlert={(alert) => {
                const d = devices.find((x) => x.id === alert.deviceId);
                if (d) handleToggleBlockDevice(d);
              }}
              onTrustFromAlert={(alert) => {
                const d = devices.find((x) => x.id === alert.deviceId);
                if (d) handleTrustDevice(d);
              }}
              onSimulateNewDevice={handleSimulateNewDevice}
            />
          )}
        </main>
      </div>

      {/* Mobile Android Bottom Navigation Bar (Natural Thumb Zone) */}
      <nav
        aria-label="التنقل السريع"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        {(
          [
            { id: 'overview', label: 'الرئيسية', icon: LayoutDashboard },
            { id: 'devices', label: 'الأجهزة', icon: Wifi },
            { id: 'subscribers', label: 'المشتركين', icon: Users },
            { id: 'parental', label: 'الرقابة', icon: ShieldCheck },
            { id: 'wifi', label: 'الواي فاي', icon: Radio },
          ] as { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[]
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[10px] tracking-tight whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Router Gateway Settings Modal */}
      {routerModalOpen && (
        <RouterGatewayModal
          router={router}
          onClose={() => setRouterModalOpen(false)}
          onSave={handleSaveRouterGateway}
          onResetMonthlyQuota={handleResetMonthlyQuota}
        />
      )}

      {/* Android App / PWA Install & APK Guide Modal */}
      {androidModalOpen && (
        <AndroidAppModal
          onClose={() => setAndroidModalOpen(false)}
          canInstall={canInstall}
          isInstalled={isInstalled}
          isAndroid={isAndroid}
          isIOS={isIOS}
          onTriggerInstall={triggerInstall}
        />
      )}

      {/* Real-time Toast Notification with Direct Action for New Devices */}
      {toast && (
        <div className="fixed bottom-16 lg:bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-lg space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {toast.tone === 'critical' ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : toast.tone === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Bell className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {toast.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {toastDevice && !toastDevice.blocked && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleTrustDevice(toastDevice);
                  setToast(null);
                }}
                className="px-3 py-1 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                اعتماد الجهاز
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleBlockDevice(toastDevice);
                  setToast(null);
                }}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                حظر فوري
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
