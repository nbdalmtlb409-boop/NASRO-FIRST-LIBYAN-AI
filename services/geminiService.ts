import { GoogleGenAI } from "@google/genai";

// Initialize the client
// NOTE: The API key is injected via process.env.API_KEY as per instructions.
// We handle the potential absence of the key gracefully to prevent white-screen crashes.
let ai: GoogleGenAI;

try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
} catch (error) {
  console.error("Failed to initialize GoogleGenAI. Check your API_KEY.", error);
}

/**
 * Heuristic to check if the user wants to generate an image.
 * Checks for keywords in Arabic and English.
 */
const isImageGenerationRequest = (text: string): boolean => {
  const lower = text.toLowerCase();
  const keywords = [
    'ارسم', 'رسم', 'صورة', 'تخيل', 'أنشئ صورة', 'انشئ صورة',
    'draw', 'generate image', 'create image', 'picture of', 'image of'
  ];
  return keywords.some(keyword => lower.trim().startsWith(keyword));
};

export const sendMessageToGemini = async (
  prompt: string,
  imageBase64?: string
): Promise<{ text: string; generatedImage?: string }> => {
  if (!ai) {
    return { text: "عذراً، لم يتم تهيئة مفتاح API بشكل صحيح. يرجى التحقق من الإعدادات." };
  }

  try {
    // 1. Handle Image Generation Request
    // If no attachment is present, and the text looks like an image prompt, try to generate an image.
    if (!imageBase64 && isImageGenerationRequest(prompt)) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }],
          },
        });

        // Extract image from response parts
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              return {
                text: "تم إنشاء الصورة بناءً على طلبك:",
                generatedImage: `data:image/png;base64,${part.inlineData.data}`
              };
            }
          }
        }
        // If text was returned instead of image (fallback)
        if (response.text) {
          return { text: response.text };
        }
      } catch (genError) {
        console.error("Image generation failed, falling back to chat:", genError);
        // Fallback to text chat if image generation fails
      }
    }

    // 2. Handle Text Chat (with optional Vision input)
    // Use gemini-3-pro-preview for high quality reasoning and vision capabilities
    const model = 'gemini-3-pro-preview';
    
    const parts: any[] = [];
    
    if (imageBase64) {
      // Clean the base64 string if it contains the data URL prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg', // Assuming JPEG for simplicity, or detect from string
        },
      });
    }
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts,
      },
    });

    return { text: response.text || "عذراً، لم أستطع معالجة الطلب." };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى." };
  }
};