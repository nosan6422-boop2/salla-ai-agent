import React, { useState, useEffect } from 'react';

// دالة مساعدة للتعامل مع النتائج (سواء كانت مصفوفة أو نص)
const formatList = (list) => {
  if (Array.isArray(list)) return list.join(' ');
  return list || '';
};

export default function App() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('store_demo_1');
  const [productName, setProductName] = useState('عطر العود الملكي');
  const [platform, setPlatform] = useState('Instagram');
  
  const [activeTab, setActiveTab] = useState('marketing');
  const [campaign, setCampaign] = useState(null);
  const [seoResult, setSeoResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => {
        if (data.tenants) setTenants(data.tenants);
      })
      .catch(err => console.error(err));
  }, []);

  // ✅ التعديل الوحيد هنا: نوجه المستخدم لتثبيت التطبيق من متجر التطبيقات
  const handleConnectStore = () => {
    window.location.href = 'https://apps.salla.sa/';
  };

  const handleGenerateMarketing = async () => {
    setLoading(true);
    setCampaign(null);
    try {
      const res = await fetch('/api/ai/generate-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant
        },
        body: JSON.stringify({ productName, platform })
      });
      const data = await res.json();
      if (data.success) setCampaign(data.campaign);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSEO = async () => {
    setLoading(true);
    setSeoResult(null);
    try {
      const res = await fetch('/api/seo/optimize-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant
        },
        body: JSON.stringify({ productName, category: 'عطور' })
      });
      const data = await res.json();
      if (data.success) setSeoResult(data.seo);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Tajawal, sans-serif', backgroundColor: '#f4f7f6' }}>
      <div style={{ width: '260px', backgroundColor: '#111827', color: '#fff', padding: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '30px' }}>🤖 وكيل سلة</div>
        <button style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '10px', background: activeTab === 'marketing' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'right', fontSize: '16px' }} onClick={() => setActiveTab('marketing')}>📈 التسويق</button>
        <button style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '10px', background: activeTab === 'seo' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'right', fontSize: '16px' }} onClick={() => setActiveTab('seo')}>🔍 السيو (SEO)</button>
      </div>

      <div style={{ flex: 1, padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: '0' }}>لوحة تحكم الوكيل</h1>
          <button onClick={handleConnectStore} style={{ background: '#059669', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>🔗 ربط متجري</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}><h3 style={{ margin: '0 0 10px 0', color: '#6b7280', fontSize: '14px' }}>المتاجر المرتبطة</h3><p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{tenants.length}</p></div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}><h3 style={{ margin: '0 0 10px 0', color: '#6b7280', fontSize: '14px' }}>حملات تم إنشاؤها</h3><p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>24</p></div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}><h3 style={{ margin: '0 0 10px 0', color: '#6b7280', fontSize: '14px' }}>تحسينات SEO</h3><p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>15</p></div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>اختر المتجر المشترك:</label>
          <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '16px', fontSize: '14px', boxSizing: 'border-box' }}>
            {tenants.length === 0 && <option value="">لا توجد متاجر</option>}
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.storeName} ({t.sallaStoreId})</option>
            ))}
          </select>

          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>اسم المنتج:</label>
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '16px', fontSize: '14px' }} placeholder="مثال: عطر العود الملكي" />

          {activeTab === 'marketing' && (
            <>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>المنصة الإعلانية:</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '16px', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="Instagram">إنستغرام</option>
                <option value="TikTok">تيك توك</option>
                <option value="Snapchat">سناب شات</option>
              </select>
              <button onClick={handleGenerateMarketing} disabled={loading} style={{ background: '#059669', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'جاري التوليد...' : 'توليد الحملة التسويقية'}
              </button>
            </>
          )}

          {activeTab === 'seo' && (
            <button onClick={handleGenerateSEO} disabled={loading} style={{ background: '#2563eb', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'جاري التحسين...' : 'توليد بيانات SEO'}
            </button>
          )}
        </div>

        {activeTab === 'marketing' && campaign && (
          <div style={{ background: '#ecfdf5', padding: '24px', borderRadius: '10px', border: '1px solid #a7f3d0', position: 'relative' }}>
            <button onClick={() => handleCopy(JSON.stringify(campaign, null, 2), 'campaign')} style={{ position: 'absolute', top: '10px', left: '10px', background: '#059669', color: '#fff', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>{copied === 'campaign' ? 'تم النسخ!' : 'نسخ'}</button>
            <h2 style={{ color: '#065f46' }}>{campaign.headline}</h2>
            <p><strong>Hook:</strong> {campaign.hook}</p>
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px' }}><strong>Caption:</strong><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{campaign.caption}</pre></div>
            <p><strong>الهاشتاقات:</strong> {formatList(campaign.hashtags)}</p>
            <p><strong>CTA:</strong> {campaign.callToAction}</p>
          </div>
        )}

        {activeTab === 'seo' && seoResult && (
          <div style={{ background: '#eff6ff', padding: '24px', borderRadius: '10px', border: '1px solid #bfdbfe', position: 'relative' }}>
            <button onClick={() => handleCopy(JSON.stringify(seoResult, null, 2), 'seo')} style={{ position: 'absolute', top: '10px', left: '10px', background: '#2563eb', color: '#fff', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>{copied === 'seo' ? 'تم النسخ!' : 'نسخ'}</button>
            <h2 style={{ color: '#1e3a8a' }}>نتيجة SEO</h2>
            <p><strong>Slug:</strong> {seoResult.slug}</p>
            <p><strong>Meta Title:</strong> {seoResult.metaTitle}</p>
            <p><strong>Meta Description:</strong> {seoResult.metaDescription}</p>
            <p><strong>Keywords:</strong> {formatList(seoResult.keywords)}</p>
            <p><strong>Score:</strong> {seoResult.seoScore}/100</p>
          </div>
        )}
      </div>
    </div>
  );
}