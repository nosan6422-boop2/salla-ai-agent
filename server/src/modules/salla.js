import 'dotenv/config';
import axios from 'axios';

const SALLA_API_URL = process.env.SALLA_API_URL || 'https://api.salla.dev/admin/v2';
const SALLA_CLIENT_ID = process.env.SALLA_CLIENT_ID;
const SALLA_CLIENT_SECRET = process.env.SALLA_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5000/api/salla/callback';

const storeTokens = new Map();

export const sallaClient = {
  getAuthUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SALLA_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      // ✅ التعديل المهم هنا: إضافة الصلاحيات المطلوبة لقراءة المنتجات وبيانات المتجر
      scope: 'read_products read_store offline_access',
    });
    return `https://accounts.salla.sa/oauth2/authorize?${params.toString()}`;
  },

  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(`${SALLA_API_URL}/oauth/token`, new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SALLA_CLIENT_ID,
        client_secret: SALLA_CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const tokenData = response.data;
      const storeId = tokenData.store_id || 'store_' + Date.now();
      storeTokens.set(storeId, tokenData.access_token);
      
      console.log('✅ تم ربط متجر سلة بنجاح!');
      return { success: true, storeId, accessToken: tokenData.access_token };
    } catch (error) {
      console.error('❌ خطأ في تبادل رمز التفويض:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  async getProducts(tenant) {
    const accessToken = tenant.sallaAccessToken;

    if (accessToken && !accessToken.startsWith('demo_')) {
      try {
        const response = await axios.get(`${SALLA_API_URL}/products`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
        return response.data.data;
      } catch (error) {
        console.error('❌ خطأ في جلب منتجات سلة:', error.response?.data?.message || error.message);
        return [];
      }
    }

    console.warn('⚠️ لم يتم ربط المتجر بعد، سيتم عرض بيانات تجريبية.');
    return [
      { id: 101, name: 'منتج تجريبي (يجب الربط لعرض منتجاتك الحقيقية)', price: 0, category: 'قسم تجريبي', quantity: 0 }
    ];
  }
};