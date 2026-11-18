import React, { useState } from 'react';
import RouterLogin from './RouterLogin';

export default function App() {
  const [routerAuth, setRouterAuth] = useState<{ ip: string; password: string } | null>(null);

  if (!routerAuth) {
    return <RouterLogin onLogin={(authData) => setRouterAuth(authData)} />;
  }

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#121212', minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }}>
      <h1>مرحباً بك في لوحة تحكم RouterCraft</h1>
      <p>تم الاتصال بنجاح بالراوتر على الإيبي: <strong>{routerAuth.ip}</strong></p>
    </div>
  );
}
