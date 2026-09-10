import React, { useEffect, useState } from 'react';
import App from './App.jsx';

export default function EmbeddedDashboard() {
  const [status, setStatus] = useState('loading');
  const [store, setStore] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let sdk = null;

    async function bootstrap() {
      try {
        console.log('🚀 بدء تهيئة Embedded SDK...');

        // 1. استيراد SDK
        const sdkModule = await import('@salla.sa/embedded-sdk');
        sdk = sdkModule.embedded || sdkModule.default;

        if (!sdk) {
          throw new Error('SDK غير متاح');
        }

        console.log('✅ تم تحميل SDK:', Object.keys(sdk));

        // 2. تهيئة SDK
        if (typeof sdk.init === 'function') {
          await sdk.init();
          console.log('✅ تم init() بنجاح');
        }

        // 3. الحصول على التوكن
        let token = null;

        if (sdk.auth && typeof sdk.auth.getToken === 'function') {
          token = sdk.auth.getToken();
        } else if (typeof sdk.getToken === 'function') {
          token = sdk.getToken();
        }

        // fallback: قراءة من URL
        if (!token) {
          const urlParams = new URLSearchParams(window.location.search);
          token = urlParams.get('token');
        }

        if (!token) {
          throw new Error('لم يتم العثور على Embedded Token. تأكد من فتح الصفحة من داخل Salla.');
        }

        console.log('✅ تم الحصول على Token');

        // 4. إرسال التوكن إلى Backend للتحقق
        const response = await fetch('/api/embedded/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'فشل التحقق من التوكن');
        }

        console.log('✅ تم التحقق:', result);
        setStore(result);
        setStatus('success');

        // 5. إعلام Salla أن التطبيق جاهز
        if (typeof sdk.ready === 'function') {
          sdk.ready();
        }

        if (sdk.page && typeof sdk.page.setTitle === 'function') {
          sdk.page.setTitle('وكيل سلة');
        }

      } catch (error) {
        console.error('❌ Embedded auth error:', error);
        setErrorMessage(error.message);
        setStatus('error');
      }
    }

    bootstrap();
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Tajawal, sans-serif',
        fontSize: '18px',
        color: '#374151',
        background: '#f4f7f6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
        <div>جاري الاتصال بـ Salla...</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Tajawal, sans-serif',
        padding: '20px',
        textAlign: 'center',
        background: '#f4f7f6'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>خطأ في التحميل</h2>
        <p style={{ color: '#6b7280', marginBottom: '20px', maxWidth: '500px' }}>
          {errorMessage}
        </p>
        <p style={{ color: '#9ca3af', fontSize: '13px' }}>
          تأكد من فتح الصفحة من داخل لوحة تحكم Salla.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: '#059669',
        color: '#fff',
        padding: '10px 20px',
        textAlign: 'center',
        fontFamily: 'Tajawal, sans-serif',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        ✅ متصل: {store?.storeName} (#{store?.sallaStoreId})
      </div>
      <App />
    </div>
  );
}