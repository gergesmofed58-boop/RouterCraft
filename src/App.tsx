import React, { useState } from 'react';
import RouterLogin from './RouterLogin';
import { RouterLiveInfo } from './services/routerTypes';

export default function App() {
  const [routerInfo, setRouterInfo] = useState<RouterLiveInfo | null>(null);

  if (!routerInfo) {
    return <RouterLogin onLogin={(info) => setRouterInfo(info)} />;
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
      <h1>لوحة تحكم RouterCraft (بيانات حقيقية)</h1>
      <p>
        عنوان الراوتر (IP): <strong>{routerInfo.ip}</strong>
      </p>
      <p>
        المستخدم: <strong>{routerInfo.username}</strong>
      </p>
      <p>
        المشغّل المستخدم: <strong>{routerInfo.driverName}</strong>
      </p>
      {routerInfo.detectedVendorOrModel && (
        <p>
          الشركة / الموديل المكتشف: <strong>{routerInfo.detectedVendorOrModel}</strong>
        </p>
      )}
      <p style={{ fontSize: '13px', color: '#aaa' }}>
        مسار الاتصال الفعلي: <code>{routerInfo.endpointUsed}</code>
      </p>
      {routerInfo.responseSnippet && (
        <pre
          style={{
            marginTop: '14px',
            padding: '12px',
            background: '#1e1e1e',
            borderRadius: '6px',
            overflowX: 'auto',
            fontSize: '12px',
            color: '#ccc',
          }}
        >
          {routerInfo.responseSnippet}
        </pre>
      )}

      <button
        onClick={() => setRouterInfo(null)}
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
