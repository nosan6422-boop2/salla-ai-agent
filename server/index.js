import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ أضفنا getTenantBySallaStoreId للـ Embedded Auth
import { getTenantDb, listTenants, registerTenantStore, getTenantBySallaStoreId } from './src/modules/db.js';
import { sallaClient, normalizeStoreId } from './src/modules/salla.js';
import { aiAgent } from './src/modules/ai.js';
import { seoOptimizer } from './src/modules/seo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ middleware أصبح async لأن getTenantDb الآن async
const tenantMiddleware = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || 'store_demo_1';
    const tenant = await getTenantDb(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'المتجر غير مسجل'
      });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('❌ خطأ في middleware المتجر:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    message: 'خادم وكيل سلة يعمل بنجاح'
  });
});

// ✅ listTenants أصبح async
app.get('/api/tenants', async (req, res) => {
  try {
    const tenants = await listTenants();
    res.json({
      success: true,
      tenants
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المتاجر:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/webhooks/authorize', async (req, res) => {
  try {
    const result = sallaClient.handleWebhook(req.body);

    if (!result.success) {
      console.error('❌ Webhook payload rejected:', result.error);
      return res.status(400).send('Bad Request');
    }

    const { storeId, accessToken, refreshToken, expires } = result;

    const storeInfo = await sallaClient.getStoreInfo(accessToken, { retries: 1 });

    if (!storeInfo?.name) {
      console.error(`❌ تعذر التحقق من اسم المتجر (${storeId}) من Salla بعد إعادة المحاولة.`);
      return res.status(502).json({
        success: false,
        error: 'تعذر جلب معلومات المتجر من Salla'
      });
    }

    const storeName = storeInfo.name;

    console.log('🏪 Salla Store Info:', storeInfo);
    console.log(`🏪 Store ID: ${storeId}`);
    console.log(`🏪 Store Name: ${storeName}`);

    // ✅ registerTenantStore أصبح async
    await registerTenantStore({
      storeName,
      sallaStoreId: storeId,
      sallaAccessToken: accessToken,
      sallaRefreshToken: refreshToken,
      sallaTokenExpires: expires
    });

    return res.status(200).send('OK');
  } catch (error) {
    console.error('❌ خطأ في معالجة Salla authorize webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

app.post('/api/tenants/register', async (req, res) => {
  try {
    const { storeName, sallaStoreId, sallaAccessToken, ownerEmail } = req.body;

    if (!storeName || !String(storeName).trim()) {
      return res.status(400).json({
        success: false,
        error: 'storeName مطلوب — لا يمكن تسجيل متجر بدون اسم حقيقي'
      });
    }

    if (!normalizeStoreId(sallaStoreId)) {
      return res.status(400).json({
        success: false,
        error: 'sallaStoreId غير صالح'
      });
    }

    // ✅ registerTenantStore أصبح async
    const tenant = await registerTenantStore({
      storeName,
      sallaStoreId,
      sallaAccessToken,
      ownerEmail
    });

    res.status(201).json({
      success: true,
      tenant
    });
  } catch (error) {
    console.error('❌ خطأ في تسجيل المتجر:', error.message);

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/salla/products', tenantMiddleware, async (req, res) => {
  try {
    const products = await sallaClient.getProducts(req.tenant);

    res.json({
      success: true,
      products
    });
  } catch (error) {
    const status = error.message === 'SALLA_TOKEN_EXPIRED' ? 401 : 502;

    res.status(status).json({
      success: false,
      error:
        status === 401
          ? 'Salla access token منتهي ويحتاج إلى refresh'
          : 'تعذر جلب منتجات المتجر من Salla'
    });
  }
});

app.post('/api/ai/generate-campaign', tenantMiddleware, async (req, res) => {
  const { productName, productDescription, campaignGoal, platform } = req.body;

  const campaign = await aiAgent.generateCampaign({
    storeName: req.tenant.storeName,
    productName,
    productDescription,
    campaignGoal,
    platform
  });

  res.json({
    success: true,
    campaign
  });
});

app.post('/api/seo/optimize-product', tenantMiddleware, async (req, res) => {
  const { productName, category, keywords } = req.body;

  const seo = await seoOptimizer.generateProductSEO({
    storeName: req.tenant.storeName,
    productName,
    category,
    keywords
  });

  res.json({
    success: true,
    seo
  });
});

// ⭐ مسار تحليل المتجر بالذكاء الاصطناعي
app.post('/api/analyze-store', tenantMiddleware, async (req, res) => {
  try {
    console.log(`🔍 بدء تحليل المتجر: ${req.tenant.storeName}`);

    // 1. جلب المنتجات الحقيقية من Salla
    const products = await sallaClient.getProducts(req.tenant);

    console.log(`📦 عدد المنتجات: ${products.length}`);

    // 2. تحليل المنتجات بالذكاء الاصطناعي
    const analysis = await aiAgent.analyzeStoreProducts({
      storeName: req.tenant.storeName,
      products
    });

    if (analysis.error) {
      return res.status(400).json({
        success: false,
        error: analysis.message
      });
    }

    res.json({
      success: true,
      analysis,
      productsCount: products.length
    });

  } catch (error) {
    console.error('❌ خطأ في تحليل المتجر:', error.message);

    const status = error.message === 'SALLA_TOKEN_EXPIRED' ? 401 : 500;

    res.status(status).json({
      success: false,
      error:
        status === 401
          ? 'انتهت صلاحية الوصول. يرجى إعادة ربط المتجر.'
          : `فشل التحليل: ${error.message}`
    });
  }
});

// ⭐ مسار تطبيق التحسينات على منتج حقيقي في Salla
app.post('/api/apply-seo-improvement', tenantMiddleware, async (req, res) => {
  try {
    const { productId, suggestedTitle, suggestedDescription, suggestedLongDescription } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId مطلوب'
      });
    }

    if (!suggestedTitle && !suggestedDescription && !suggestedLongDescription) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد تحسينات لتطبيقها'
      });
    }

    console.log(`🔧 جاري تطبيق التحسينات على المنتج ${productId}...`);

    // ✅ Salla يستخدم حقول مسطحة + description للوصف الطويل
    const updates = {};
    
    if (suggestedTitle) {
      updates.metadata_title = suggestedTitle;
    }
    if (suggestedDescription) {
      updates.metadata_description = suggestedDescription;
    }
    if (suggestedLongDescription) {
      updates.description = suggestedLongDescription;
    }

    // إرسال التحديث إلى Salla
    const result = await sallaClient.updateProduct(req.tenant, productId, updates);

    console.log(`✅ تم تطبيق التحسينات على المنتج ${productId}`);

    res.json({
      success: true,
      message: 'تم تطبيق التحسينات بنجاح على المتجر',
      updatedProduct: result.data
    });

  } catch (error) {
    console.error('❌ خطأ في تطبيق التحسينات:', error.message);

    const status = error.message === 'SALLA_TOKEN_EXPIRED' ? 401 : 502;

    res.status(status).json({
      success: false,
      error:
        status === 401
          ? 'انتهت صلاحية الوصول. يرجى إعادة ربط المتجر.'
          : `فشل تطبيق التحسينات: ${error.message}`
    });
  }
});

// ⭐ NEW: Endpoint للتحقق من Embedded Token (Salla Embedded Pages)
app.post('/api/embedded/auth', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Embedded token is required'
      });
    }

    console.log('🔐 محاولة التحقق من Embedded Token...');

    // 1. إرسال التوكن إلى Salla للتحقق منه
    const introspectionResponse = await fetch(
      'https://api.salla.dev/exchange-authority/v1/introspect',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'S-Source': process.env.SALLA_APP_ID
        },
        body: JSON.stringify({ token })
      }
    );

    const introspectionResult = await introspectionResponse.json();

    if (
      !introspectionResponse.ok ||
      !introspectionResult.success ||
      !introspectionResult.data?.merchant_id
    ) {
      console.error('❌ فشل التحقق من التوكن:', introspectionResult);
      return res.status(401).json({
        success: false,
        error: 'Invalid embedded token'
      });
    }

    const merchantId = String(introspectionResult.data.merchant_id);

    console.log(`✅ تم التحقق من merchant_id: ${merchantId}`);

    // 2. البحث عن المتجر في قاعدة البيانات
    const tenant = await getTenantBySallaStoreId(merchantId);

    if (!tenant) {
      console.error(`❌ المتجر (${merchantId}) غير مسجل في قاعدة البيانات`);
      return res.status(404).json({
        success: false,
        error: 'Merchant is not registered'
      });
    }

    console.log(`✅ تم العثور على المتجر: ${tenant.storeName}`);

    // 3. إرجاع بيانات المتجر
    return res.json({
      success: true,
      merchantId,
      tenantId: tenant.id,
      storeName: tenant.storeName,
      sallaStoreId: tenant.sallaStoreId
    });

  } catch (error) {
    console.error('❌ خطأ في Embedded Auth:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Embedded authentication failed'
    });
  }
});

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 خادم سلة للتسويق بالذكاء الاصطناعي يعمل على: http://localhost:${PORT}`);
});