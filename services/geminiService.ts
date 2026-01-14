import { GoogleGenAI } from "@google/genai";
import { ChatMessage, MessageRole } from "../types";

// Initialize the client
// NOTE: The API key is injected via process.env.API_KEY as per instructions.
// We handle the potential absence of the key gracefully.
let ai: GoogleGenAI;

try {
  // process.env.API_KEY is replaced by Vite at build time
  const apiKey = process.env.API_KEY || '';
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI.", error);
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
  imageBase64: string | undefined,
  history: ChatMessage[] = []
): Promise<{ text: string; generatedImage?: string }> => {
  // Check if API key was present during build/initialization
  if (!process.env.API_KEY) {
    return { text: "عذراً، مفتاح API غير موجود. يرجى التأكد من إضافة API_KEY في إعدادات النشر (Environment Variables) ثم إعادة البناء (Re-deploy)." };
  }

  if (!ai) {
    return { text: "عذراً، فشل تهيئة خدمة الذكاء الاصطناعي." };
  }

  // Changed from 'gemini-3-pro-preview' to 'gemini-3-flash-preview' 
  // to avoid "Quota Exceeded" errors and improve speed.
  const model = 'gemini-3-flash-preview';

  try {
    // 1. Handle Image Generation Request
    // Note: We typically don't send full chat history for image generation commands 
    // as they are usually standalone requests.
    if (!imageBase64 && isImageGenerationRequest(prompt)) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }],
          },
        });

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
        if (response.text) {
          return { text: response.text };
        }
      } catch (genError: any) {
        console.error("Image generation failed:", genError);
        // Fallback to text chat if image generation fails
      }
    }

    // 2. Handle Text Chat with History
    
    // Construct the contents array from history
    const contents: any[] = history.map(msg => {
        const parts: any[] = [];
        
        // Add image if present and provided by user (not generated)
        if (msg.image && !msg.isGeneratedImage) {
            const cleanBase64 = msg.image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
            parts.push({
                inlineData: {
                    data: cleanBase64,
                    mimeType: 'image/jpeg', // Assuming jpeg/png for simplicity
                }
            });
        }
        
        // Add text
        if (msg.text) {
            parts.push({ text: msg.text });
        }

        return {
            role: msg.role === MessageRole.USER ? 'user' : 'model',
            parts: parts
        };
    }).filter(content => content.parts.length > 0); // Ensure no empty messages

    // Add the current message
    const currentParts: any[] = [];
    
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      currentParts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg',
        },
      });
    }
    
    currentParts.push({ text: prompt });

    contents.push({
        role: 'user',
        parts: currentParts
    });

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
    });

    return { text: response.text || "عذراً، لم أستطع معالجة الطلب." };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Attempt to extract meaningful error message
    let errorMessage = "حدث خطأ أثناء الاتصال بالخادم.";
    
    if (error.message) {
        if (error.message.includes("API key")) {
            errorMessage = "مفتاح API غير صالح أو غير مفعل. يرجى التحقق منه.";
        } else if (error.message.includes("429")) {
            errorMessage = "تم تجاوز حد الطلبات (Quota Exceeded). يرجى المحاولة لاحقاً.";
        } else if (error.message.includes("404")) {
             errorMessage = `الموديل غير متاح حالياً (${model}) أو المفتاح لا يملك صلاحية الوصول إليه.`;
        } else {
            errorMessage = `حدث خطأ تقني: ${error.message}`;
        }
    }
    
    return { text: errorMessage };
  }
};