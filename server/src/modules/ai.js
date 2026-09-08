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
  }
};