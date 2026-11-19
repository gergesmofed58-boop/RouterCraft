import React, { useState } from 'react';
import RouterLogin, { RouterAuthData } from './RouterLogin';

export default function App() {
  const [routerAuth, setRouterAuth] = useState<RouterAuthData | null>(null);

  if (!routerAuth) {
    return <RouterLogin onLogin={(authData) => setRouterAuth(authData)} />;
  }

  return (
    <div
      style={{
        padding: '20px',
        color: '#fff',
        background: '#121212',
        minHeight: '100vh',
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      <h1>مرحباً بك في لوحة تحكم RouterCraft</h1>
      <p>
        تم الاتصال بنجاح بالراوتر على الإيبي: <strong>{routerAuth.ip}</strong>
      </p>
      <p>
        المستخدم: <strong>{routerAuth.username}</strong>
      </p>
      {routerAuth.endpointUsed && (
        <p style={{ fontSize: '13px', color: '#aaa' }}>
          مسار الاتصال الفعلي: <code>{routerAuth.endpointUsed}</code>
        </p>
      )}

      <button
        onClick={() => setRouterAuth(null)}
        style={{
          marginTop: '16px',
          padding: '10px 18px',
          background: '#333',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        تسجيل خروج / تغيير الراوتر
      </button>
    </div>
  );
}
