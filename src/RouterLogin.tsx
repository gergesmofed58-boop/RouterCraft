import React, { useState } from 'react';

export interface RouterAuthData {
  ip: string;
  username: string;
  password: string;
  endpointUsed?: string;
}

interface RouterLoginProps {
  onLogin: (authData: RouterAuthData) => void;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function RouterLogin({ onLogin }: RouterLoginProps) {
  const [ip, setIp] = useState('192.168.1.1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIp = ip.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const cleanUser = username.trim() || 'admin';

    if (!cleanIp) {
      setError('يرجى إدخال عنوان IP صحيح للراوتر.');
      return;
    }

    setLoading(true);
    setError('');

    const baseUrl = `http://${cleanIp}`;
    const basicToken = btoa(`${cleanUser}:${password}`);

    // 1. التحقق أولاً أن الراوتر قابل للوصول على الشبكة المحلية
    try {
      await fetchWithTimeout(`${baseUrl}/`, {
        method: 'GET',
        mode: 'no-cors',
      });
    } catch {
      setError(
        `تعذر الوصول إلى ${cleanIp}. تأكد أنك متصل بشبكة Wi-Fi الخاصة بالراوتر وأن عنوان IP صحيح.`
      );
      setLoading(false);
      return;
    }

    // 2. محاولة المصادقة عبر مسارات شائعة
    const loginAttempts: Array<{ url: string; init: RequestInit }> = [
      {
        url: `${baseUrl}/api/login`,
        init: {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: cleanUser, password }),
        },
      },
      {
        url: `${baseUrl}/`,
        init: {
          method: 'GET',
          headers: {
            Authorization: `Basic ${basicToken}`,
          },
        },
      },
    ];

    let anyReachableAuthResponse = false;

    for (const attempt of loginAttempts) {
      try {
        const res = await fetchWithTimeout(attempt.url, attempt.init);
        anyReachableAuthResponse = true;

        if (res.ok && res.status !== 401 && res.status !== 403) {
          onLogin({
            ip: cleanIp,
            username: cleanUser,
            password,
            endpointUsed: attempt.url,
          });
          setLoading(false);
          return;
        }
      } catch {
        // قد تفشل بعض المسارات بسبب اختلاف بنية الراوتر أو CORS في المتصفح
      }
    }

    if (anyReachableAuthResponse) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة أو الراوتر يطلب طريقة مصادقة خاصة به.');
    } else {
      setError(
        'تم العثور على الراوتر، لكن واجهة الدخول لهذا الموديل تتطلب مشغلاً (Driver) مخصصاً أو فحص طلب الدخول الحقيقي.'
      );
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '50px auto',
        padding: '20px',
        background: '#1e1e1e',
        color: '#fff',
        borderRadius: '8px',
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>تسجيل دخول الراوتر</h2>
      <form onSubmit={handleConnect}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>عنوان الـ IP للراوتر:</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #444',
              background: '#2a2a2a',
              color: '#fff',
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>اسم المستخدم (Username):</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #444',
              background: '#2a2a2a',
              color: '#fff',
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>كلمة مرور صفحة الراوتر:</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="الباسورد المدون خلف الراوتر"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #444',
              background: '#2a2a2a',
              color: '#fff',
            }}
            required
          />
        </div>

        {error && (
          <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '15px' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'جاري التحقق والاتصال...' : 'دخول وسحب البيانات الحقيقية'}
        </button>
      </form>
    </div>
  );
}
