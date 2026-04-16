import * as elevenLabs from './elevenLabsTTS.ts';
import * as geminiTTS from './geminiTTS.ts';

type TTSProvider = 'elevenlabs' | 'gemini';

export const speakText = async (text: string, voiceId: string, provider: TTSProvider = 'elevenlabs'): Promise<string | null> => {
   if (provider === 'gemini') {
       // Using type assertion since voiceId might be a generic string but gemini expects specific voices
       return geminiTTS.speakText(text, voiceId as any);
   }
   return elevenLabs.speakText(text, voiceId);
};

export const prefetchTTS = async (text: string, voiceId: string, provider: TTSProvider = 'elevenlabs'): Promise<void> => {
   if (provider === 'gemini') {
       return geminiTTS.prefetchTTS(text, voiceId as any);
   }
   return elevenLabs.prefetchTTS(text, voiceId);
};
