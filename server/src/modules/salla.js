import 'dotenv/config';
import axios from 'axios';

const SALLA_API_URL = process.env.SALLA_API_URL || 'https://api.salla.dev/admin/v2';
const SALLA_CLIENT_ID = process.env.SALLA_CLIENT_ID;
const SALLA_CLIENT_SECRET = process.env.SALLA_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5000/api/salla/callback';

// قاعدة بيانات مؤقتة في الذاكرة لحفظ توكنات المتاجر (سنستبدلها بقاعدة بيانات حقيقية لاحقاً)
const storeTokens = new Map();

export const sallaClient = {
  // 1. إنشاء رابط تسجيل الدخول عبر سلة ليقوم التاجر بالضغط عليه
  getAuthUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SALLA_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'offline_access', // نحتاج صلاحية الوصول للبيانات حتى بعد إغلاق المتصفح
    });
    return `https://accounts.salla.sa/oauth2/authorize?${params.toString()}`;
  },

  // 2. استقبال رمز التفويض من سلة واستبداله بتوكن وصول حقيقي
  async exchangeCodeForToken(code) {
    try {
      // ✅ التغيير المهم هنا: استخدمنا الرابط الصحيح لتبادل الرمز كما هو موثق في سلة
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
      // حفظ التوكن في الذاكرة (مؤقتاً حسب التاجر الذي سجل الدخول)
      const storeId = tokenData.store_id || 'store_' + Date.now(); // معرف تخيلي
      storeTokens.set(storeId, tokenData.access_token);
      
      console.log('✅ تم ربط متجر سلة بنجاح!');
      return { success: true, storeId, accessToken: tokenData.access_token };
    } catch (error) {
      // سنعرض لنا رسالة الخطأ الحقيقية
      console.error('❌ خطأ في تبادل رمز التفويض:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // 3. جلب المنتجات الحقيقية من سلة (بدلاً من البيانات الوهمية)
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
        return response.data.data; // إرجاع المنتجات الحقيقية
      } catch (error) {
        console.error('❌ خطأ في جلب منتجات سلة:', error.response?.data?.message || error.message);
        return [];
      }
    }

    // إذا لم يكن هناك توكن حقيقي (لم يقم التاجر بالربط بعد)، نرجع بيانات تجريبية
    console.warn('⚠️ لم يتم ربط المتجر بعد، سيتم عرض بيانات تجريبية.');
    return [
      {
        id: 101,
        name: 'منتج تجريبي (يجب الربط لعرض منتجاتك الحقيقية)',
        price: 0,
        category: 'قسم تجريبي',
        quantity: 0
      }
    ];
  }
};