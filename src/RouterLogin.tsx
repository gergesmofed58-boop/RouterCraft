import React, { useState } from 'react';
import { connectToRouter } from './services/routerService';
import { RouterLiveInfo } from './services/routerTypes';

interface RouterLoginProps {
  onLogin: (routerInfo: RouterLiveInfo) => void;
}

export default function RouterLogin({ onLogin }: RouterLoginProps) {
  const [ip, setIp] = useState('192.168.1.1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await connectToRouter({
      ip,
      username,
      password,
    });

    setLoading(false);

    if (result.ok && result.info) {
      onLogin(result.info);
      return;
    }

    setError(result.message);
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
