
import { GoogleGenAI, Modality } from "@google/genai";

const ttsCache = new Map<string, string>();

export const speakText = async (text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Zephyr'): Promise<string | null> => {
  if (ttsCache.has(text)) {
    console.log("Gemini TTS: Cache hit for text");
    return ttsCache.get(text)!;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini TTS: API Key missing from environment");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    console.log("Gemini TTS: Generating speech for text:", text.substring(0, 50) + "...");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      console.log("Gemini TTS: Received audio data, length:", base64Audio.length);
      ttsCache.set(text, base64Audio);
    } else {
      console.warn("Gemini TTS: No audio data in response");
    }
    return base64Audio || null;
  } catch (error) {
    console.error("Gemini TTS: Error generating speech", error);
    return null;
  }
};

export const prefetchTTS = async (text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Zephyr') => {
  if (ttsCache.has(text)) return;
  console.log("Gemini TTS: Prefetching text:", text.substring(0, 30) + "...");
  await speakText(text, voice);
};
