import 'dotenv/config';
import OpenAI from 'openai';

let groqClient = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_...') {
  groqClient = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
  console.log('✅ تم تحميل مفتاح Groq بنجاح');
} else {
  console.warn('⚠️ لم يتم العثور على مفتاح Groq، سيتم استخدام النموذج الاحتياطي.');
}

export const aiAgent = {
  // ═══════════════════════════════════════════════════
  // 1. توليد حملة تسويقية
  // ═══════════════════════════════════════════════════
  async generateCampaign({ storeName, productName, productDescription, campaignGoal, platform }) {
    const fallbackResponse = {
      headline: `✨ فخامة تليق بك من ${storeName} | ${productName}`,
      hook: `تدور على التميز والجودة اللي تبيض الوجه؟ 🇸🇦 لا يفوتك ${productName}!`,
      caption: `وصل حديثاً في ${storeName}!\n\n${productName} هو خيارك الأنسب اليوم.\n• توصيل سريع لكافة مدن المملكة\n• دفع آمن عبر مدى، تمارا، وتابي\n\nاطلب الآن قبل نفاد الكمية!`,
      hashtags: ['#منصة_سلة', '#متاجر_سعودية', `#${productName.replace(/\s+/g, '_')}`, '#تمارا_وتابي'],
      callToAction: 'تسوق الآن عبر متجرنا في سلة 🛒',
      marketingTip: `ركز على تصوير فيديو ريلز قصير يوضح جودة وتفاصيل المنتج مع كود خصم مخصص لجمهور منصة ${platform}.`
    };

    if (!groqClient) return fallbackResponse;

    try {
      const prompt = `أنت خبير تسويق تجارة إلكترونية لمتاجر سلة في السعودية.
المتجر: ${storeName}
المنتج: ${productName}
الهدف: ${campaignGoal || "زيادة المبيعات"}
المنصة: ${platform}
المطلوب JSON يحتوي على: headline, hook, caption, hashtags, callToAction, marketingTip`;

      const completion = await groqClient.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const jsonString = completion.choices[0].message.content;
      if (jsonString) {
        console.log('✅ استجابة Groq الخام:', jsonString);
        return JSON.parse(jsonString);
      } else {
        throw new Error('لم يرد Groq بنص');
      }
    } catch (error) {
      console.error('❌ خطأ الاتصال بـ Groq:', error.message);
      return fallbackResponse;
    }
  },

  // ═══════════════════════════════════════════════════
  // 2. تحليل المتجر
  // ═══════════════════════════════════════════════════
  async analyzeStoreProducts({ storeName, products }) {
    if (!groqClient) {
      return {
        error: true,
        message: 'الذكاء الاصطناعي غير متاح حالياً'
      };
    }

    const productsToAnalyze = products.slice(0, 5);

    if (productsToAnalyze.length === 0) {
      return {
        error: true,
        message: 'لا توجد منتجات في المتجر لتحليلها'
      };
    }

    try {
      const productsList = productsToAnalyze.map((p, i) => 
        `[ID: ${p.id}] ${p.name || 'منتج بدون اسم'} | السعر: ${p.price || 'غير محدد'} | القسم: ${p.category?.name || p.category || 'غير محدد'}`
      ).join('\n');

      const prompt = `أنت خبير SEO وتسويق إلكتروني محترف لمتاجر سلة السعودية.
المتجر: ${storeName}
إجمالي عدد المنتجات في المتجر: ${products.length}

المنتجات المطلوب تحليلها (أول 5):
${productsList}

المطلوب: إرجاع JSON بهذا الشكل بالضبط:
{
  "overallScore": رقم من 0 إلى 100 يقيّم جودة السيو العامة للمتجر,
  "summary": "ملخص قصير (سطرين) عن حالة السيو في المتجر بالعربية",
  "products": [
    {
      "productId": "الـ ID الحقيقي للمنتج (الموجود بين [ID: ...] في بداية كل سطر)",
      "name": "اسم المنتج الأصلي",
      "currentIssues": ["مشكلة 1", "مشكلة 2"],
      "suggestedTitle": "عنوان SEO محسّن بالعربية (لا يتجاوز 60 حرفاً)",
      "suggestedDescription": "وصف Meta محسّن (لا يتجاوز 160 حرفاً)",
      "suggestedLongDescription": "وصف تسويقي طويل وجذاب (من 3 إلى 5 أسطر) يصف المنتج بمزايا وتفاصيل تجعله جذاباً للعميل. اكتب بالعربية الفصحى مع إبراز الفوائد والجودة.",
      "improvementScore": رقم من 0 إلى 100
    }
  ],
  "topPriorities": ["أهم أولوية 1", "أهم أولوية 2", "أهم أولوية 3"]
}

ملاحظات مهمة:
- اكتب كل النصوص بالعربية.
- كن صريحاً في تحديد المشاكل.
- اقترح عناوين وأوصافاً فعلية قابلة للاستخدام.
- ⚠️ مهم جداً: استخرج الـ ID الموجود بين [ID: ...] في بداية كل سطر منتج، وضعه في حقل "productId" بالضبط كما هو.
- ⚠️ مهم: "suggestedDescription" قصير (Meta)، بينما "suggestedLongDescription" طويل (وصف تفصيلي للمنتج).

⚠️⚠️ تحذير صارم: كل عنصر في "products" يجب أن يحتوي على الحقول السبعة التالية بالضبط:
  productId, name, currentIssues, suggestedTitle, suggestedDescription, suggestedLongDescription, improvementScore
أي عنصر يفتقر لأحد هذه الحقول يعتبر رداً غير صالح. لا تختصر، لا تختصر، لا تختصر.`;

      const completion = await groqClient.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const jsonString = completion.choices[0].message.content;
      if (jsonString) {
        console.log('✅ تحليل المتجر من Groq:', jsonString.substring(0, 300) + '...');
        return JSON.parse(jsonString);
      } else {
        throw new Error('لم يرد Groq بنص');
      }
    } catch (error) {
      console.error('❌ خطأ في تحليل المتجر:', error.message);
      return {
        error: true,
        message: `حدث خطأ في التحليل: ${error.message}`
      };
    }
  }
};