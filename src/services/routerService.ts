import {
  RouterAuthResult,
  RouterCredentials,
  RouterLiveInfo,
} from './routerTypes';

const DEFAULT_TIMEOUT_MS = 5000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function normalizeRouterIp(rawIp: string): string {
  return rawIp
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

function detectVendorFromText(text: string): string | undefined {
  const normalized = text.toLowerCase();
  if (normalized.includes('huawei')) return 'Huawei';
  if (normalized.includes('zte')) return 'ZTE';
  if (normalized.includes('tp-link') || normalized.includes('tplink')) return 'TP-Link';
  if (normalized.includes('d-link') || normalized.includes('dlink')) return 'D-Link';
  if (normalized.includes('luci') || normalized.includes('openwrt')) return 'OpenWrt / LuCI';
  if (normalized.includes('asus')) return 'ASUS';
  if (normalized.includes('netgear')) return 'Netgear';
  return undefined;
}

async function isRouterHostReachable(baseUrl: string): Promise<boolean> {
  try {
    await fetchWithTimeout(`${baseUrl}/`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
    });
    return true;
  } catch {
    return false;
  }
}

export async function connectToRouter(
  credentials: RouterCredentials
): Promise<RouterAuthResult> {
  const cleanIp = normalizeRouterIp(credentials.ip);
  const cleanUser = credentials.username.trim() || 'admin';
  const password = credentials.password;

  if (!cleanIp) {
    return {
      ok: false,
      state: 'unreachable',
      message: 'يرجى إدخال عنوان IP صحيح للراوتر.',
    };
  }

  const baseUrl = `http://${cleanIp}`;

  // 1. التحقق الفعلي من إمكانية الوصول إلى الراوتر على الشبكة المحلية
  const reachable = await isRouterHostReachable(baseUrl);
  if (!reachable) {
    return {
      ok: false,
      state: 'unreachable',
      message: `تعذر الوصول إلى ${cleanIp}. تأكد أنك متصل بشبكة الراوتر المحلية وأن عنوان IP صحيح.`,
    };
  }

  const basicToken = btoa(`${cleanUser}:${password}`);
  let sawExplicitAuthRejection = false;
  let lastStatus: number | undefined;
  let detectedVendor: string | undefined;

  // 2. المشغّل الأول: Basic Auth / REST JSON
  const restAndBasicEndpoints: Array<{ url: string; init: RequestInit }> = [
    {
      url: `${baseUrl}/api/login`,
      init: {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUser, password }),
        credentials: 'include',
        cache: 'no-store',
      },
    },
    {
      url: `${baseUrl}/`,
      init: {
        method: 'GET',
        headers: {
          Authorization: `Basic ${basicToken}`,
        },
        credentials: 'include',
        cache: 'no-store',
      },
    },
  ];

  for (const attempt of restAndBasicEndpoints) {
    try {
      const response = await fetchWithTimeout(attempt.url, attempt.init);
      lastStatus = response.status;

      const textPreview = await response.text().catch(() => '');
      if (!detectedVendor && textPreview) {
        detectedVendor = detectVendorFromText(textPreview);
      }

      if (response.status === 401 || response.status === 403) {
        sawExplicitAuthRejection = true;
        continue;
      }

      if (response.ok) {
        const info: RouterLiveInfo = {
          ip: cleanIp,
          username: cleanUser,
          endpointUsed: attempt.url,
          driverName: 'Basic / REST Driver',
          detectedVendorOrModel: detectedVendor,
          responseStatus: response.status,
          responseSnippet: textPreview.slice(0, 200) || undefined,
        };

        return {
          ok: true,
          state: 'connected',
          message: 'تم الاتصال والتحقق من استجابة الراوتر بنجاح.',
          info,
        };
      }
    } catch {
      // قد يفشل مسار معين أو يتأثر بقيود الشبكة/المتصفح فننتقل للمشغّل التالي
    }
  }

  // 3. المشغّل الثاني: Form / Session Login
  const formBody = new URLSearchParams({
    username: cleanUser,
    user: cleanUser,
    password,
    pwd: password,
  }).toString();

  const formEndpoints = [
    `${baseUrl}/login`,
    `${baseUrl}/cgi-bin/luci`,
  ];

  for (const endpoint of formEndpoints) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
        credentials: 'include',
        cache: 'no-store',
      });

      lastStatus = response.status;
      const textPreview = await response.text().catch(() => '');
      if (!detectedVendor && textPreview) {
        detectedVendor = detectVendorFromText(textPreview);
      }

      if (response.status === 401 || response.status === 403) {
        sawExplicitAuthRejection = true;
        continue;
      }

      if (response.ok) {
        const info: RouterLiveInfo = {
          ip: cleanIp,
          username: cleanUser,
          endpointUsed: endpoint,
          driverName: 'Form / Session Driver',
          detectedVendorOrModel: detectedVendor,
          responseStatus: response.status,
          responseSnippet: textPreview.slice(0, 200) || undefined,
        };

        return {
          ok: true,
          state: 'connected',
          message: 'تم الاتصال بالراوتر عبر نموذج الدخول بنجاح.',
          info,
        };
      }
    } catch {
      // نكمل المحاولات المتاحة
    }
  }

  if (sawExplicitAuthRejection) {
    return {
      ok: false,
      state: 'auth_failed',
      message: 'بيانات دخول الراوتر (اسم المستخدم أو كلمة المرور) غير صحيحة.',
    };
  }

  return {
    ok: false,
    state: 'unsupported_auth',
    message:
      'تم الوصول إلى الراوتر على الشبكة، لكن آلية الدخول في هذا الموديل تتطلب مشغلاً مخصصاً أو فحص طلب الدخول الفعلي.',
    info: {
      ip: cleanIp,
      username: cleanUser,
      endpointUsed: baseUrl,
      driverName: 'Auto-Probe',
      detectedVendorOrModel: detectedVendor,
      responseStatus: lastStatus,
    },
  };
}
