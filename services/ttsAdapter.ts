
import * as elevenLabs from './elevenLabsTTS.ts';
import * as geminiTTS from './geminiTTS.ts';
import * as googleCloudTTS from './googleCloudTTS.ts';
import * as openaiTTS from './openaiTTS.ts';

export type TTSProvider = 'elevenlabs' | 'gemini' | 'google' | 'hybrid' | 'openai';

// Mapping Gemini voices to close Google Cloud equivalents for seamless fallback
const VOICE_MAP_GEMINI_TO_GOOGLE: Record<string, string> = {
    'Puck-IN': 'en-IN-Neural2-D',  // Male
    'Charon-IN': 'en-IN-Neural2-B', // Male
    'Kore-IN': 'en-IN-Neural2-A',  // Female
    'Zephyr': 'en-US-Neural2-D'    // Default fallback
};

export const speakText = async (text: string, voiceId: string, provider: TTSProvider = 'gemini'): Promise<string | null> => {
    // 1. OpenAI TTS (gpt-4o-mini-tts with Indian accent instructions)
    if (provider === 'openai') {
        return openaiTTS.speakText(text, voiceId);
    }

    // 2. Google Cloud TTS (directly selected)
    if (provider === 'google') {
        const targetVoice = VOICE_MAP_GEMINI_TO_GOOGLE[voiceId] || voiceId;
        return googleCloudTTS.speakText(text, targetVoice);
    }

    // 3. Gemini TTS with Smart Fallback (Hybrid)
    if (provider === 'gemini' || provider === 'hybrid') {
        try {
            const data = await geminiTTS.speakText(text, voiceId as any);
            if (data) return data;
            throw new Error("EMPTY_DATA");
        } catch (error: any) {
            const isRateLimited = error.message === 'RATE_LIMIT_EXCEEDED' || error.message === 'EMPTY_DATA';

            if (isRateLimited) {
                const fallbackVoice = VOICE_MAP_GEMINI_TO_GOOGLE[voiceId] || 'en-IN-Neural2-D';
                console.warn(`TTS Adapter: Gemini failed/limited. Falling back to Google Cloud (${fallbackVoice})`);
                return googleCloudTTS.speakText(text, fallbackVoice);
            }

            // Re-throw if it's a fatal error like AUTH_ERROR
            throw error;
        }
    }

    // 4. ElevenLabs TTS
    return elevenLabs.speakText(text, voiceId);
};

export const prefetchTTS = async (text: string, voiceId: string, provider: TTSProvider = 'gemini'): Promise<void> => {
    if (provider === 'openai') {
        return openaiTTS.prefetchTTS(text, voiceId);
    }

    if (provider === 'google') {
        const targetVoice = VOICE_MAP_GEMINI_TO_GOOGLE[voiceId] || voiceId;
        return googleCloudTTS.prefetchTTS(text, targetVoice);
    }

    if (provider === 'gemini' || provider === 'hybrid') {
        return geminiTTS.prefetchTTS(text, voiceId as any);
    }

    return elevenLabs.prefetchTTS(text, voiceId);
};
