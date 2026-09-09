import 'dotenv/config';

const storeTokens = new Map();

export const sallaClient = {
  // 📥 استقبال التوكن من سلة
  handleWebhook(data) {
    const eventData = data.data || {};
    const storeId = eventData.merchant || data.merchant || 'store_' + Date.now();
    const accessToken = eventData.access_token;

    if (accessToken) {
      storeTokens.set(storeId, accessToken);
      return { success: true, storeId, accessToken };
    }
    return { success: false, error: 'لم يتم استلام توكن صالح' };
  },

  // 🆕 جلب معلومات المتجر (الاسم) من سلة باستخدام التوكن
  async getStoreInfo(accessToken) {
    try {
      const response = await fetch('https://api.salla.dev/admin/v2/store/information', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.data || {}; // سيحتوي على name, id, إلخ
      }
    } catch (error) {
      console.error('❌ خطأ في جلب معلومات المتجر:', error.message);
    }
    return {};
  },

  // 🛍️ جلب المنتجات
  async getProducts(tenant) {
    const accessToken = tenant.sallaAccessToken || storeTokens.get(tenant.id);
    if (accessToken && !accessToken.startsWith('demo_')) {
      const response = await fetch('https://api.salla.dev/admin/v2/products', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    }
    return [{ id: 101, name: 'منتج تجريبي', price: 0, category: 'تجريبي', quantity: 0 }];
  }
};