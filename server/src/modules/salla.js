import 'dotenv/config';

// ذاكرة مؤقتة لحفظ التوكنات
const storeTokens = new Map();

export const sallaClient = {
  // 📥 استقبال التوكن من سلة عبر الويب هوك (الوضع السهل)
  handleWebhook(data) {
    // البيانات تصل داخل الحقل data
    const eventData = data.data || {};
    const storeId = eventData.store?.id || 'store_' + Date.now();
    const accessToken = eventData.access_token;

    if (accessToken) {
      storeTokens.set(storeId, accessToken);
      console.log(`✅ تم استلام توكن المتجر (${storeId}) بنجاح من سلة!`);
      return { success: true, storeId };
    }
    return { success: false, error: 'لم يتم استلام توكن صالح' };
  },

  // 🛍️ جلب المنتجات الحقيقية
  async getProducts(tenant) {
    const accessToken = tenant.sallaAccessToken || storeTokens.get(tenant.id);

    if (accessToken && !accessToken.startsWith('demo_')) {
      const response = await fetch('https://api.salla.dev/admin/v2/products', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      } else {
        console.error('❌ خطأ في جلب منتجات سلة:', response.statusText);
        return [];
      }
    }

    console.warn('⚠️ لم يتم ربط المتجر بعد، سيتم عرض بيانات تجريبية.');
    return [
      { id: 101, name: 'منتج تجريبي (يجب ربط المتجر لعرض منتجاتك الحقيقية)', price: 0, category: 'قسم تجريبي', quantity: 0 }
    ];
  }
};