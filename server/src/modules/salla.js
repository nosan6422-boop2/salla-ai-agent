import 'dotenv/config';

// ذاكرة مؤقتة لحفظ التوكنات (في الوضع السهل، سلة ترسل التوكن هنا)
const storeTokens = new Map();

export const sallaClient = {
  // 📥 استقبال التوكن من سلة عبر الويب هوك (الوضع السهل)
  handleWebhook(data) {
    const storeId = data.store?.id || 'store_' + Date.now();
    const accessToken = data.access_token;

    if (accessToken) {
      storeTokens.set(storeId, accessToken);
      console.log(`✅ تم استلام توكن المتجر (${storeId}) بنجاح من سلة!`);
      return { success: true, storeId };
    }
    return { success: false, error: 'لم يتم استلام توكن صالح' };
  },

  // 🛍️ جلب المنتجات الحقيقية (باستخدام التوكن المستلم)
  async getProducts(tenant) {
    // نبحث عن التوكن إما في قاعدة البيانات أو في الذاكرة
    const accessToken = tenant.sallaAccessToken || storeTokens.get(tenant.id);

    if (accessToken && !accessToken.startsWith('demo_')) {
      // نستخدم fetch المدمج (لا حاجة لـ axios هنا)
      const response = await fetch('https://api.salla.dev/admin/v2/products', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data; // إرجاع المنتجات الحقيقية
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