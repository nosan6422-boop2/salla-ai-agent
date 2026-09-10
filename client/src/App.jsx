import React, { useState, useEffect } from 'react';

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
  const [storeAnalysis, setStoreAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  
  const [applyingProductId, setApplyingProductId] = useState(null);
  const [appliedProducts, setAppliedProducts] = useState({});

  useEffect(() => {
    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => {
        if (data.tenants) setTenants(data.tenants);
      })
      .catch(err => console.error(err));
  }, []);

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

  const handleAnalyzeStore = async () => {
    setLoading(true);
    setStoreAnalysis(null);
    setAppliedProducts({});
    try {
      const res = await fetch('/api/analyze-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant
        }
      });
      const data = await res.json();
      if (data.success) {
        setStoreAnalysis({ ...data.analysis, productsCount: data.productsCount });
      } else {
        setStoreAnalysis({ error: true, message: data.error });
      }
    } catch (err) {
      console.error(err);
      setStoreAnalysis({ error: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ⭐ التعديل 1: إرسال الوصف الطويل أيضاً
  const handleApplyImprovement = async (product) => {
    if (!product.productId) {
      alert('معرّف المنتج غير موجود. يرجى إعادة التحليل.');
      return;
    }

    if (!window.confirm(`هل تريد تطبيق التحسينات على المنتج "${product.name}"؟\n\nسيتم تعديل المنتج فعلياً في متجرك.`)) {
      return;
    }

    setApplyingProductId(product.productId);

    try {
      const res = await fetch('/api/apply-seo-improvement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant
        },
        body: JSON.stringify({
          productId: product.productId,
          suggestedTitle: product.suggestedTitle,
          suggestedDescription: product.suggestedDescription,
          suggestedLongDescription: product.suggestedLongDescription
        })
      });

      const data = await res.json();

      if (data.success) {
        setAppliedProducts(prev => ({
          ...prev,
          [product.productId]: { success: true }
        }));
      } else {
        setAppliedProducts(prev => ({
          ...prev,
          [product.productId]: { success: false, error: data.error }
        }));
      }
    } catch (err) {
      setAppliedProducts(prev => ({
        ...prev,
        [product.productId]: { success: false, error: err.message }
      }));
    } finally {
      setApplyingProductId(null);
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
        <button style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '10px', background: activeTab === 'analyze' ? '#059669' : 'transparent', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'right', fontSize: '16px' }} onClick={() => setActiveTab('analyze')}>🧠 تحليل المتجر</button>
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
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>اختر المتجر:</label>
          <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '16px', fontSize: '14px', boxSizing: 'border-box' }}>
            {tenants.length === 0 && <option value="">لا توجد متاجر</option>}
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.storeName} ({t.sallaStoreId})</option>
            ))}
          </select>

          {(activeTab === 'marketing' || activeTab === 'seo') && (
            <>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>اسم المنتج:</label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box', marginBottom: '16px', fontSize: '14px' }} placeholder="مثال: عطر العود الملكي" />
            </>
          )}

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

          {activeTab === 'analyze' && (
            <>
              <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                🧠 سيقوم الوكيل بجلب منتجات متجرك الحقيقية من سلة وتحليلها بالذكاء الاصطناعي لاقتراح تحسينات SEO.
              </p>
              <button onClick={handleAnalyzeStore} disabled={loading} style={{ background: '#7c3aed', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'جاري التحليل...' : '🚀 ابدأ تحليل المتجر'}
              </button>
            </>
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

        {activeTab === 'analyze' && storeAnalysis && (
          <>
            {storeAnalysis.error ? (
              <div style={{ background: '#fee2e2', padding: '24px', borderRadius: '10px', border: '1px solid #fecaca' }}>
                <h3 style={{ color: '#991b1b', marginTop: 0 }}>حدث خطأ في التحليل</h3>
                <p style={{ color: '#7f1d1d' }}>{storeAnalysis.message}</p>
              </div>
            ) : (
              <div style={{ background: '#f5f3ff', padding: '24px', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ color: '#5b21b6', margin: 0 }}>🧠 تقرير تحليل المتجر</h2>
                  <div style={{ background: '#7c3aed', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>
                    درجة السيو العامة: {storeAnalysis.overallScore}/100
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <strong>📋 ملخص:</strong>
                  <p style={{ marginTop: '8px', color: '#4b5563' }}>{storeAnalysis.summary}</p>
                  <p style={{ marginTop: '8px', color: '#6b7280', fontSize: '13px' }}>عدد المنتجات في المتجر: {storeAnalysis.productsCount}</p>
                </div>

                {storeAnalysis.topPriorities && (
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <strong>🎯 أهم الأولويات:</strong>
                    <ul style={{ marginTop: '8px', paddingRight: '20px' }}>
                      {storeAnalysis.topPriorities.map((p, i) => (
                        <li key={i} style={{ marginBottom: '5px', color: '#4b5563' }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <h3 style={{ color: '#5b21b6', marginBottom: '15px' }}>📦 تحليل المنتجات:</h3>
                {storeAnalysis.products?.map((p, i) => {
                  const applied = p.productId ? appliedProducts[p.productId] : null;
                  const isApplying = applyingProductId === p.productId;

                  return (
                    <div key={i} style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ color: '#1f2937' }}>📌 {p.name}</strong>
                        <span style={{ background: p.improvementScore >= 70 ? '#10b981' : p.improvementScore >= 40 ? '#f59e0b' : '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                          {p.improvementScore}/100
                        </span>
                      </div>

                      {p.currentIssues && p.currentIssues.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong style={{ color: '#dc2626', fontSize: '13px' }}>⚠️ مشاكل حالية:</strong>
                          <ul style={{ marginTop: '5px', paddingRight: '20px' }}>
                            {p.currentIssues.map((issue, j) => (
                              <li key={j} style={{ color: '#7f1d1d', fontSize: '13px' }}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
                        <strong style={{ color: '#065f46', fontSize: '13px' }}>✨ عنوان SEO مقترح:</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#1f2937' }}>{p.suggestedTitle}</p>
                      </div>

                      <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
                        <strong style={{ color: '#1e40af', fontSize: '13px' }}>📝 وصف Meta مقترح:</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#1f2937' }}>{p.suggestedDescription}</p>
                      </div>

                      {/* ⭐ التعديل 2: عرض الوصف الطويل المقترح */}
                      {p.suggestedLongDescription && (
                        <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                          <strong style={{ color: '#92400e', fontSize: '13px' }}>📄 الوصف الطويل المقترح:</strong>
                          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#1f2937', whiteSpace: 'pre-wrap' }}>{p.suggestedLongDescription}</p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleApplyImprovement(p)}
                          disabled={isApplying || (applied && applied.success)}
                          style={{
                            background: applied?.success ? '#10b981' : '#7c3aed',
                            color: '#fff',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: (isApplying || (applied && applied.success)) ? 'default' : 'pointer',
                            fontSize: '13px',
                            opacity: isApplying ? 0.7 : 1
                          }}
                        >
                          {isApplying 
                            ? '⏳ جاري التطبيق...' 
                            : applied?.success 
                              ? '✅ تم التطبيق على متجرك' 
                              : '🚀 تطبيق كل التحسينات على متجرك'}
                        </button>

                        {applied?.success === false && (
                          <span style={{ color: '#dc2626', fontSize: '12px' }}>
                            ❌ فشل: {applied.error}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}