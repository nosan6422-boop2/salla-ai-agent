import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

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

// 🛡️ Middleware
const tenantMiddleware = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || 'store_demo_1';
  const tenant = getTenantDb(tenantId);
  if (!tenant) return res.status(404).json({ success: false, error: 'المتجر غير مسجل' });
  req.tenant = tenant;
  next();
};

// فحص جاهزية الخادم
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', message: 'خادم وكيل سلة يعمل بنجاح' });
});

// جلب قائمة المتاجر
app.get('/api/tenants', (req, res) => {
  res.json({ success: true, tenants: listTenants() });
});

// ⭐ مسار الويب هوك الجديد (يقرأ التوكن ويحفظ المتجر في قاعدة البيانات)
app.post('/api/webhooks/authorize', (req, res) => {
  const result = sallaClient.handleWebhook(req.body);
  
  if (result.success) {
    // استخراج بيانات المتجر من جسم الطلب القادم من سلة
    const eventData = req.body.data || {};
    const storeId = eventData.store?.id || result.storeId;
    const storeName = eventData.store?.name || 'متجر بدون اسم';
    const accessToken = eventData.access_token;

    if (accessToken) {
      // حفظ المتجر في قاعدة البيانات ليبقى حتى بعد إيقاف التشغيل
      registerTenantStore({ storeName, sallaStoreId: storeId, sallaAccessToken: accessToken });
      console.log(`✅ تم إضافة المتجر (${storeName}) إلى قاعدة البيانات بنجاح!`);
    }
    
    return res.status(200).send('OK');
  }
  res.status(400).send('Bad Request');
});

// تسجيل متجر جديد (يدوياً)
app.post('/api/tenants/register', (req, res) => {
  const { storeName, sallaStoreId, sallaAccessToken, ownerEmail } = req.body;
  const tenant = registerTenantStore({ storeName, sallaStoreId, sallaAccessToken, ownerEmail });
  res.status(201).json({ success: true, tenant });
});

// جلب المنتجات
app.get('/api/salla/products', tenantMiddleware, async (req, res) => {
  const products = await sallaClient.getProducts(req.tenant);
  res.json({ success: true, products });
});

// توليد الحملة
app.post('/api/ai/generate-campaign', tenantMiddleware, async (req, res) => {
  const { productName, productDescription, campaignGoal, platform } = req.body;
  const campaign = await aiAgent.generateCampaign({ storeName: req.tenant.storeName, productName, productDescription, campaignGoal, platform });
  res.json({ success: true, campaign });
});

// توليد SEO
app.post('/api/seo/optimize-product', tenantMiddleware, async (req, res) => {
  const { productName, category, keywords } = req.body;
  const seo = await seoOptimizer.generateProductSEO({ storeName: req.tenant.storeName, productName, category, keywords });
  res.json({ success: true, seo });
});

// 🆕 خدمة ملفات الواجهة الأمامية
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 خادم سلة للتسويق بالذكاء الاصطناعي يعمل على: http://localhost:${PORT}`);
});