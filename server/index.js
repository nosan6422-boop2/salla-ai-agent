import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// استيراد وحدات النظام المعيارية
import { getTenantDb, listTenants, registerTenantStore } from './src/modules/db.js';
import { sallaClient } from './src/modules/salla.js';
import { aiAgent } from './src/modules/ai.js';
import { seoOptimizer } from './src/modules/seo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 🛡️ Multi-tenant Middleware: عزل بيانات كل متجر بناءً على x-tenant-id
const tenantMiddleware = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || 'store_demo_1';
  const tenant = getTenantDb(tenantId);
  
  if (!tenant) {
    return res.status(404).json({
      success: false,
      error: `المتجر ذو المعرف ${tenantId} غير مسجل في النظام.`
    });
  }

  req.tenant = tenant;
  next();
};

// فحص جاهزية الخادم
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', message: 'خادم وكيل سلة يعمل بنجاح' });
});

// جلب قائمة المتاجر المشتركة في الـ SaaS
app.get('/api/tenants', (req, res) => {
  res.json({ success: true, tenants: listTenants() });
});

// 🆕 مسار 1: توجيه التاجر إلى صفحة تسجيل الدخول في سلة
app.get('/api/salla/auth', (req, res) => {
  const authUrl = sallaClient.getAuthUrl();
  res.redirect(authUrl);
});

// 🆕 مسار 2: استقبال رمز التفويض من سلة وتبادله بتوكن وصول
app.get('/api/salla/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('خطأ: لم يتم استلام رمز التفويض من سلة.');
  }

  const result = await sallaClient.exchangeCodeForToken(code);
  
  if (result.success) {
    // إرسال رسالة نجاح بسيطة للمتصفح
    res.send(`
      <html dir="rtl">
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">✅ تم ربط متجرك بنجاح!</h2>
          <p>يمكنك الآن العودة إلى التطبيق.</p>
          <a href="/" style="background: #059669; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">العودة للوحة التحكم</a>
        </body>
      </html>
    `);
  } else {
    res.status(500).send('خطأ في ربط المتجر: ' + result.error);
  }
});

// تسجيل متجر سلة جديد
app.post('/api/tenants/register', (req, res) => {
  const { storeName, sallaStoreId, sallaAccessToken, ownerEmail } = req.body;
  if (!storeName || !sallaStoreId) {
    return res.status(400).json({ success: false, error: 'اسم المتجر ومعرف سلة مطلوبان.' });
  }
  const tenant = registerTenantStore({ storeName, sallaStoreId, sallaAccessToken, ownerEmail });
  res.status(201).json({ success: true, tenant });
});

// جلب منتجات سلة الخاصة بالمتجر الحالي
app.get('/api/salla/products', tenantMiddleware, async (req, res) => {
  try {
    const products = await sallaClient.getProducts(req.tenant);
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// توليد حملة تسويقية بالذكاء الاصطناعي للمتجر المحدد
app.post('/api/ai/generate-campaign', tenantMiddleware, async (req, res) => {
  try {
    const { productName, productDescription, campaignGoal, platform } = req.body;
    const campaign = await aiAgent.generateCampaign({
      storeName: req.tenant.storeName,
      productName,
      productDescription,
      campaignGoal,
      platform
    });
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحسين السيو (SEO) لمنتج في متجر سلة
app.post('/api/seo/optimize-product', tenantMiddleware, async (req, res) => {
  try {
    const { productName, category, keywords } = req.body;
    const seo = await seoOptimizer.generateProductSEO({
      storeName: req.tenant.storeName,
      productName,
      category,
      keywords
    });
    res.json({ success: true, seo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🆕 خدمة ملفات الواجهة الأمامية (Client) - يجب وضعها في النهاية
app.use(express.static(path.join(__dirname, '../client/dist')));

// 🆕 إعادة توجيه جميع المسارات غير المعروفة إلى الواجهة الأمامية
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 خادم سلة للتسويق بالذكاء الاصطناعي يعمل على: http://localhost:${PORT}`);
});