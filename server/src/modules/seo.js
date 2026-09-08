import 'dotenv/config';
import OpenAI from 'openai';

let groqClient = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_...') {
  groqClient = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
} else {
  console.warn('⚠️ لم يتم العثور على مفتاح Groq، سيتم استخدام البيانات الثابتة.');
}

export const seoOptimizer = {
  async generateProductSEO({ storeName, productName, category, keywords }) {
    const fallbackResponse = {
      slug: productName.trim().toLowerCase().replace(/\s+/g, '-'),
      metaTitle: `${productName} بأفضل سعر | متجر ${storeName}`,
      metaDescription: `اشتر الآن ${productName} من قسم ${category || 'المتجر'} في ${storeName}. جودة أصلية 100% وشحن سريع لكافة مناطق السعودية.`,
      keywords: [productName, `شراء ${productName}`, `سعر ${productName}`, `متجر ${storeName}`],
      schemaJsonLd: {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: productName,
        brand: { '@type': 'Brand', name: storeName }
      },
      seoScore: 95
    };

    if (!groqClient) return fallbackResponse;

    try {
      const prompt = `أنت خبير SEO (تحسين محركات البحث) لمتاجر سلة في السعودية.
المتجر: ${storeName}
المنتج: ${productName}
القسم: ${category || 'عام'}
الكلمات المفتاحية المقترحة: ${keywords ? keywords.join(', ') : 'لا يوجد'}

المطلوب إرجاع JSON يحتوي على الحقول التالية بالضبط:
{
  "slug": "رابط قصير باللغة الإنجليزية",
  "metaTitle": "عنوان ميتا احترافي وجذاب لا يتجاوز 60 حرفاً ويحتوي على الكلمة المفتاحية الرئيسية",
  "metaDescription": "وصف ميتا احترافي لا يتجاوز 160 حرفاً ويشجع على النقر",
  "keywords": ["كلمة مفتاحية 1", "كلمة مفتاحية 2", "كلمة مفتاحية 3"],
  "seoScore": 100
}
`;

      const completion = await groqClient.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const jsonString = completion.choices[0].message.content;
      if (jsonString) {
        let cleanText = jsonString.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        const aiData = JSON.parse(cleanText);
        return {
          ...aiData,
          schemaJsonLd: {
            '@context': 'https://schema.org/',
            '@type': 'Product',
            name: productName,
            brand: { '@type': 'Brand', name: storeName }
          }
        };
      } else {
        throw new Error('لم يرد Groq بنص');
      }

    } catch (error) {
      console.error('❌ خطأ في توليد SEO:', error.message);
      return fallbackResponse;
    }
  }
};