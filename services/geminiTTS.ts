
import { GoogleGenAI, Modality } from "@google/genai";

export const speakText = async (text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Zephyr'): Promise<string | null> => {
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
      contents: [{ parts: [{ text: `Read this clearly: ${text}` }] }],
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
    } else {
      console.warn("Gemini TTS: No audio data in response");
    }
    return base64Audio || null;
  } catch (error) {
    console.error("Gemini TTS: Error generating speech", error);
    return null;
  }
};
